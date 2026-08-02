export const CURRENCY = "USD";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
});

export function formatMoney(value: number) {
  return formatter.format(Number.isFinite(value) ? value : 0);
}

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type MoneyLine = { quantity: number; unitPrice: number };

export function lineTotal(line: MoneyLine) {
  return round2(line.quantity * line.unitPrice);
}

/** Subtotal, tax and grand total for a set of line items. `taxRate` is a percentage. */
export function totals(lines: MoneyLine[], taxRate: number) {
  const subtotal = round2(lines.reduce((sum, line) => sum + lineTotal(line), 0));
  const tax = round2((subtotal * taxRate) / 100);
  return { subtotal, tax, total: round2(subtotal + tax) };
}
