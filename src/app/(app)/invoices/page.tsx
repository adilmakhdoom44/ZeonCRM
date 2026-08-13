import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { formatMoney } from "@/lib/money";
import { effectiveInvoiceStatus, invoiceTotals } from "@/lib/invoices";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function InvoicesPage() {
  await requireUser();

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true } },
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
    return { ...invoice, ...money, status: effectiveInvoiceStatus(invoice, money.balance) };
  });

  // What is actually owed: drafts have not been asked for yet, and a cancelled
  // invoice is not a debt.
  const awaiting = rows.filter((r) => r.status !== "DRAFT" && r.status !== "CANCELLED");
  const outstanding = awaiting.reduce((sum, r) => sum + r.balance, 0);
  const overdue = awaiting.filter((r) => r.status === "OVERDUE");

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="What you have billed, and what is still owed."
        action={<LinkButton href="/invoices/new">+ New invoice</LinkButton>}
      />

      {rows.length > 0 && (
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
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{rows.length}</p>
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
    </div>
  );
}
