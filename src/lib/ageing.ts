import { round2 } from "@/lib/money";

export const AGEING_BUCKETS = ["CURRENT", "D1_30", "D31_60", "D61_90", "D90_PLUS"] as const;

export type AgeingBucket = (typeof AGEING_BUCKETS)[number];

export const BUCKET_LABELS: Record<AgeingBucket, string> = {
  CURRENT: "Not yet due",
  D1_30: "1–30 days",
  D31_60: "31–60 days",
  D61_90: "61–90 days",
  D90_PLUS: "90+ days",
};

export const BUCKET_TONES: Record<AgeingBucket, string> = {
  CURRENT: "text-slate-600",
  D1_30: "text-amber-600",
  D31_60: "text-amber-700",
  D61_90: "text-red-600",
  D90_PLUS: "text-red-700",
};

/**
 * Whole days a debt is past its due date. Compared date-to-date rather than by
 * elapsed milliseconds: an invoice due yesterday afternoon is one day late this
 * morning, not zero, and anyone chasing it would say the same.
 */
export function daysOverdue(dueDate: Date | string | null, now: Date = new Date()): number {
  if (!dueDate) return 0;

  const due = new Date(dueDate);
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const days = Math.round((nowMidnight.getTime() - dueMidnight.getTime()) / 86_400_000);
  return days > 0 ? days : 0;
}

/**
 * Which column a debt belongs in. An invoice with no due date counts as current
 * — it cannot be late if nothing was ever agreed.
 */
export function bucketFor(dueDate: Date | string | null, now: Date = new Date()): AgeingBucket {
  const days = daysOverdue(dueDate, now);
  if (days <= 0) return "CURRENT";
  if (days <= 30) return "D1_30";
  if (days <= 60) return "D31_60";
  if (days <= 90) return "D61_90";
  return "D90_PLUS";
}

export type AgeingRow<T> = { bucket: AgeingBucket; total: number; items: T[] };

/** Splits debts across the buckets, keeping every bucket so the table has no gaps. */
export function ageDebts<T extends { dueDate: Date | string | null; balance: number }>(
  debts: T[],
  now: Date = new Date(),
): AgeingRow<T>[] {
  return AGEING_BUCKETS.map((bucket) => {
    const items = debts.filter((debt) => bucketFor(debt.dueDate, now) === bucket);
    return {
      bucket,
      total: round2(items.reduce((sum, item) => sum + item.balance, 0)),
      items,
    };
  });
}
