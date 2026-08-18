import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { effectiveInvoiceStatus, invoiceTotals } from "@/lib/invoices";
import { csvFilename, toCsv } from "@/lib/csv";

/**
 * Every invoice as a spreadsheet — one row each, with what it was worth, what has
 * been received and what is still owed. Behind the same auth gate as the rest of
 * the app: `requireUser` redirects rather than returning the file.
 */
export async function GET() {
  await requireUser();

  const invoices = await prisma.invoice.findMany({
    orderBy: { number: "asc" },
    include: {
      customer: { select: { name: true } },
      project: { select: { name: true } },
      items: { select: { quantity: true, unitPrice: true } },
      payments: { select: { amount: true } },
    },
  });

  const rows = invoices.map((invoice) => {
    const money = invoiceTotals(
      invoice.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
      Number(invoice.taxRate),
      invoice.payments.map((p) => ({ amount: Number(p.amount) })),
    );

    return [
      invoice.number,
      invoice.customer.name,
      invoice.title,
      invoice.project?.name ?? "",
      effectiveInvoiceStatus(invoice, money.balance),
      invoice.issueDate,
      invoice.dueDate,
      money.subtotal.toFixed(2),
      Number(invoice.taxRate).toFixed(2),
      money.tax.toFixed(2),
      money.total.toFixed(2),
      money.paid.toFixed(2),
      money.balance.toFixed(2),
    ];
  });

  const csv = toCsv(
    [
      "Number",
      "Customer",
      "Title",
      "Project",
      "Status",
      "Issued",
      "Due",
      "Subtotal",
      "Tax rate %",
      "Tax",
      "Total",
      "Paid",
      "Balance",
    ],
    rows,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("invoices")}"`,
      // A financial export should never come from a cache.
      "Cache-Control": "no-store",
    },
  });
}
