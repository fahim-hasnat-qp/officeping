import {
  BreakfastDto,
  CategoryDto,
  ComplimentDto,
  LunchDto,
  RequestDto,
  RequestNoteDto,
  UserDto,
  UserRef,
} from '@officeping/shared';
import {
  Breakfast,
  Category,
  Compliment,
  Lunch,
  Request,
  RequestNote,
  User,
} from '../entities';

export function toUserRef(u: User): UserRef {
  return { id: u.id, name: u.name, avatarUrl: u.avatarUrl ?? null };
}

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    isOnline: u.isOnline,
    deskLocation: u.deskLocation ?? null,
    defaultBreakfast: u.defaultBreakfast ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

export function toCategoryDto(c: Category): CategoryDto {
  return { id: c.id, name: c.name, icon: c.icon };
}

export function toNoteDto(n: RequestNote): RequestNoteDto {
  return {
    id: n.id,
    requestId: n.requestId,
    author: toUserRef(n.author),
    message: n.message,
    createdAt: n.createdAt.toISOString(),
  };
}

export function toRequestDto(
  r: Request,
  extra?: { notes?: RequestNote[]; complimentSent?: boolean },
): RequestDto {
  const dto: RequestDto = {
    id: r.id,
    requester: toUserRef(r.requester),
    staff: r.staff ? toUserRef(r.staff) : null,
    category: toCategoryDto(r.category),
    description: r.description,
    note: r.note ?? null,
    location: r.location,
    status: r.status,
    cancelReason: r.cancelReason ?? null,
    delayReason: r.delayReason ?? null,
    isSavedRequest: r.isSavedRequest,
    quickSendLabel: r.quickSendLabel ?? null,
    createdAt: r.createdAt.toISOString(),
    acceptedAt: r.acceptedAt ? r.acceptedAt.toISOString() : null,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
  };
  if (extra?.notes) dto.notes = extra.notes.map(toNoteDto);
  if (extra?.complimentSent !== undefined) dto.complimentSent = extra.complimentSent;
  return dto;
}

export function toComplimentDto(c: Compliment): ComplimentDto {
  return {
    id: c.id,
    fromUser: toUserRef(c.fromUser),
    toStaff: toUserRef(c.toStaff),
    requestId: c.requestId,
    message: c.message,
    createdAt: c.createdAt.toISOString(),
  };
}

export function toBreakfastDto(b: Breakfast): BreakfastDto {
  return {
    id: b.id,
    user: toUserRef(b.user),
    date: b.date,
    order: b.order,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}

export function toLunchDto(l: Lunch): LunchDto {
  return { id: l.id, user: toUserRef(l.user), date: l.date, attending: l.attending };
}
