export const CADENCES = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;

export type Cadence = (typeof CADENCES)[number];

export const CADENCE_LABELS: Record<Cadence, string> = {
  WEEKLY: "Every week",
  MONTHLY: "Every month",
  QUARTERLY: "Every quarter",
  YEARLY: "Every year",
};

const MONTHS_BY_CADENCE: Partial<Record<Cadence, number>> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  YEARLY: 12,
};

/**
 * The next date in the series.
 *
 * Month arithmetic is the whole difficulty. A retainer that bills on the 31st
 * has no 31st in February, and JavaScript's Date quietly rolls that over into
 * March. So the day is clamped to the last day of the target month, and — this
 * is the part that matters — the clamp is applied to the *original* day each
 * time rather than carried forward. Otherwise a January 31st schedule slips to
 * the 28th in February and then stays on the 28th forever.
 */
export function nextRun(from: Date, cadence: Cadence, anchorDay?: number): Date {
  if (cadence === "WEEKLY") {
    const next = new Date(from);
    next.setDate(next.getDate() + 7);
    return next;
  }

  const months = MONTHS_BY_CADENCE[cadence] ?? 1;
  const day = anchorDay ?? from.getDate();

  const target = new Date(from);
  // Move to the first of the month before shifting, so the shift itself cannot
  // overflow into the month after the one we want.
  target.setDate(1);
  target.setMonth(target.getMonth() + months);

  const lastDayOfTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDayOfTarget));
  target.setHours(from.getHours(), from.getMinutes(), 0, 0);

  return target;
}

/** Everything due on or before the end of today. */
export function isDue(nextRunOn: Date, now: Date = new Date()) {
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return nextRunOn <= endOfToday;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
