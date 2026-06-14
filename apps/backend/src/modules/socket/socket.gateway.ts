import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtPayload, Rooms, SocketEvents, UserRole } from '@officeping/shared';
import type { SubscribeRequestInput } from '@officeping/shared';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { Request } from '../../entities';

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV !== 'production'
      ? true  // allow all origins in dev/ngrok
      : (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
          const allowed = [process.env.WEB_ORIGIN, 'http://localhost:5173'].filter(Boolean);
          if (!origin || allowed.includes(origin)) {
            cb(null, true);
          } else {
            cb(new Error('Not allowed by CORS'));
          }
        },
    credentials: true,
  },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(Request) private readonly requests: Repository<Request>,
  ) {}

  afterInit(_server: Server): void {
    this.logger.log('WebSocket gateway initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)?.token ??
        (client.handshake.headers?.authorization as string | undefined)
          ?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify<JwtPayload>(token);
      const user = { id: payload.sub, email: payload.email, role: payload.role };
      client.data.user = user;

      await client.join(Rooms.user(user.id));
      if (user.role === UserRole.STAFF || user.role === UserRole.ADMIN) {
        await client.join(Rooms.staff);
      }
      if (user.role === UserRole.ADMIN) {
        await client.join(Rooms.admins);
      }

      this.logger.debug(`Client connected: ${user.id} (${user.role})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket): void {
    // nothing needed
  }

  @SubscribeMessage(SocketEvents.SubscribeRequest)
  async handleSubscribeRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeRequestInput,
  ): Promise<void> {
    const user = client.data.user as { id: string; role: string } | undefined;
    if (!user) return;

    const { requestId } = data;
    const request = await this.requests.findOne({ where: { id: requestId } });
    if (!request) return;

    const isAuthorized =
      user.role === UserRole.ADMIN ||
      request.requesterId === user.id ||
      request.staffId === user.id;

    if (isAuthorized) {
      await client.join(Rooms.request(requestId));
    }
  }

  @SubscribeMessage(SocketEvents.UnsubscribeRequest)
  async handleUnsubscribeRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeRequestInput,
  ): Promise<void> {
    await client.leave(Rooms.request(data.requestId));
  }

  emit(room: string, event: string, data: unknown): void {
    this.server.to(room).emit(event, data);
  }
}
