import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { formatMoney, totals } from "@/lib/money";
import { effectiveStatus } from "@/lib/proposals";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function ProposalsPage() {
  await requireUser();

  const proposals = await prisma.proposal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true } },
      items: { select: { quantity: true, unitPrice: true } },
    },
  });

  const rows = proposals.map((p) => ({
    ...p,
    status: effectiveStatus(p),
    total: totals(
      p.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
      Number(p.taxRate),
    ).total,
  }));

  const openValue = rows
    .filter((r) => r.status === "DRAFT" || r.status === "SENT")
    .reduce((sum, r) => sum + r.total, 0);

  return (
    <div>
      <PageHeader
        title="Proposals"
        description="Quotes you have put in front of customers."
        action={<LinkButton href="/proposals/new">+ New proposal</LinkButton>}
      />

      {rows.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Card className="px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Open value</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatMoney(openValue)}</p>
          </Card>
          <Card className="px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Proposals</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{rows.length}</p>
          </Card>
        </div>
      )}

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No proposals yet"
            hint="Build a quote with line items, then send it to your customer."
            action={<LinkButton href="/proposals/new">+ New proposal</LinkButton>}
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Valid until</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/proposals/${p.id}`}
                      className="font-medium tabular-nums text-slate-900 hover:text-brand-600"
                    >
                      {p.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{p.title}</td>
                  <td className="px-5 py-3 text-slate-500">
                    <Link href={`/customers/${p.customer.id}`} className="hover:text-brand-600">
                      {p.customer.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {p.validUntil ? dateFmt.format(p.validUntil) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge value={p.status} />
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-900">
                    {formatMoney(p.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
