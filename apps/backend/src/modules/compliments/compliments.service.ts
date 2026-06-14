import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ComplimentDto, RequestStatus, UserRole } from '@officeping/shared';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/auth-user';
import { CacheService } from '../../common/cache.service';
import { toComplimentDto } from '../../common/mappers';
import { Compliment, Request } from '../../entities';
import { PushService } from '../push/push.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateComplimentDto } from './dto';

@Injectable()
export class ComplimentsService {
  constructor(
    @InjectRepository(Compliment)
    private readonly compliments: Repository<Compliment>,
    @InjectRepository(Request)
    private readonly requests: Repository<Request>,
    private readonly realtime: RealtimeService,
    private readonly push: PushService,
    private readonly cache: CacheService,
  ) {}

  async create(user: AuthUser, input: CreateComplimentDto): Promise<ComplimentDto> {
    const request = await this.requests.findOne({ where: { id: input.requestId } });
    if (!request) throw new NotFoundException('Request not found');

    if (request.requesterId !== user.id) {
      throw new ForbiddenException('Only the requester can send a compliment');
    }
    if (request.status !== RequestStatus.DONE) {
      throw new ForbiddenException('Request must be completed (DONE) to send a compliment');
    }

    try {
      const compliment = await this.compliments.save(
        this.compliments.create({
          fromUserId: user.id,
          toStaffId: input.toStaffId,
          requestId: input.requestId,
          message: input.message,
        }),
      );

      const loaded = await this.compliments.findOne({
        where: { id: compliment.id },
        relations: ['fromUser', 'toStaff'],
      });
      if (!loaded) throw new NotFoundException();

      const dto = toComplimentDto(loaded);
      this.realtime.emitComplimentNew(dto);
      await this.push.notifyCompliment(dto);

      // Append-through: push to today's cached feed so readers get it instantly
      const feedKey = `compliments:feed:${this.cache.today()}`;
      await this.cache.listPush(feedKey, [dto]);

      return dto;
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('A compliment has already been sent for this request');
      }
      throw err;
    }
  }

  async findAll(user: AuthUser): Promise<ComplimentDto[]> {
    const qb = this.compliments
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.fromUser', 'fromUser')
      .leftJoinAndSelect('c.toStaff', 'toStaff')
      .orderBy('c.createdAt', 'DESC');

    if (user.role === UserRole.MEMBER) {
      qb.where('c.fromUserId = :uid', { uid: user.id });
    } else if (user.role === UserRole.STAFF) {
      qb.where('c.fromUserId = :uid OR c.toStaffId = :uid', { uid: user.id });
    }
    // ADMIN sees all

    const rows = await qb.getMany();
    return rows.map(toComplimentDto);
  }

  async getFeed(): Promise<ComplimentDto[]> {
    const feedKey = `compliments:feed:${this.cache.today()}`;
    const cached = await this.cache.listGet<ComplimentDto>(feedKey);
    if (cached) return [...cached].reverse(); // stored oldest-first, return newest-first

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await this.compliments
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.fromUser', 'fromUser')
      .leftJoinAndSelect('c.toStaff', 'toStaff')
      .where('c.createdAt >= :since', { since })
      .orderBy('c.createdAt', 'ASC') // store oldest-first so appends stay ordered
      .getMany();
    const result = rows.map(toComplimentDto);
    if (result.length > 0) await this.cache.listPush(feedKey, result);
    return [...result].reverse();
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
