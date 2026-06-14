import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { BreakfastDto, LunchDto, UserRole } from '@officeping/shared';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/auth-user';
import { CacheService } from '../../common/cache.service';
import { toBreakfastDto, toLunchDto } from '../../common/mappers';
import { AppSetting, Breakfast, Lunch, User } from '../../entities';
import {
  CreateBreakfastDto,
  CreateLunchDto,
  MealDateQueryDto,
  UpdateBreakfastStatusDto,
} from './dto';

@Injectable()
export class MealsService {
  constructor(
    @InjectRepository(Breakfast)
    private readonly breakfasts: Repository<Breakfast>,
    @InjectRepository(Lunch)
    private readonly lunches: Repository<Lunch>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(AppSetting)
    private readonly appSettings: Repository<AppSetting>,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  // ---- Breakfast ----

  async createBreakfast(user: AuthUser, input: CreateBreakfastDto): Promise<BreakfastDto> {
    await this.checkBreakfastCutoff(input.date);

    try {
      const row = await this.breakfasts.save(
        this.breakfasts.create({ userId: user.id, date: input.date, order: input.order }),
      );
      const loaded = await this.breakfasts.findOne({
        where: { id: row.id },
        relations: ['user'],
      });
      if (!loaded) throw new NotFoundException();
      return toBreakfastDto(loaded);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Breakfast already submitted for this date');
      }
      throw err;
    }
  }

  async getBreakfast(user: AuthUser, query: MealDateQueryDto): Promise<BreakfastDto[]> {
    // After breakfast cutoff, staff view of today is immutable — serve from cache
    const isStaffView = user.role === UserRole.STAFF || user.role === UserRole.ADMIN;
    const today = this.cache.today();
    const isToday = query.date === today;
    if (isStaffView && isToday && this.isAfterCutoff(await this.getBreakfastCutoff())) {
      const cacheKey = `breakfast:staff:${today}`;
      const cached = await this.cache.get<BreakfastDto[]>(cacheKey);
      if (cached) return cached;
      const result = await this.fetchBreakfast(user, query);
      await this.cache.set(cacheKey, result);
      return result;
    }
    return this.fetchBreakfast(user, query);
  }

  private async fetchBreakfast(user: AuthUser, query: MealDateQueryDto): Promise<BreakfastDto[]> {
    const qb = this.breakfasts
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.user', 'user')
      .orderBy('b.createdAt', 'ASC');

    if (user.role === UserRole.MEMBER) {
      qb.where('b.userId = :uid', { uid: user.id });
    }
    if (query.date) {
      qb.andWhere('b.date = :date', { date: query.date });
    }

    const rows = await qb.getMany();
    return rows.map(toBreakfastDto);
  }

  async updateBreakfastStatus(
    id: string,
    user: AuthUser,
    input: UpdateBreakfastStatusDto,
  ): Promise<BreakfastDto> {
    const isStaff = user.role === UserRole.STAFF || user.role === UserRole.ADMIN;

    const row = await this.breakfasts.findOne({ where: { id }, relations: ['user'] });
    if (!row) throw new NotFoundException('Breakfast record not found');

    if (isStaff) {
      if (input.status != null) row.status = input.status;
      if (input.order != null) row.order = input.order;
    } else {
      // Members may only update their own order text
      if (row.userId !== user.id) throw new ForbiddenException();
      if (input.status != null) throw new ForbiddenException('Members cannot change status');
      if (input.order != null) {
        await this.checkBreakfastCutoff(row.date);
        row.order = input.order;
      }
    }

    await this.breakfasts.save(row);

    // Invalidate staff cache so next GET reflects the updated status
    const today = this.cache.today();
    if (row.date === today) await this.cache.del(`breakfast:staff:${today}`);

    const loaded = await this.breakfasts.findOne({ where: { id }, relations: ['user'] });
    if (!loaded) throw new NotFoundException();
    return toBreakfastDto(loaded);
  }

  // ---- Lunch ----

  async upsertLunch(user: AuthUser, input: CreateLunchDto): Promise<LunchDto> {
    const existing = await this.lunches.findOne({
      where: { userId: user.id, date: input.date },
      relations: ['user'],
    });

    if (existing) {
      existing.attending = input.attending;
      const saved = await this.lunches.save(existing);
      const loaded = await this.lunches.findOne({ where: { id: saved.id }, relations: ['user'] });
      if (!loaded) throw new NotFoundException();
      return toLunchDto(loaded);
    }

    const row = await this.lunches.save(
      this.lunches.create({ userId: user.id, date: input.date, attending: input.attending }),
    );
    const loaded = await this.lunches.findOne({ where: { id: row.id }, relations: ['user'] });
    if (!loaded) throw new NotFoundException();
    return toLunchDto(loaded);
  }

  async getLunch(user: AuthUser, query: MealDateQueryDto): Promise<LunchDto[]> {
    const today = this.cache.today();
    const isToday = query.date === today;
    const isStaff = user.role === UserRole.STAFF || user.role === UserRole.ADMIN;

    // After lunch cutoff, headcount is locked — cache the staff view
    if (isStaff && isToday && this.isAfterCutoff(await this.getLunchCutoff())) {
      const cacheKey = `lunch:staff:${today}`;
      const cached = await this.cache.get<LunchDto[]>(cacheKey);
      if (cached) return cached;
      const result = await this.fetchLunch(user, query);
      await this.cache.set(cacheKey, result);
      return result;
    }
    return this.fetchLunch(user, query);
  }

  private async fetchLunch(user: AuthUser, query: MealDateQueryDto): Promise<LunchDto[]> {
    const isStaff = user.role === UserRole.STAFF || user.role === UserRole.ADMIN;

    if (isStaff) {
      // Staff see all members, defaulting to attending:true for those with no record
      const allMembers = await this.users.find({ where: { role: UserRole.MEMBER } });

      const existingRows = query.date
        ? await this.lunches.find({ where: { date: query.date }, relations: ['user'] })
        : await this.lunches.find({ relations: ['user'] });

      const recordByUserId = new Map(existingRows.map((r) => [r.userId, r]));

      const results: LunchDto[] = allMembers.map((m) => {
        const record = recordByUserId.get(m.id);
        if (record) return toLunchDto(record);
        return { id: '', user: { id: m.id, name: m.name, avatarUrl: m.avatarUrl ?? null }, date: query.date ?? '', attending: true };
      });

      return results.sort((a, b) => a.user.name.localeCompare(b.user.name));
    }

    // Members see only their own record (attending=true if no record yet)
    const existing = query.date
      ? await this.lunches.findOne({ where: { userId: user.id, date: query.date }, relations: ['user'] })
      : null;

    if (existing) return [toLunchDto(existing)];

    const me = await this.users.findOne({ where: { id: user.id } });
    if (!me) return [];
    return [{ id: '', user: { id: me.id, name: me.name, avatarUrl: me.avatarUrl ?? null }, date: query.date ?? '', attending: true }];
  }

  // ---- helpers ----

  private async getBreakfastCutoff(): Promise<string> {
    const setting = await this.appSettings.findOne({ where: { key: 'breakfast_cutoff' } });
    return setting?.value ?? '08:30';
  }

  private async getLunchCutoff(): Promise<string> {
    const setting = await this.appSettings.findOne({ where: { key: 'lunch_cutoff' } });
    return setting?.value ?? '11:00';
  }

  private isAfterCutoff(hhmm: string): boolean {
    const now = new Date();
    const [h = 0, m = 0] = hhmm.split(':').map(Number);
    const cutoffMs = h * 3600000 + m * 60000;
    const nowMs = now.getUTCHours() * 3600000 + now.getUTCMinutes() * 60000;
    return nowMs >= cutoffMs;
  }

  private async checkBreakfastCutoff(date: string): Promise<void> {
    if (this.config.get('DEMO_MODE') === 'true') return;

    const cutoff = await this.getBreakfastCutoff();
    const today = new Date().toISOString().slice(0, 10);
    if (date === today && this.isAfterCutoff(cutoff)) {
      throw new BadRequestException(`Breakfast orders close at ${cutoff}`);
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    );
  }
}
