import { Injectable } from '@nestjs/common';
import {
  ComplimentDto,
  RequestDto,
  RequestUpdateEvent,
  Rooms,
  SocketEvents,
} from '@officeping/shared';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: SocketGateway) {}

  emitRequestNew(req: RequestDto): void {
    this.gateway.emit(Rooms.staff, SocketEvents.RequestNew, req);
  }

  emitRequestUpdate(
    requesterId: string,
    requestId: string,
    event: RequestUpdateEvent,
    staffId?: string | null,
  ): void {
    this.gateway.emit(Rooms.request(requestId), SocketEvents.RequestUpdate, event);
    this.gateway.emit(Rooms.user(requesterId), SocketEvents.RequestUpdate, event);
    if (staffId) {
      this.gateway.emit(Rooms.user(staffId), SocketEvents.RequestUpdate, event);
    }
  }

  emitComplimentNew(c: ComplimentDto): void {
    this.gateway.emit(Rooms.staff, SocketEvents.ComplimentNew, c);
  }

  emitStaffStatus(staffId: string, isOnline: boolean): void {
    this.gateway.emit(Rooms.admins, SocketEvents.StaffStatus, { staffId, isOnline });
  }
}
