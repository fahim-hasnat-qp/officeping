import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdminStats,
  CategoryDto,
  CategoryStat,
  RequestStatus,
  StaffPerformance,
  UserDto,
  UserRole,
} from '@officeping/shared';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { CacheService } from '../../common/cache.service';
import { toCategoryDto, toUserDto } from '../../common/mappers';
import { AppSetting, Category, Compliment, Request, User } from '../../entities';
import { AddPersonDto, CreateCategoryDto, UpdateCategoryDto, UpdateUserRoleDto } from './dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Request)
    private readonly requests: Repository<Request>,
    @InjectRepository(Compliment)
    private readonly compliments: Repository<Compliment>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(AppSetting)
    private readonly settings: Repository<AppSetting>,
    private readonly cache: CacheService,
  ) {}

  async getStats(): Promise<AdminStats> {
    const cached = await this.cache.get<AdminStats>('stats');
    if (cached) return cached;

    const todayStart = this.todayStartUtc();

    const totalRequests = await this.requests.count({
      where: { createdAt: MoreThanOrEqual(todayStart) },
    });

    const activeNow = await this.requests.count({
      where: [
        { status: RequestStatus.PENDING },
        { status: RequestStatus.ACCEPTED },
        { status: RequestStatus.IN_PROGRESS },
      ],
    });

    // Avg response time: mean of (acceptedAt - createdAt) in minutes for today's requests
    const avgRow = await this.requests
      .createQueryBuilder('r')
      .select(
        `AVG(EXTRACT(EPOCH FROM (r."acceptedAt" - r."createdAt")) / 60)`,
        'avg',
      )
      .where(`r."createdAt" >= :start`, { start: todayStart })
      .andWhere(`r."acceptedAt" IS NOT NULL`)
      .getRawOne<{ avg: string | null }>();

    const avgResponseTimeMinutes = avgRow?.avg == null ? null : Number.parseFloat(avgRow.avg);

    const totalCompliments = await this.compliments.count({
      where: { createdAt: MoreThanOrEqual(todayStart) },
    });

    const result = { totalRequests, activeNow, avgResponseTimeMinutes, totalCompliments };
    await this.cache.set('stats', result, 30); // 30s — activeNow changes frequently
    return result;
  }

  async getStatsByCategory(): Promise<CategoryStat[]> {
    const cached = await this.cache.get<CategoryStat[]>('stats:category');
    if (cached) return cached;

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const rows = await this.requests
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.category', 'category')
      .select('r.categoryId', 'categoryId')
      .addSelect('category.name', 'name')
      .addSelect('category.icon', 'icon')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.createdAt >= :start', { start: monthStart })
      .groupBy('r.categoryId')
      .addGroupBy('category.name')
      .addGroupBy('category.icon')
      .getRawMany<{ categoryId: string; name: string; icon: string; count: string }>();

    const result = rows.map((r) => ({
      categoryId: r.categoryId,
      name: r.name,
      icon: r.icon,
      count: Number.parseInt(r.count, 10),
    }));
    await this.cache.set('stats:category', result, 5 * 60); // 5 min
    return result;
  }

  async getStaffPerformance(): Promise<StaffPerformance[]> {
    const cached = await this.cache.get<StaffPerformance[]>('stats:staff');
    if (cached) return cached;

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const staffUsers = await this.users.find({
      where: { role: UserRole.STAFF },
    });

    const result = await Promise.all(
      staffUsers.map(async (s) => {
        const completed = await this.requests.count({
          where: {
            staffId: s.id,
            status: RequestStatus.DONE,
            completedAt: MoreThanOrEqual(monthStart),
          },
        });

        const avgRow = await this.requests
          .createQueryBuilder('r')
          .select(
            `AVG(EXTRACT(EPOCH FROM (r."acceptedAt" - r."createdAt")) / 60)`,
            'avg',
          )
          .where('r."staffId" = :sid', { sid: s.id })
          .andWhere('r."createdAt" >= :start', { start: monthStart })
          .andWhere('r."acceptedAt" IS NOT NULL')
          .getRawOne<{ avg: string | null }>();

        return {
          staffId: s.id,
          name: s.name,
          avatarUrl: s.avatarUrl,
          completed,
          avgResponseTimeMinutes: avgRow?.avg == null ? null : Number.parseFloat(avgRow.avg),
          isOnline: s.isOnline,
        };
      }),
    );
    await this.cache.set('stats:staff', result, 5 * 60); // 5 min
    return result;
  }

  async getUsers(): Promise<UserDto[]> {
    const all = await this.users.find({ order: { createdAt: 'ASC' } });
    return all.map(toUserDto);
  }

  async addPerson(input: AddPersonDto): Promise<UserDto> {
    const existing = await this.users.findOneBy({ email: input.email.toLowerCase() });
    if (existing) throw new ConflictException('User with this email already exists');

    const user = await this.users.save(
      this.users.create({
        email: input.email.toLowerCase(),
        name: input.name,
        role: input.role,
      }),
    );
    return toUserDto(user);
  }

  async updateUserRole(id: string, input: UpdateUserRoleDto): Promise<UserDto> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    user.role = input.role;
    await this.users.save(user);
    return toUserDto(user);
  }

  async getCategories(): Promise<CategoryDto[]> {
    const cached = await this.cache.get<CategoryDto[]>('categories');
    if (cached) return cached;
    const all = await this.categories.find({ order: { createdAt: 'ASC' } });
    const result = all.map(toCategoryDto);
    await this.cache.set('categories', result); // end-of-day TTL; invalidated on any write
    return result;
  }

  async createCategory(input: CreateCategoryDto): Promise<CategoryDto> {
    try {
      const cat = await this.categories.save(
        this.categories.create({ name: input.name, icon: input.icon }),
      );
      await this.cache.del('categories');
      return toCategoryDto(cat);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Category with this name already exists');
      }
      throw err;
    }
  }

  async updateCategory(id: string, input: UpdateCategoryDto): Promise<CategoryDto> {
    const cat = await this.categories.findOneBy({ id });
    if (!cat) throw new NotFoundException('Category not found');
    if (input.name !== undefined) cat.name = input.name;
    if (input.icon !== undefined) cat.icon = input.icon;
    await this.categories.save(cat);
    await this.cache.del('categories');
    return toCategoryDto(cat);
  }

  // ---- settings ----

  async getSettings(): Promise<Record<string, string>> {
    const cached = await this.cache.get<Record<string, string>>('settings');
    if (cached) return cached;
    const rows = await this.settings.find();
    const result = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    await this.cache.set('settings', result); // end-of-day; invalidated on write
    return result;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await this.settings.upsert({ key, value }, ['key']);
    await this.cache.del('settings');
  }

  // ---- helpers ----

  private todayStartUtc(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
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
