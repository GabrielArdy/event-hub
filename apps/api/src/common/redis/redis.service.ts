import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

const SEAT_LOCK_TTL = 600; // 10 minutes
const AUTH_LOCKOUT_TTL = 900; // 15 minutes
const IDEMPOTENCY_TTL = 86400; // 24 hours

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private config: ConfigService) {
    this.client = new Redis(this.config.get<string>('REDIS_URL')!, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ── Seat Lock (BR-TKT-001) ─────────────────────────────────────────────────
  async lockSeat(seatId: string, orderId: string, ttl = SEAT_LOCK_TTL): Promise<boolean> {
    const script = `
      if redis.call('exists', KEYS[1]) == 0 then
        redis.call('setex', KEYS[1], ARGV[2], ARGV[1])
        return 1
      end
      return 0
    `;
    const result = await this.client.eval(
      script,
      1,
      `seat:lock:${seatId}`,
      JSON.stringify({ orderId }),
      ttl.toString(),
    );
    return result === 1;
  }

  async releaseSeat(seatId: string): Promise<void> {
    await this.client.del(`seat:lock:${seatId}`);
  }

  async isSeatLocked(seatId: string): Promise<boolean> {
    return (await this.client.exists(`seat:lock:${seatId}`)) === 1;
  }

  async getSeatLockOwner(seatId: string): Promise<{ orderId: string } | null> {
    const val = await this.client.get(`seat:lock:${seatId}`);
    return val ? JSON.parse(val) : null;
  }

  // ── Auth Lockout (BR-AUTH-002) ─────────────────────────────────────────────
  async recordLoginAttempt(userId: string): Promise<number> {
    const key = `auth:attempts:${userId}`;
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, 30 * 60); // 30 min window
    return count;
  }

  async lockAccount(userId: string): Promise<void> {
    await this.client.setex(`auth:lockout:${userId}`, AUTH_LOCKOUT_TTL, '1');
    await this.client.del(`auth:attempts:${userId}`);
  }

  async isAccountLocked(userId: string): Promise<boolean> {
    return (await this.client.exists(`auth:lockout:${userId}`)) === 1;
  }

  async getAccountLockExpiry(userId: string): Promise<Date | null> {
    const ttl = await this.client.ttl(`auth:lockout:${userId}`);
    if (ttl <= 0) return null;
    return new Date(Date.now() + ttl * 1000);
  }

  async clearLoginAttempts(userId: string): Promise<void> {
    await this.client.del(`auth:attempts:${userId}`);
    await this.client.del(`auth:lockout:${userId}`);
  }

  // ── Refresh Token Revoke (BR-AUTH-005) ─────────────────────────────────────
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.client.setex(`auth:revoked:${tokenId}`, 7 * 24 * 3600, '1');
  }

  async isRefreshTokenRevoked(tokenId: string): Promise<boolean> {
    return (await this.client.exists(`auth:revoked:${tokenId}`)) === 1;
  }

  // ── Payment Idempotency (BR-PAY-006) ───────────────────────────────────────
  async checkAndSetIdempotency(gatewayTxnId: string, ttl = IDEMPOTENCY_TTL): Promise<boolean> {
    const result = await this.client.set(
      `payment:idempotency:${gatewayTxnId}`,
      '1',
      'EX',
      ttl,
      'NX',
    );
    return result === 'OK'; // true = belum ada (boleh proses)
  }

  // ── Payout Lock ────────────────────────────────────────────────────────────
  async acquirePayoutLock(eventId: string): Promise<boolean> {
    const result = await this.client.set(
      `payout:lock:${eventId}`,
      '1',
      'EX',
      3600,
      'NX',
    );
    return result === 'OK';
  }

  async releasePayoutLock(eventId: string): Promise<void> {
    await this.client.del(`payout:lock:${eventId}`);
  }

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  async incrementRateLimit(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, ttlSeconds);
    return count;
  }

  // ── Generic Cache ──────────────────────────────────────────────────────────
  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get(key);
    return val ? JSON.parse(val) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  getClient(): Redis {
    return this.client;
  }
}
