import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { totals } from "@/lib/money";
import { effectiveStatus } from "@/lib/proposals";
import { csvFilename, toCsv } from "@/lib/csv";

/**
 * Every quote as a spreadsheet — what was offered, to whom, and what came of it.
 * Status is the calendar-aware one, so a quote nobody answered before its
 * validity date reads as expired here exactly as it does in the app.
 */
export async function GET() {
  await requireUser();

  const proposals = await prisma.proposal.findMany({
    orderBy: { number: "asc" },
    include: {
      customer: { select: { name: true } },
      items: { select: { quantity: true, unitPrice: true } },
    },
  });

  const rows = proposals.map((proposal) => {
    const money = totals(
      proposal.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
      Number(proposal.taxRate),
    );

    return [
      proposal.number,
      proposal.customer.name,
      proposal.title,
      effectiveStatus(proposal),
      proposal.issueDate,
      proposal.validUntil,
      proposal.sentAt,
      proposal.respondedAt,
      proposal.respondedByName,
      money.subtotal.toFixed(2),
      Number(proposal.taxRate).toFixed(2),
      money.total.toFixed(2),
    ];
  });

  const csv = toCsv(
    [
      "Number",
      "Customer",
      "Title",
      "Status",
      "Issued",
      "Valid until",
      "Sent",
      "Answered",
      "Answered by",
      "Subtotal",
      "Tax rate %",
      "Total",
    ],
    rows,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("proposals")}"`,
      "Cache-Control": "no-store",
    },
  });
}
