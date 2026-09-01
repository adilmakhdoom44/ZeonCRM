import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { csvFilename, toCsv } from "@/lib/csv";

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  CASH: "Cash",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

/**
 * Every payment received, oldest first — the record an accountant reconciles
 * against the bank statement, which is why it is ordered the way a statement
 * is. Invoices, quotes and costs could already leave the app; the money that
 * actually arrived could not.
 */
export async function GET() {
  await requireUser();

  const payments = await prisma.payment.findMany({
    orderBy: { receivedAt: "asc" },
    include: {
      invoice: {
        select: { number: true, title: true, customer: { select: { name: true } } },
      },
    },
  });

  const rows = payments.map((payment) => [
    payment.receivedAt,
    Number(payment.amount).toFixed(2),
    METHOD_LABELS[payment.method] ?? payment.method,
    payment.reference ?? "",
    payment.invoice.number,
    payment.invoice.customer.name,
    payment.invoice.title,
    payment.note ?? "",
  ]);

  const csv = toCsv(
    ["Received", "Amount", "Method", "Reference", "Invoice", "Customer", "For", "Note"],
    rows,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("payments")}"`,
      "Cache-Control": "no-store",
    },
  });
}
