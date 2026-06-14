import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  RequestDto,
  RequestStatus,
  STATUS_TRANSITIONS,
  UserRole,
} from '@officeping/shared';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/auth-user';
import { toNoteDto, toRequestDto } from '../../common/mappers';
import {
  Compliment,
  Request,
  RequestNote,
  User,
} from '../../entities';
import { PushService } from '../push/push.service';
import { RealtimeService } from '../realtime/realtime.service';
import {
  CreateNoteDto,
  CreateRequestDto,
  ReasonDto,
  RequestsQueryDto,
  UpdateRequestStatusDto,
} from './dto';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request)
    private readonly requests: Repository<Request>,
    @InjectRepository(RequestNote)
    private readonly notes: Repository<RequestNote>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Compliment)
    private readonly compliments: Repository<Compliment>,
    private readonly realtime: RealtimeService,
    private readonly push: PushService,
  ) {}

  async create(user: AuthUser, input: CreateRequestDto, apiBase?: string): Promise<RequestDto> {
    const request = await this.requests.save(
      this.requests.create({
        requesterId: user.id,
        staffId: null,
        categoryId: input.categoryId,
        description: input.description,
        note: input.note ?? null,
        location: input.location,
        isSavedRequest: input.isSavedRequest ?? false,
        status: RequestStatus.PENDING,
      }),
    );

    const loaded = await this.loadOne(request.id);
    const dto = toRequestDto(loaded, { notes: [], complimentSent: false });

    this.realtime.emitRequestNew(dto);
    const allStaffIds = (
      await this.users.find({
        where: { isOnline: true, role: UserRole.STAFF },
        select: ['id'],
      })
    ).map((s) => s.id);
    await this.push.notifyNewRequest(dto, allStaffIds, apiBase);

    return dto;
  }

  async findAll(user: AuthUser, query: RequestsQueryDto): Promise<RequestDto[]> {
    const qb = this.requests
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.requester', 'requester')
      .leftJoinAndSelect('r.staff', 'staff')
      .leftJoinAndSelect('r.category', 'category')
      .leftJoinAndSelect('r.notes', 'notes')
      .leftJoinAndSelect('notes.author', 'noteAuthor')
      .orderBy('r.createdAt', 'DESC')
      .addOrderBy('notes.createdAt', 'ASC')
      .take(query.limit ?? 20)
      .skip(query.offset ?? 0);

    if (user.role === UserRole.MEMBER || user.role === UserRole.ADMIN) {
      qb.where('r.requesterId = :uid', { uid: user.id });
    }
    const statuses = query.statusList;
    if (statuses?.length === 1) {
      qb.andWhere('r.status = :status', { status: statuses[0] });
    } else if (statuses && statuses.length > 1) {
      qb.andWhere('r.status IN (:...statuses)', { statuses });
    }
    if (query.categoryId) {
      qb.andWhere('r.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    const rows = await qb.getMany();

    // Bulk-fetch which request IDs already have a compliment so we don't do N+1 queries
    const requestIds = rows.map((r) => r.id);
    const sentSet = new Set<string>();
    if (requestIds.length > 0) {
      const sent = await this.compliments.find({
        where: requestIds.map((id) => ({ requestId: id })),
        select: ['requestId'],
      });
      sent.forEach((c) => sentSet.add(c.requestId));
    }

    return rows.map((r) => toRequestDto(r, { notes: r.notes ?? [], complimentSent: sentSet.has(r.id) }));
  }

  async findOne(id: string, user: AuthUser): Promise<RequestDto> {
    const request = await this.loadOne(id);
    if (!request) throw new NotFoundException('Request not found');

    const isAuthorized =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.STAFF ||
      request.requesterId === user.id;
    if (!isAuthorized) throw new ForbiddenException();

    const notesList = await this.notes.find({
      where: { requestId: id },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    const compliment = await this.compliments.findOne({ where: { requestId: id } });
    const complimentSent = !!compliment;

    return toRequestDto(request, { notes: notesList, complimentSent });
  }

  async updateStatus(
    id: string,
    user: AuthUser,
    input: UpdateRequestStatusDto,
    apiBase?: string,
  ): Promise<RequestDto> {
    // Use pessimistic lock for PENDING → ACCEPTED to prevent double-accept
    const isPendingToAccepted =
      input.status === RequestStatus.ACCEPTED;

    let request: Request;

    if (isPendingToAccepted) {
      request = await this.requests.manager.transaction(async (manager) => {
        const repo = manager.getRepository(Request);
        const locked = await repo.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked) throw new NotFoundException('Request not found');

        this.assertTransition(locked.status, input.status);
        this.assertStatusAuthority(locked, user, input.status);

        locked.status = input.status;
        if (input.status === RequestStatus.ACCEPTED) {
          locked.staffId = user.id;
          locked.acceptedAt = new Date();
        }
        return repo.save(locked);
      });
    } else {
      const found = await this.requests.findOne({ where: { id } });
      if (!found) throw new NotFoundException('Request not found');
      request = found;

      this.assertTransition(request.status, input.status);
      this.assertStatusAuthority(request, user, input.status);

      request.status = input.status;
      if (input.status === RequestStatus.DONE) {
        request.completedAt = new Date();
      }
      request = await this.requests.save(request);
    }

    const loaded = await this.loadOne(request.id);
    const dto = toRequestDto(loaded);
    const event = {
      requestId: id,
      status: dto.status,
      staff: dto.staff,
    };

    this.realtime.emitRequestUpdate(loaded.requesterId, id, event, loaded.staffId);
    await this.push.notifyRequestUpdate(loaded.requesterId, dto, apiBase);

    return dto;
  }

  async addDelay(id: string, user: AuthUser, input: ReasonDto): Promise<RequestDto> {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    request.delayReason = input.reason;
    await this.requests.save(request);

    const loaded = await this.loadOne(id);
    const dto = toRequestDto(loaded);
    const event = {
      requestId: id,
      status: dto.status,
      staff: dto.staff,
      delayReason: input.reason,
    };

    this.realtime.emitRequestUpdate(loaded.requesterId, id, event, loaded.staffId);
    await this.push.notifyRequestUpdate(loaded.requesterId, dto);

    return dto;
  }

  async addCancel(id: string, user: AuthUser, input: ReasonDto): Promise<RequestDto> {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    const isAuthorized =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.STAFF ||
      request.requesterId === user.id;
    if (!isAuthorized) throw new ForbiddenException();

    this.assertTransition(request.status, RequestStatus.CANCELLED);

    request.cancelReason = input.reason;
    request.status = RequestStatus.CANCELLED;
    await this.requests.save(request);

    const loaded = await this.loadOne(id);
    const dto = toRequestDto(loaded);
    const event = {
      requestId: id,
      status: dto.status,
      staff: dto.staff,
      cancelReason: input.reason,
    };

    this.realtime.emitRequestUpdate(loaded.requesterId, id, event, loaded.staffId);
    await this.push.notifyRequestUpdate(loaded.requesterId, dto);

    return dto;
  }

  async addNote(
    id: string,
    user: AuthUser,
    input: CreateNoteDto,
    apiBase?: string,
  ): Promise<{ note: ReturnType<typeof toNoteDto>; requestDto: RequestDto }> {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    const isAuthorized =
      request.requesterId === user.id ||
      request.staffId === user.id ||
      user.role === UserRole.ADMIN;
    if (!isAuthorized) throw new ForbiddenException();

    const activeStatuses: RequestStatus[] = [
      RequestStatus.PENDING,
      RequestStatus.ACCEPTED,
      RequestStatus.IN_PROGRESS,
    ];
    if (!activeStatuses.includes(request.status)) {
      throw new BadRequestException('Cannot add notes to completed or cancelled requests');
    }

    const note = await this.notes.save(
      this.notes.create({ requestId: id, authorId: user.id, message: input.message }),
    );

    const loaded = await this.notes.findOne({
      where: { id: note.id },
      relations: ['author'],
    });
    if (!loaded) throw new NotFoundException('Note not found after save');

    const noteDto = toNoteDto(loaded);

    // Push to the other party (never the author)
    let recipientId: string | null = null;
    if (user.id === request.requesterId && request.staffId) {
      recipientId = request.staffId;
    } else if (user.id === request.staffId) {
      recipientId = request.requesterId;
    }
    if (recipientId) {
      await this.push.notifyNote(noteDto, recipientId, apiBase);
    }

    const requestDto = await this.findOne(id, user);

    // Emit to anyone watching this request so notes appear in real time
    this.realtime.emitRequestUpdate(request.requesterId, id, {
      requestId: id,
      status: request.status,
      staff: requestDto.staff ?? null,
      notes: requestDto.notes ?? [],
    }, request.staffId);

    return { note: noteDto, requestDto };
  }

  async toggleSave(id: string, user: AuthUser): Promise<RequestDto> {
    const request = await this.loadOne(id);
    if (!request) throw new NotFoundException('Request not found');
    if (request.requesterId !== user.id) throw new ForbiddenException();
    request.isSavedRequest = !request.isSavedRequest;
    if (!request.isSavedRequest) request.quickSendLabel = null;
    await this.requests.save(request);
    return toRequestDto(request);
  }

  async updateQuickSendLabel(id: string, user: AuthUser, label: string): Promise<RequestDto> {
    const request = await this.loadOne(id);
    if (!request) throw new NotFoundException('Request not found');
    if (request.requesterId !== user.id) throw new ForbiddenException();
    request.quickSendLabel = label.trim() || null;
    await this.requests.save(request);
    return toRequestDto(request);
  }

  async getQuickSend(user: AuthUser): Promise<RequestDto[]> {
    const rows = await this.requests
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.requester', 'requester')
      .leftJoinAndSelect('r.staff', 'staff')
      .leftJoinAndSelect('r.category', 'category')
      .where('r.requesterId = :uid', { uid: user.id })
      .andWhere('r.isSavedRequest = true')
      .orderBy('r.createdAt', 'DESC')
      .getMany();
    return rows.map((r) => toRequestDto(r));
  }

  // ---------- helpers ----------

  private async loadOne(id: string): Promise<Request> {
    const r = await this.requests.findOne({
      where: { id },
      relations: ['requester', 'staff', 'category'],
    });
    if (!r) throw new NotFoundException('Request not found');
    return r;
  }

  private assertTransition(from: RequestStatus, to: RequestStatus): void {
    const allowed = STATUS_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Cannot transition from ${from} to ${to}`);
    }
  }

  private assertStatusAuthority(
    request: Request,
    user: AuthUser,
    targetStatus: RequestStatus,
  ): void {
    // Requester can only cancel their own
    if (targetStatus === RequestStatus.CANCELLED) {
      if (
        user.role !== UserRole.ADMIN &&
        user.role !== UserRole.STAFF &&
        request.requesterId !== user.id
      ) {
        throw new ForbiddenException();
      }
      return;
    }
    // Only STAFF can accept/progress/done — ADMIN manages but doesn't handle requests
    if (user.role !== UserRole.STAFF) {
      throw new ForbiddenException();
    }
  }
}
