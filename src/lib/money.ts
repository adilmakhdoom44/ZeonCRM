export const CURRENCY = "USD";

// Formatters are not free to build, and the same handful of currencies get asked
// for over and over on a list of invoices.
const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string) {
  const existing = formatters.get(currency);
  if (existing) return existing;

  let created: Intl.NumberFormat;
  try {
    created = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });
  } catch {
    // An unknown code from settings must not take a page down with it.
    created = formatterFor(CURRENCY);
  }

  formatters.set(currency, created);
  return created;
}

export function formatMoney(value: number, currency: string = CURRENCY) {
  return formatterFor(currency).format(Number.isFinite(value) ? value : 0);
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
