import { ComplimentDto, RequestDto, RequestStatus, UserRef } from './types';

/**
 * Socket.io contract: a SINGLE default namespace with rooms (no dynamic
 * namespaces). The server joins each authenticated socket to its rooms based
 * on the JWT passed in the handshake: `io(url, { auth: { token } })`.
 *
 * Rooms:
 * - staff           — all STAFF sockets (new-request feed, compliment feed)
 * - admins          — ADMIN sockets (staff status updates)
 * - user:<id>       — every socket of a given user
 * - request:<id>    — parties watching one request (joined via SUBSCRIBE_REQUEST)
 */
export const Rooms = {
  staff: 'staff',
  admins: 'admins',
  user: (id: string) => `user:${id}`,
  request: (id: string) => `request:${id}`,
} as const;

export const SocketEvents = {
  /** server → staff room: full RequestDto */
  RequestNew: 'request:new',
  /** server → request:<id> + user:<requesterId>: RequestUpdateEvent */
  RequestUpdate: 'request:update',
  /** server → staff room: ComplimentDto */
  ComplimentNew: 'compliment:new',
  /** server → admins room: StaffStatusEvent */
  StaffStatus: 'staff:status',
  /** client → server: { requestId } — join/leave that request's room */
  SubscribeRequest: 'request:subscribe',
  UnsubscribeRequest: 'request:unsubscribe',
} as const;

export interface RequestUpdateEvent {
  requestId: string;
  status: RequestStatus;
  staff: UserRef | null;
  delayReason?: string;
  cancelReason?: string;
  notes?: import('./types').RequestNoteDto[];
}

export interface StaffStatusEvent {
  staffId: string;
  isOnline: boolean;
}

export type RequestNewEvent = RequestDto;
export type ComplimentNewEvent = ComplimentDto;

export interface SubscribeRequestInput {
  requestId: string;
}
