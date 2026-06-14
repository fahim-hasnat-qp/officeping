import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    try {
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      this.client.on('error', (err: Error) => {
        this.logger.warn(`Redis error: ${err.message}`);
      });
      this.client.connect().catch((err: Error) => {
        this.logger.warn(`Redis unavailable, running without cache: ${err.message}`);
        this.client = null;
      });
    } catch (err: unknown) {
      this.logger.warn('Failed to initialise Redis client');
      this.client = null;
    }
  }

  onModuleDestroy(): void {
    this.client?.disconnect();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** ttlSeconds — how long the key lives. Defaults to end-of-current-UTC-day. */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    const ttl = ttlSeconds ?? this.secondsUntilEndOfDay();
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch {
      // non-fatal
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch {
      // non-fatal
    }
  }

  /** Push item(s) to a Redis list and refresh its TTL. */
  async listPush<T>(key: string, items: T[], ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    const ttl = ttlSeconds ?? this.secondsUntilEndOfDay();
    try {
      const serialised = items.map((i) => JSON.stringify(i));
      await this.client.rpush(key, ...serialised);
      await this.client.expire(key, ttl);
    } catch {
      // non-fatal
    }
  }

  async listGet<T>(key: string): Promise<T[] | null> {
    if (!this.client) return null;
    try {
      const items = await this.client.lrange(key, 0, -1);
      if (!items.length) return null;
      return items.map((i) => JSON.parse(i) as T);
    } catch {
      return null;
    }
  }

  /** Returns today's date string in YYYY-MM-DD (UTC). */
  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private secondsUntilEndOfDay(): number {
    const now = new Date();
    const endOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59),
    );
    return Math.max(1, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
  }
}
