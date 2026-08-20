import { round2 } from "@/lib/money";

export const EXPENSE_CATEGORIES = [
  "SUBCONTRACTOR",
  "SOFTWARE",
  "HARDWARE",
  "TRAVEL",
  "STOCK_ASSETS",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SUBCONTRACTOR: "Subcontractor",
  SOFTWARE: "Software",
  HARDWARE: "Hardware",
  TRAVEL: "Travel",
  STOCK_ASSETS: "Stock & assets",
  OTHER: "Other",
};

export type Margin = {
  revenue: number;
  cost: number;
  profit: number;
  /** Percentage of revenue kept, or null when there is no revenue to divide by. */
  marginPct: number | null;
};

/**
 * What a job made.
 *
 * `marginPct` is null rather than 0 when revenue is nil, because those mean
 * different things: a job with no agreed price has an unknown margin, not a
 * zero one, and showing "0%" against unbilled work reads as a loss it has not
 * made. Callers decide how to present the absence.
 */
export function margin(revenue: number, cost: number): Margin {
  const safeRevenue = Number.isFinite(revenue) ? round2(revenue) : 0;
  const safeCost = Number.isFinite(cost) ? round2(cost) : 0;
  const profit = round2(safeRevenue - safeCost);

  return {
    revenue: safeRevenue,
    cost: safeCost,
    profit,
    marginPct: safeRevenue === 0 ? null : round2((profit / safeRevenue) * 100),
  };
}

export function sumExpenses(expenses: { amount: number }[]) {
  return round2(expenses.reduce((total, expense) => total + expense.amount, 0));
}

/** Groups costs by category so it is obvious where a job's money went. */
export function byCategory(expenses: { amount: number; category: string }[]) {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    totals.set(expense.category, round2((totals.get(expense.category) ?? 0) + expense.amount));
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Colour cue for a margin: healthy, thin, or under water. */
export function marginTone(marginPct: number | null) {
  if (marginPct === null) return "text-slate-400";
  if (marginPct < 0) return "text-red-600";
  if (marginPct < 20) return "text-amber-600";
  return "text-emerald-600";
}
