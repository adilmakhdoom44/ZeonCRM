import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { formatMoney, totals } from "@/lib/money";
import { effectiveStatus } from "@/lib/proposals";
import { PAGE_SIZE, Pagination, pageFrom } from "@/components/pagination";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const { page: pageParam } = await searchParams;

  const total = await prisma.proposal.count();
  const page = pageFrom(pageParam, total);

  const [proposals, liveProposals] = await Promise.all([
    prisma.proposal.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: { select: { id: true, name: true } },
        items: { select: { quantity: true, unitPrice: true } },
      },
    }),
    // Open value covers every unanswered quote, not just the page in view.
    prisma.proposal.findMany({
      where: { status: { in: ["DRAFT", "SENT"] } },
      select: {
        status: true,
        validUntil: true,
        taxRate: true,
        items: { select: { quantity: true, unitPrice: true } },
      },
    }),
  ]);

  const rows = proposals.map((p) => ({
    ...p,
    status: effectiveStatus(p),
    total: totals(
      p.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
      Number(p.taxRate),
    ).total,
  }));

  const openValue = liveProposals
    .map((p) => ({
      status: effectiveStatus(p),
      total: totals(
        p.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
        Number(p.taxRate),
      ).total,
    }))
    .filter((p) => p.status === "DRAFT" || p.status === "SENT")
    .reduce((sum, p) => sum + p.total, 0);

  return (
    <div>
      <PageHeader
        title="Proposals"
        description="Quotes you have put in front of customers."
        action={<LinkButton href="/proposals/new">+ New proposal</LinkButton>}
      />

      {total > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Card className="px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Open value</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatMoney(openValue)}</p>
          </Card>
          <Card className="px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Proposals</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{total}</p>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="whitespace-nowrap px-5 py-3 font-medium">Number</th>
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
            </div>
        )}
      </Card>

      <Pagination
        basePath="/proposals"
        params={new URLSearchParams()}
        page={page}
        total={total}
        noun="proposal"
      />
    </div>
  );
}
