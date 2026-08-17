import { createHash } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * The caller's address, as far as it can be known behind a proxy. Vercel sets
 * x-forwarded-for; the first entry is the client. Falls back to a constant so a
 * missing header degrades to a shared bucket rather than to no limit at all.
 */
export async function callerIp() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

/** Buckets are hashed: an email address should not sit in the table in the clear. */
function bucketKey(scope: string, identifier: string) {
  return `${scope}:${createHash("sha256").update(identifier.toLowerCase()).digest("hex").slice(0, 32)}`;
}

/**
 * Reports whether the caller is over the limit, without spending any of it.
 * Checking and recording are separate so that only *failed* attempts count: a
 * person who signs in correctly on their third try should not be one mistake
 * away from being locked out.
 *
 * Deliberately fails *open*. If the database is unreachable, people can still
 * sign in — a limiter that locks everyone out when it breaks is worse than the
 * attack it prevents.
 */
export async function checkRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
}: {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const bucket = bucketKey(scope, identifier);
  const since = new Date(Date.now() - windowMs);

  try {
    // Clear anything that has aged out, so the table does not grow without bound
    // and the count below only sees the current window.
    await prisma.rateLimitHit.deleteMany({ where: { bucket, createdAt: { lt: since } } });

    const used = await prisma.rateLimitHit.count({ where: { bucket, createdAt: { gte: since } } });
    if (used < limit) return { allowed: true, remaining: limit - used, retryAfterSeconds: 0 };

    const oldest = await prisma.rateLimitHit.findFirst({
      where: { bucket, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const retryAfterMs = oldest ? oldest.createdAt.getTime() + windowMs - Date.now() : windowMs;

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  } catch (error) {
    console.error("[Zeon CRM] Rate limiter unavailable, allowing the request:", error);
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}

/** Spends one unit of the budget. Call this when an attempt fails. */
export async function recordAttempt(scope: string, identifier: string) {
  try {
    await prisma.rateLimitHit.create({ data: { bucket: bucketKey(scope, identifier) } });
  } catch (error) {
    console.error("[Zeon CRM] Could not record a rate-limit attempt:", error);
  }
}

/** Clears a bucket — used after a successful sign-in so one good login resets the count. */
export async function clearRateLimit(scope: string, identifier: string) {
  try {
    await prisma.rateLimitHit.deleteMany({ where: { bucket: bucketKey(scope, identifier) } });
  } catch {
    // Nothing to do: a stale bucket expires on its own.
  }
}

export function retryMessage(seconds: number) {
  if (seconds <= 60) return "Too many attempts. Try again in a minute.";
  return `Too many attempts. Try again in about ${Math.ceil(seconds / 60)} minutes.`;
}
