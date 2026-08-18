import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { formatMoney } from "@/lib/money";
import { effectiveInvoiceStatus, invoiceTotals } from "@/lib/invoices";
import { PAGE_SIZE, Pagination, pageFrom } from "@/components/pagination";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const withMoney = <T extends {
  taxRate: unknown;
  items: { quantity: unknown; unitPrice: unknown }[];
  payments: { amount: unknown }[];
  status: string;
  dueDate: Date | null;
}>(invoice: T) => {
  const money = invoiceTotals(
    invoice.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    Number(invoice.taxRate),
    invoice.payments.map((p) => ({ amount: Number(p.amount) })),
  );
  return { ...invoice, ...money, status: effectiveInvoiceStatus(invoice, money.balance) };
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const { page: pageParam } = await searchParams;

  const total = await prisma.invoice.count();
  const page = pageFrom(pageParam, total);

  const [invoices, liveInvoices] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: { select: { id: true, name: true } },
        items: { select: { quantity: true, unitPrice: true } },
        payments: { select: { amount: true } },
      },
    }),
    // The totals above the table describe the whole ledger, not this page, so
    // they need their own query — narrowed to invoices that can still be owed,
    // which is a far smaller set than every invoice ever raised.
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      select: {
        status: true,
        dueDate: true,
        taxRate: true,
        items: { select: { quantity: true, unitPrice: true } },
        payments: { select: { amount: true } },
      },
    }),
  ]);

  const rows = invoices.map(withMoney);

  // What is actually owed: drafts have not been asked for yet, and a cancelled
  // invoice is not a debt.
  const awaiting = liveInvoices.map(withMoney);
  const outstanding = awaiting.reduce((sum, r) => sum + r.balance, 0);
  const overdue = awaiting.filter((r) => r.status === "OVERDUE");

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="What you have billed, and what is still owed."
        action={
          <div className="flex items-center gap-3">
            {/* A real anchor, not <Link>: this is a file download, and client-side
                navigation would try to render the CSV as a page instead. */}
            <a
              href="/invoices/export"
              download
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Export CSV
            </a>
            <LinkButton href="/invoices/recurring" variant="secondary">
              Repeating
            </LinkButton>
            <LinkButton href="/invoices/new">+ New invoice</LinkButton>
          </div>
        }
      />

      {total > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Card className="px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Outstanding</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatMoney(outstanding)}</p>
          </Card>
          <Card className="px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Overdue</p>
            <p
              className={`mt-0.5 text-lg font-semibold ${
                overdue.length > 0 ? "text-red-600" : "text-slate-900"
              }`}
            >
              {overdue.length}
            </p>
          </Card>
          <Card className="px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Invoices</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{total}</p>
          </Card>
        </div>
      )}

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            hint="Bill a customer directly, or raise one from a project or an accepted quote."
            action={<LinkButton href="/invoices/new">+ New invoice</LinkButton>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="whitespace-nowrap px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((invoice) => (
                <tr key={invoice.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="font-medium tabular-nums text-slate-900 hover:text-brand-600"
                    >
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{invoice.title}</td>
                  <td className="px-5 py-3 text-slate-500">
                    <Link href={`/customers/${invoice.customer.id}`} className="hover:text-brand-600">
                      {invoice.customer.name}
                    </Link>
                  </td>
                  <td
                    className={`px-5 py-3 ${
                      invoice.status === "OVERDUE" ? "font-medium text-red-600" : "text-slate-500"
                    }`}
                  >
                    {invoice.dueDate ? dateFmt.format(invoice.dueDate) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge value={invoice.status} />
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                    {formatMoney(invoice.total)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-900">
                    {invoice.balance > 0 ? formatMoney(invoice.balance) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
        )}
      </Card>

      <Pagination
        basePath="/invoices"
        params={new URLSearchParams()}
        page={page}
        total={total}
        noun="invoice"
      />
    </div>
  );
}
