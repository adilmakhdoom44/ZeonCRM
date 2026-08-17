import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCompany } from "@/lib/company";
import { formatMoney, totals } from "@/lib/money";
import { CADENCE_LABELS, isDue, type Cadence } from "@/lib/recurring";
import { deleteRecurringAction, toggleRecurringAction } from "@/lib/actions/recurring";
import { GenerateDueButton } from "@/components/recurring-controls";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function RecurringInvoicesPage() {
  await requireUser();

  const [schedules, company] = await Promise.all([
    prisma.recurringInvoice.findMany({
      orderBy: [{ isActive: "desc" }, { nextRunOn: "asc" }],
      include: {
        customer: { select: { id: true, name: true } },
        items: { select: { quantity: true, unitPrice: true } },
        _count: { select: { generated: true } },
      },
    }),
    getCompany(),
  ]);

  const rows = schedules.map((schedule) => ({
    ...schedule,
    value: totals(
      schedule.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
      Number(schedule.taxRate),
    ).total,
    due: schedule.isActive && isDue(schedule.nextRunOn),
  }));

  const dueNow = rows.filter((row) => row.due).length;

  return (
    <div>
      <PageHeader
        title="Repeating invoices"
        description="Retainers and anything else billed on a schedule."
        action={<LinkButton href="/invoices" variant="secondary">← All invoices</LinkButton>}
      />

      <div className="mb-4">
        <GenerateDueButton />
        {dueNow > 0 && (
          <p className="mt-2 text-sm text-amber-700">
            {dueNow} schedule{dueNow === 1 ? " is" : "s are"} due — generating raises the invoices as
            drafts for you to check.
          </p>
        )}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing repeats yet"
            hint="Open an invoice you send regularly and choose “Repeat this invoice” to turn it into a schedule."
            action={<LinkButton href="/invoices">Go to invoices</LinkButton>}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {row.title}
                    {!row.isActive && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        Paused
                      </span>
                    )}
                    {row.due && (
                      <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Due now
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <Link href={`/customers/${row.customer.id}`} className="hover:text-brand-600">
                      {row.customer.name}
                    </Link>
                    {" · "}
                    {CADENCE_LABELS[row.cadence as Cadence]}
                    {" · next "}
                    {dateFmt.format(row.nextRunOn)}
                    {row._count.generated > 0 && (
                      <>
                        {" · "}
                        {row._count.generated} raised so far
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium tabular-nums text-slate-900">
                    {formatMoney(row.value, company.currency)}
                  </span>
                  <form action={toggleRecurringAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button className="text-xs font-medium text-slate-500 hover:text-brand-600">
                      {row.isActive ? "Pause" : "Resume"}
                    </button>
                  </form>
                  <form action={deleteRecurringAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      title="Stop repeating"
                      aria-label="Stop repeating"
                      className="text-slate-300 transition-colors hover:text-red-500"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
