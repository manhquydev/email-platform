import type Redis from "ioredis";
import { createRateLimitRedis } from "../middleware/rate-limit-config";

/**
 * Failed-authentication limiter for the raw SMTP/IMAP socket protocols.
 *
 * The HTTP @fastify/rate-limit plugin does not cover these servers, so credential stuffing
 * against SMTP submission / IMAP LOGIN was previously unbounded. This tracks recent failures
 * per client IP in a sliding window (Redis sorted-set, in-memory fallback) and applies an
 * extended lockout once failures pile up. A successful login clears the counters.
 */

const WINDOW_MS = 15 * 60 * 1000; // failures counted over the last 15 minutes
const MAX_FAILURES = 5; // block further AUTH once this many failures occur in the window
const HARD_BLOCK_FAILURES = 20; // sustained abuse → longer lockout
const HARD_BLOCK_MS = 60 * 60 * 1000; // 1 hour

let redisClient: Redis | undefined;
let initialized = false;
function getRedis(): Redis | undefined {
    if (!initialized) {
        redisClient = createRateLimitRedis();
        initialized = true;
    }
    return redisClient;
}

// In-memory fallback (single-process) used when Redis is unavailable / in tests.
const memFailures = new Map<string, number[]>();
const memBlocks = new Map<string, number>();
function pruneWindow(times: number[], now: number): number[] {
    return times.filter((t) => now - t < WINDOW_MS);
}

export class AuthAttemptLimiter {
    constructor(private readonly scope: string) {}

    private failKey(id: string): string {
        return `authfail:${this.scope}:${id}`;
    }
    private blockKey(id: string): string {
        return `authblock:${this.scope}:${id}`;
    }

    async isBlocked(id: string): Promise<boolean> {
        const now = Date.now();
        const redis = getRedis();
        if (redis) {
            try {
                const until = await redis.get(this.blockKey(id));
                if (until && parseInt(until, 10) > now) return true;
                const count = await redis.zcount(this.failKey(id), now - WINDOW_MS, now);
                return count >= MAX_FAILURES;
            } catch {
                // fall through to memory
            }
        }
        const blockedUntil = memBlocks.get(id);
        if (blockedUntil && blockedUntil > now) return true;
        return pruneWindow(memFailures.get(id) || [], now).length >= MAX_FAILURES;
    }

    async recordFailure(id: string): Promise<void> {
        const now = Date.now();
        const redis = getRedis();
        if (redis) {
            try {
                const key = this.failKey(id);
                await redis.zremrangebyscore(key, 0, now - WINDOW_MS);
                await redis.zadd(key, now.toString(), `${now}-${Math.random()}`);
                await redis.expire(key, Math.ceil(WINDOW_MS / 1000));
                const total = await redis.zcard(key);
                if (total >= HARD_BLOCK_FAILURES) {
                    await redis.set(this.blockKey(id), (now + HARD_BLOCK_MS).toString(), "PX", HARD_BLOCK_MS);
                }
                return;
            } catch {
                // fall through to memory
            }
        }
        const times = pruneWindow(memFailures.get(id) || [], now);
        times.push(now);
        memFailures.set(id, times);
        if (times.length >= HARD_BLOCK_FAILURES) {
            memBlocks.set(id, now + HARD_BLOCK_MS);
        }
    }

    async recordSuccess(id: string): Promise<void> {
        const redis = getRedis();
        if (redis) {
            try {
                await redis.del(this.failKey(id), this.blockKey(id));
                return;
            } catch {
                // fall through to memory
            }
        }
        memFailures.delete(id);
        memBlocks.delete(id);
    }
}
