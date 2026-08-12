"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { invoiceTotals } from "@/lib/invoices";
import { recordAudit } from "@/lib/audit";
import { formatMoney } from "@/lib/money";

const METHODS = ["BANK_TRANSFER", "CARD", "CASH", "CHEQUE", "OTHER"] as const;

const paymentSchema = z.object({
  amount: z.number().positive().max(100_000_000),
  method: z.enum(METHODS),
  reference: z.string().trim().max(120),
  receivedAt: z.string(),
  note: z.string().trim().max(1000),
});

function refresh(invoiceId: string) {
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

/**
 * Re-derives the stored status from what is actually on the invoice. Status is
 * computed on read everywhere, but the column still has to agree — it is what
 * list filters and any future reporting read, and a stale one would quietly
 * disagree with the page it came from.
 */
async function syncInvoiceStatus(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, payments: { select: { amount: true } } },
  });
  if (!invoice) return;

  // A draft or written-off invoice is not waiting on money; leave it alone.
  if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") return;

  const { balance, paid } = invoiceTotals(
    invoice.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    Number(invoice.taxRate),
    invoice.payments.map((p) => ({ amount: Number(p.amount) })),
  );

  const status = balance <= 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "SENT";

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { status, paidAt: balance <= 0 ? (invoice.paidAt ?? new Date()) : null },
  });
}

export async function recordPaymentAction(invoiceId: string, formData: FormData) {
  const user = await requireUser();

  const parsed = paymentSchema.safeParse({
    amount: Number(String(formData.get("amount") ?? "").replace(/[^0-9.]/g, "")),
    method: formData.get("method"),
    reference: formData.get("reference") ?? "",
    receivedAt: formData.get("receivedAt") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Enter an amount greater than zero." };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true, number: true },
  });
  if (!invoice) return { ok: false as const, error: "This invoice no longer exists." };
  if (invoice.status === "DRAFT") {
    return { ok: false as const, error: "Issue the invoice before recording a payment." };
  }
  if (invoice.status === "CANCELLED") {
    return { ok: false as const, error: "This invoice has been cancelled." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        amount: parsed.data.amount,
        method: parsed.data.method,
        reference: parsed.data.reference || null,
        receivedAt: parsed.data.receivedAt ? new Date(parsed.data.receivedAt) : new Date(),
        note: parsed.data.note || null,
      },
    });
    await syncInvoiceStatus(tx, invoiceId);
  });

  await recordAudit({
    actor: user,
    action: "paid",
    entity: "Invoice",
    entityId: invoiceId,
    summary: `Recorded ${formatMoney(parsed.data.amount)} against ${invoice.number}`,
  });

  refresh(invoiceId);
  return { ok: true as const };
}

/** Removing a receipt puts the invoice back where the remaining payments leave it. */
export async function deletePaymentAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));

  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { invoiceId: true, amount: true, invoice: { select: { number: true } } },
  });
  if (!payment) return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id } });
    await syncInvoiceStatus(tx, payment.invoiceId);
  });

  // Removing money from the record is exactly the kind of change an audit trail exists for.
  await recordAudit({
    actor: user,
    action: "deleted",
    entity: "Payment",
    entityId: id,
    summary: `Removed a ${formatMoney(Number(payment.amount))} payment from ${payment.invoice.number}`,
  });

  refresh(payment.invoiceId);
}
