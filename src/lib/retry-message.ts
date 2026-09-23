/**
 * The human-facing half of the rate limiter. Kept in its own module, free of
 * the `next/headers` and Prisma imports the rest of `@/lib/rate-limit` needs,
 * so this pure formatting logic can be unit tested without a request context
 * or a database.
 */
export function retryMessage(seconds: number) {
  if (seconds <= 60) return "Too many attempts. Try again in a minute.";
  return `Too many attempts. Try again in about ${Math.ceil(seconds / 60)} minutes.`;
}
