import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCompany } from "@/lib/company";
import { formatMoney, round2 } from "@/lib/money";
import { CATEGORY_LABELS, byCategory, margin, marginTone, type ExpenseCategory } from "@/lib/profit";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";

export default async function ProfitabilityPage() {
  await requireUser();

  const [projects, company] = await Promise.all([
    prisma.project.findMany({
      // Quoted work has not been won yet, so counting it would flatter the numbers.
      where: { stage: { notIn: ["QUOTED", "CANCELLED"] } },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        expenses: { select: { amount: true, category: true } },
      },
    }),
    getCompany(),
  ]);

  const rows = projects
    .map((project) => {
      const cost = round2(project.expenses.reduce((sum, e) => sum + Number(e.amount), 0));
      return {
        ...project,
        ...margin(Number(project.price ?? 0), cost),
      };
    })
    .sort((a, b) => b.profit - a.profit);

  const totals = margin(
    round2(rows.reduce((sum, r) => sum + r.revenue, 0)),
    round2(rows.reduce((sum, r) => sum + r.cost, 0)),
  );

  const spendByCategory = byCategory(
    projects.flatMap((p) =>
      p.expenses.map((e) => ({ amount: Number(e.amount), category: e.category })),
    ),
  );

  const thin = rows.filter((r) => r.marginPct !== null && r.marginPct < 20);

  return (
    <div>
      <PageHeader
        title="Profitability"
        description="What each job earned once its costs are taken off. Quoted and cancelled work is left out."
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No live projects to measure"
            hint="Once work is confirmed and has a price, its margin shows up here."
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <Card className="px-5 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Revenue</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900">
                {formatMoney(totals.revenue, company.currency)}
              </p>
            </Card>
            <Card className="px-5 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Costs</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900">
                {formatMoney(totals.cost, company.currency)}
              </p>
            </Card>
            <Card className="px-5 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Profit</p>
              <p className={`mt-0.5 text-lg font-semibold ${marginTone(totals.marginPct)}`}>
                {formatMoney(totals.profit, company.currency)}
                {totals.marginPct !== null && (
                  <span className="ml-2 text-sm">{totals.marginPct.toFixed(0)}%</span>
                )}
              </p>
            </Card>
          </div>

          {thin.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-medium text-amber-900">
                {thin.length} project{thin.length === 1 ? "" : "s"} running under a 20% margin
              </p>
              <p className="mt-0.5 text-sm text-amber-700">
                {thin
                  .slice(0, 3)
                  .map((r) => r.name)
                  .join(", ")}
                {thin.length > 3 && ` and ${thin.length - 3} more`}
              </p>
            </div>
          )}

          <Card className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-medium">Project</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Stage</th>
                    <th className="px-5 py-3 text-right font-medium">Price</th>
                    <th className="px-5 py-3 text-right font-medium">Costs</th>
                    <th className="px-5 py-3 text-right font-medium">Profit</th>
                    <th className="px-5 py-3 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/projects?focus=${row.id}`}
                          className="font-medium text-slate-900 hover:text-brand-600"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        <Link
                          href={`/customers/${row.customer.id}`}
                          className="hover:text-brand-600"
                        >
                          {row.customer.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Badge value={row.stage} />
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                        {row.revenue === 0 ? "—" : formatMoney(row.revenue, company.currency)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                        {formatMoney(row.cost, company.currency)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-medium tabular-nums ${marginTone(row.marginPct)}`}
                      >
                        {formatMoney(row.profit, company.currency)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right tabular-nums ${marginTone(row.marginPct)}`}
                      >
                        {row.marginPct === null ? "—" : `${row.marginPct.toFixed(0)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {spendByCategory.length > 0 && (
            <Card>
              <CardHeader title="Where the money went" description="Costs across all live work." />
              <ul className="space-y-3 p-5">
                {spendByCategory.map((row) => (
                  <li key={row.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">
                        {CATEGORY_LABELS[row.category as ExpenseCategory] ?? row.category}
                      </span>
                      <span className="font-medium tabular-nums text-slate-900">
                        {formatMoney(row.amount, company.currency)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${Math.round((row.amount / spendByCategory[0].amount) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
