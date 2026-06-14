import { UserRef } from './user';

export enum RequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

/** Allowed status transitions, enforced by the backend. */
export const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.PENDING]: [RequestStatus.ACCEPTED, RequestStatus.CANCELLED],
  [RequestStatus.ACCEPTED]: [RequestStatus.IN_PROGRESS, RequestStatus.DONE, RequestStatus.CANCELLED],
  [RequestStatus.IN_PROGRESS]: [RequestStatus.DONE, RequestStatus.CANCELLED],
  [RequestStatus.DONE]: [],
  [RequestStatus.CANCELLED]: [],
};

export interface CategoryDto {
  id: string;
  name: string;
  icon: string;
}

export interface RequestNoteDto {
  id: string;
  requestId: string;
  author: UserRef;
  message: string;
  createdAt: string;
}

export interface RequestDto {
  id: string;
  requester: UserRef;
  staff: UserRef | null;
  category: CategoryDto;
  description: string;
  note: string | null;
  location: string;
  status: RequestStatus;
  cancelReason: string | null;
  delayReason: string | null;
  isSavedRequest: boolean;
  quickSendLabel: string | null;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  /** Present on the detail endpoint (GET /requests/:id). */
  notes?: RequestNoteDto[];
  /** Whether the requester already sent a compliment for this request. */
  complimentSent?: boolean;
}

export interface CreateRequestInput {
  categoryId: string;
  description: string;
  note?: string;
  location?: string;
  isSavedRequest?: boolean;
  quickSendLabel?: string;
}

export interface UpdateRequestStatusInput {
  status: RequestStatus;
}

export interface ReasonInput {
  reason: string;
}

export interface UpdateQuickSendLabelInput {
  label: string;
}

export interface CreateNoteInput {
  message: string;
}
