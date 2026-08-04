import type { Prisma } from "@prisma/client";
import { round2, totals, type MoneyLine } from "@/lib/money";

export const INVOICE_STATUSES = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Sequential, human-readable document number: INV-0001, INV-0002, … */
export async function nextInvoiceNumber(tx: Prisma.TransactionClient) {
  const latest = await tx.invoice.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const seq = latest ? Number(latest.number.replace(/\D/g, "")) : 0;
  return `INV-${String(seq + 1).padStart(4, "0")}`;
}

function endOfDay(value: Date | string) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * What the invoice is worth and what is still owed. Payments are summed rather
 * than stored as a running balance, so a corrected or deleted payment can never
 * leave the invoice disagreeing with its own receipts.
 */
export function invoiceTotals(
  items: MoneyLine[],
  taxRate: number,
  payments: { amount: number }[] = [],
) {
  const { subtotal, tax, total } = totals(items, taxRate);
  const paid = round2(payments.reduce((sum, payment) => sum + payment.amount, 0));
  return { subtotal, tax, total, paid, balance: round2(total - paid) };
}

/**
 * Overdue is a calendar fact, not a stored state: an unpaid invoice past its due
 * date reads as overdue everywhere without a background job to flip it.
 */
export function effectiveInvoiceStatus(
  invoice: { status: string; dueDate: Date | string | null },
  balance: number,
  now: Date = new Date(),
): InvoiceStatus {
  if (invoice.status === "DRAFT" || invoice.status === "CANCELLED" || invoice.status === "PAID") {
    return invoice.status as InvoiceStatus;
  }
  if (balance <= 0) return "PAID";
  if (invoice.dueDate && endOfDay(invoice.dueDate) < now) return "OVERDUE";
  return balance > 0 && invoice.status === "PARTIALLY_PAID" ? "PARTIALLY_PAID" : "SENT";
}

/** Only unsent drafts are editable — a client must not see figures change after the fact. */
export function isInvoiceEditable(invoice: { status: string }) {
  return invoice.status === "DRAFT";
}
