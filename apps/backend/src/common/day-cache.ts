/**
 * Simple in-memory cache keyed by `${date}:${key}`.
 * Entries are valid only for the calendar date they were stored on — any
 * call after midnight automatically misses and the caller re-fetches.
 */
export class DayCache {
  private readonly store = new Map<string, { date: string; value: unknown; expiresAt: number }>();

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.date !== this.today() || Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  /** ttlMs defaults to end-of-day; pass a shorter value for volatile data */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);
    this.store.set(key, {
      date: this.today(),
      value,
      expiresAt: ttlMs ? now + ttlMs : endOfDay.getTime(),
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }
}
