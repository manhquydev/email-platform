import crypto from "crypto";
import type Redis from "ioredis";
import { createRateLimitRedis } from "../middleware/rate-limit-config";

/**
 * Short-lived, single-use tickets for authenticating SSE (EventSource) connections.
 *
 * Browsers cannot attach an Authorization header to EventSource, which previously forced the
 * long-lived access token into the query string (leaking it into proxy/server access logs and
 * browser history). Instead, an authenticated request mints a 60s one-time ticket; the SSE
 * connection presents the ticket, which is consumed (deleted) on first use.
 */

const TICKET_TTL_SECONDS = 60;

let redisClient: Redis | undefined;
let initialized = false;
function getRedis(): Redis | undefined {
    if (!initialized) {
        redisClient = createRateLimitRedis();
        initialized = true;
    }
    return redisClient;
}

// In-memory fallback for tests / Redis-down.
const memTickets = new Map<string, { userId: string; expiresAt: number }>();

export async function issueSseTicket(userId: string): Promise<string> {
    const ticket = crypto.randomBytes(32).toString("hex");
    const redis = getRedis();
    if (redis) {
        try {
            await redis.set(`sse-ticket:${ticket}`, userId, "EX", TICKET_TTL_SECONDS);
            return ticket;
        } catch {
            // fall through to memory
        }
    }
    memTickets.set(ticket, { userId, expiresAt: Date.now() + TICKET_TTL_SECONDS * 1000 });
    return ticket;
}

/** Validate and consume a ticket (one-time use). Returns the userId or null if invalid/expired. */
export async function consumeSseTicket(ticket: string): Promise<string | null> {
    const redis = getRedis();
    if (redis) {
        try {
            const key = `sse-ticket:${ticket}`;
            const userId = await redis.get(key);
            if (userId) await redis.del(key);
            return userId || null;
        } catch {
            // fall through to memory
        }
    }
    const entry = memTickets.get(ticket);
    memTickets.delete(ticket);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.userId;
}
