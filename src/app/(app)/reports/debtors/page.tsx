import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCompany } from "@/lib/company";
import { formatMoney, round2 } from "@/lib/money";
import { invoiceTotals } from "@/lib/invoices";
import {
  AGEING_BUCKETS,
  BUCKET_LABELS,
  BUCKET_TONES,
  ageDebts,
  bucketFor,
  daysOverdue,
} from "@/lib/ageing";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { ReportsNav } from "@/components/reports-nav";
import { ChaseButton } from "@/components/chase-button";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function DebtorsPage() {
  await requireUser();

  const [invoices, company] = await Promise.all([
    prisma.invoice.findMany({
      // Only what can still be owed — drafts have not been asked for and a
      // cancelled invoice is not a debt.
      where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      include: {
        customer: { select: { id: true, name: true } },
        items: { select: { quantity: true, unitPrice: true } },
        payments: { select: { amount: true } },
      },
    }),
    getCompany(),
  ]);

  const debts = invoices
    .map((invoice) => {
      const money = invoiceTotals(
        invoice.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
        Number(invoice.taxRate),
        invoice.payments.map((p) => ({ amount: Number(p.amount) })),
      );
      return { ...invoice, balance: money.balance, paid: money.paid };
    })
    .filter((debt) => debt.balance > 0);

  const buckets = ageDebts(debts);
  const owedTotal = round2(buckets.reduce((sum, bucket) => sum + bucket.total, 0));
  const overdueTotal = round2(
    buckets.filter((b) => b.bucket !== "CURRENT").reduce((sum, b) => sum + b.total, 0),
  );

  // Worst first: the oldest debt is the one to chase this morning.
  const worst = [...debts].sort(
    (a, b) => daysOverdue(b.dueDate) - daysOverdue(a.dueDate) || b.balance - a.balance,
  );

  // What each customer owes, so a chase can be one call rather than four.
  const byCustomer = [
    ...debts
      .reduce((map, debt) => {
        const existing = map.get(debt.customer.id);
        map.set(debt.customer.id, {
          id: debt.customer.id,
          name: debt.customer.name,
          balance: round2((existing?.balance ?? 0) + debt.balance),
          count: (existing?.count ?? 0) + 1,
          oldest: Math.max(existing?.oldest ?? 0, daysOverdue(debt.dueDate)),
        });
        return map;
      }, new Map<string, { id: string; name: string; balance: number; count: number; oldest: number }>())
      .values(),
  ].sort((a, b) => b.balance - a.balance);

  return (
    <div>
      <ReportsNav active="/reports/debtors" />
      <PageHeader
        title="Who owes you"
        description="Every unpaid invoice, sorted by how long it has been outstanding."
      />

      {debts.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing outstanding"
            hint="Every issued invoice has been settled. Enjoy it."
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <Card className="px-5 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Owed in total</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900">
                {formatMoney(owedTotal, company.currency)}
              </p>
            </Card>
            <Card className="px-5 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Past due</p>
              <p
                className={`mt-0.5 text-lg font-semibold ${
                  overdueTotal > 0 ? "text-red-600" : "text-slate-900"
                }`}
              >
                {formatMoney(overdueTotal, company.currency)}
              </p>
            </Card>
            <Card className="px-5 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Unpaid invoices</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900">{debts.length}</p>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader title="How old the debt is" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                    {AGEING_BUCKETS.map((bucket) => (
                      <th key={bucket} className="px-5 py-3 text-right font-medium first:text-left">
                        {BUCKET_LABELS[bucket]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {buckets.map((row) => (
                      <td
                        key={row.bucket}
                        className={`px-5 py-4 text-right tabular-nums first:text-left ${
                          row.total > 0 ? BUCKET_TONES[row.bucket] : "text-slate-300"
                        }`}
                      >
                        <span className="text-base font-semibold">
                          {formatMoney(row.total, company.currency)}
                        </span>
                        {row.items.length > 0 && (
                          <span className="ml-2 text-xs text-slate-400">
                            {row.items.length}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Chase these first" description="Oldest debt at the top." />
              <ul className="divide-y divide-slate-100">
                {worst.slice(0, 8).map((debt) => {
                  const late = daysOverdue(debt.dueDate);
                  return (
                    <li key={debt.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
                      <Link
                        href={`/invoices/${debt.id}`}
                        className="flex min-w-0 flex-1 items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            <span className="font-mono tabular-nums">{debt.number}</span> ·{" "}
                            {debt.customer.name}
                          </p>
                          <p
                            className={`text-xs ${
                              late > 0 ? BUCKET_TONES[bucketFor(debt.dueDate)] : "text-slate-500"
                            }`}
                          >
                            {late > 0
                              ? `${late} day${late === 1 ? "" : "s"} overdue`
                              : debt.dueDate
                                ? `due ${dateFmt.format(debt.dueDate)}`
                                : "no due date"}
                            {debt.paid > 0 &&
                              ` · ${formatMoney(debt.paid, company.currency)} received`}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-medium tabular-nums text-slate-900">
                          {formatMoney(debt.balance, company.currency)}
                        </span>
                      </Link>
                      {late > 0 && <ChaseButton invoiceId={debt.id} />}
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card>
              <CardHeader
                title="By customer"
                description="One call can cover everything an account owes."
              />
              <ul className="divide-y divide-slate-100">
                {byCustomer.map((customer) => (
                  <li key={customer.id}>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {customer.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {customer.count} invoice{customer.count === 1 ? "" : "s"}
                          {customer.oldest > 0 && ` · oldest ${customer.oldest} days late`}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-slate-900">
                        {formatMoney(customer.balance, company.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
