import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ComplimentDto,
  PushPayload,
  RequestDto,
  RequestNoteDto,
  RequestStatus,
} from '@officeping/shared';
import * as webpush from 'web-push';
import { Repository } from 'typeorm';
import { PushSubscription } from '../../entities';

const STATUS_LABEL: Partial<Record<RequestStatus, string>> = {
  [RequestStatus.ACCEPTED]:    'accepted',
  [RequestStatus.IN_PROGRESS]: 'in progress',
  [RequestStatus.DONE]:        'done ✓',
  [RequestStatus.CANCELLED]:   'cancelled',
};

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;
  private apiBase = '';

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subs: Repository<PushSubscription>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:admin@officeping.local';
    this.apiBase = this.config.get<string>('API_BASE_URL') ?? 'http://localhost:3000';

    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID keys not configured — Web Push notifications disabled');
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.enabled = true;
    this.logger.log('Web Push initialized');
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.enabled) return;

    const subscriptions = await this.subs.find({ where: { userId } });
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        const e = err as { statusCode?: number; body?: string; headers?: unknown };
        const status = e?.statusCode;
        this.logger.error(`Push send failed — status: ${status}, body: ${e?.body}, endpoint: ${sub.endpoint.slice(0, 60)}`);
        if (status === 404 || status === 410) {
          await this.subs.delete(sub.id);
          this.logger.debug(`Removed stale push subscription ${sub.endpoint}`);
        }
      }
    }
  }

  async notifyNewRequest(request: RequestDto, staffUserIds: string[], apiBase?: string): Promise<void> {
    const category = request.category?.name ?? 'Request';
    const base = apiBase ?? this.apiBase;
    const payload: PushPayload = {
      type: 'request:new',
      title: `${request.category?.icon ?? '🔔'} New ${category}`,
      body: `${request.requester.name}: ${request.description}`,
      url: `/requests/${request.id}`,
      fullUrl: `${base}/requests/${request.id}`,
      requestId: request.id,
      apiBase: base,
    };
    await Promise.all(staffUserIds.map((id) => this.sendToUser(id, payload)));
  }

  async notifyRequestUpdate(requesterId: string, request: RequestDto, apiBase?: string): Promise<void> {
    const label = STATUS_LABEL[request.status] ?? request.status;
    const staffName = request.staff?.name;
    const payload: PushPayload = {
      type: 'request:update',
      title: `Request ${label}`,
      body: staffName ? `${staffName} updated your request` : 'Your request was updated',
      url: `/requests/${request.id}`,
      requestId: request.id,
      apiBase: apiBase ?? this.apiBase,
    };
    await this.sendToUser(requesterId, payload);
  }

  async notifyNote(note: RequestNoteDto, recipientId: string, apiBase?: string): Promise<void> {
    const payload: PushPayload = {
      type: 'request:note',
      title: `💬 ${note.author.name}`,
      body: note.message,
      url: `/requests/${note.requestId}`,
      requestId: note.requestId,
      apiBase: apiBase ?? this.apiBase,
    };
    await this.sendToUser(recipientId, payload);
  }

  async notifyCompliment(compliment: ComplimentDto): Promise<void> {
    const payload: PushPayload = {
      type: 'compliment:new',
      title: '⭐ You got a compliment!',
      body: compliment.message,
      url: `/requests/${compliment.requestId}`,
      requestId: compliment.requestId,
      apiBase: this.apiBase,
    };
    await this.sendToUser(compliment.toStaff.id, payload);
  }
}
