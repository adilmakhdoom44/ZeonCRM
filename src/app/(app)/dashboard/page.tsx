import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { formatMoney, round2 } from "@/lib/money";
import { effectiveInvoiceStatus, invoiceTotals } from "@/lib/invoices";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui";

const OPEN_STAGES = ["QUOTED", "CONFIRMED", "IN_PROGRESS", "REVIEW"] as const;

const STAGE_LABELS: Record<string, string> = {
  QUOTED: "Quoted",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();

  const [monthPayments, liveInvoices, openProjects, recentCustomers, upcomingProjects] =
    await Promise.all([
      prisma.payment.findMany({
        where: { receivedAt: { gte: startOfMonth(now) } },
        select: { amount: true },
      }),
      // Everything still capable of being owed — drafts have not been asked for
      // and cancelled invoices are not debts.
      prisma.invoice.findMany({
        where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
        include: {
          customer: { select: { id: true, name: true } },
          items: { select: { quantity: true, unitPrice: true } },
          payments: { select: { amount: true } },
        },
      }),
      prisma.project.findMany({
        where: { stage: { in: [...OPEN_STAGES] } },
        select: { stage: true, price: true },
      }),
      prisma.customer.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { contacts: true, projects: true } } },
      }),
      prisma.project.findMany({
        where: { stage: { in: [...OPEN_STAGES] } },
        orderBy: [{ dueDate: "asc" }],
        take: 5,
        include: { customer: { select: { id: true, name: true } } },
      }),
    ]);

  const revenueThisMonth = round2(
    monthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
  );

  const unpaid = liveInvoices
    .map((invoice) => {
      const money = invoiceTotals(
        invoice.items.map((i) => ({
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
        Number(invoice.taxRate),
        invoice.payments.map((p) => ({ amount: Number(p.amount) })),
      );
      return { ...invoice, ...money, status: effectiveInvoiceStatus(invoice, money.balance) };
    })
    .filter((invoice) => invoice.balance > 0)
    .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));

  const outstanding = round2(unpaid.reduce((sum, invoice) => sum + invoice.balance, 0));
  const overdue = unpaid.filter((invoice) => invoice.status === "OVERDUE");
  const overdueValue = round2(overdue.reduce((sum, invoice) => sum + invoice.balance, 0));

  const pipeline = OPEN_STAGES.map((stage) => {
    const inStage = openProjects.filter((project) => project.stage === stage);
    return {
      stage,
      count: inStage.length,
      value: round2(inStage.reduce((sum, project) => sum + Number(project.price ?? 0), 0)),
    };
  });
  const pipelineValue = round2(pipeline.reduce((sum, row) => sum + row.value, 0));
  const widest = Math.max(...pipeline.map((row) => row.value), 1);

  const stats = [
    {
      label: "Revenue this month",
      value: formatMoney(revenueThisMonth),
      href: "/invoices",
      tone: "text-slate-900",
    },
    {
      label: "Outstanding",
      value: formatMoney(outstanding),
      href: "/invoices",
      tone: "text-slate-900",
    },
    {
      label: "Overdue",
      value: formatMoney(overdueValue),
      href: "/invoices",
      tone: overdueValue > 0 ? "text-red-600" : "text-slate-900",
    },
    {
      label: "Pipeline",
      value: formatMoney(pipelineValue),
      href: "/projects",
      tone: "text-slate-900",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Welcome back, {user.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s what&apos;s happening across your accounts.
        </p>
      </div>

      {overdue.length > 0 && (
        <Link href="/invoices" className="mb-6 block">
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 transition-colors hover:bg-red-100/60">
            <p className="text-sm font-medium text-red-900">
              {overdue.length} overdue invoice{overdue.length === 1 ? "" : "s"} —{" "}
              {formatMoney(overdueValue)} past its due date
            </p>
            <p className="mt-0.5 text-sm text-red-700">
              Oldest: {overdue[0].customer.name} ·{" "}
              {overdue[0].dueDate ? `due ${dateFmt.format(overdue[0].dueDate)}` : "no due date"}
            </p>
          </div>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="px-5 py-4 transition-shadow hover:shadow-md">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${s.tone}`}>{s.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pipeline by stage" description="Value of open projects." />
          {pipelineValue === 0 && openProjects.length === 0 ? (
            <EmptyState title="Nothing in the pipeline" hint="Open projects show up here." />
          ) : (
            <ul className="space-y-3 p-5">
              {pipeline.map((row) => (
                <li key={row.stage}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">
                      {STAGE_LABELS[row.stage]}{" "}
                      <span className="text-slate-400">
                        · {row.count} project{row.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="font-medium tabular-nums text-slate-900">
                      {formatMoney(row.value)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${Math.round((row.value / widest) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Unpaid invoices" description="Soonest due first." />
          {unpaid.length === 0 ? (
            <EmptyState title="Nothing outstanding" hint="Every issued invoice has been settled." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {unpaid.slice(0, 5).map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        <span className="font-mono tabular-nums">{invoice.number}</span> ·{" "}
                        {invoice.customer.name}
                      </p>
                      <p
                        className={`text-xs ${
                          invoice.status === "OVERDUE" ? "font-medium text-red-600" : "text-slate-500"
                        }`}
                      >
                        {invoice.dueDate ? `due ${dateFmt.format(invoice.dueDate)}` : "no due date"}
                        {invoice.paid > 0 && ` · ${formatMoney(invoice.paid)} received`}
                      </p>
                    </div>
                    <span className="ml-4 shrink-0 text-sm font-medium tabular-nums text-slate-900">
                      {formatMoney(invoice.balance)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent customers" />
          {recentCustomers.length === 0 ? (
            <EmptyState title="No customers yet" hint="Add your first customer to get started." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentCustomers.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/customers/${c.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {c._count.contacts} contact{c._count.contacts === 1 ? "" : "s"} ·{" "}
                        {c._count.projects} project{c._count.projects === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Badge value={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Projects in flight" />
          {upcomingProjects.length === 0 ? (
            <EmptyState title="No open projects" hint="Planned and in-progress projects show up here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingProjects.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      <Link href={`/customers/${p.customer.id}`} className="hover:text-brand-600">
                        {p.customer.name}
                      </Link>
                      {p.dueDate && ` · due ${dateFmt.format(p.dueDate)}`}
                    </p>
                  </div>
                  <Badge value={p.stage} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
