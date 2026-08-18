import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCompany } from "@/lib/company";
import { formatMoney, totals } from "@/lib/money";
import { effectiveStatus } from "@/lib/proposals";
import { Badge, Card, CardHeader, EmptyState, LinkButton, PageHeader } from "@/components/ui";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const TYPE_LABELS: Record<string, string> = {
  NOTE: "Note",
  CALL: "Call",
  MEETING: "Meeting",
  EMAIL: "Email",
};

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [contact, company] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, status: true, industry: true } },
        phones: true,
        emails: true,
        // Only what was logged against this person, not the whole account.
        activities: {
          orderBy: { occurredAt: "desc" },
          take: 20,
          include: { project: { select: { name: true } }, user: { select: { name: true } } },
        },
      },
    }),
    getCompany(),
  ]);

  if (!contact) notFound();

  // Quotes addressed to this person's company, for context on what they are deciding.
  const proposals = await prisma.proposal.findMany({
    where: { customerId: contact.customerId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { items: { select: { quantity: true, unitPrice: true } } },
  });

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <div>
      <div className="mb-1 text-sm text-slate-500">
        <Link href="/customers" className="hover:text-brand-600">
          Customers
        </Link>{" "}
        /{" "}
        <Link href={`/customers/${contact.customer.id}`} className="hover:text-brand-600">
          {contact.customer.name}
        </Link>{" "}
        / {fullName}
      </div>

      <PageHeader
        title={fullName}
        description={
          [contact.title, contact.customer.industry].filter(Boolean).join(" · ") || undefined
        }
        action={
          <div className="flex items-center gap-3">
            {contact.isPrimary && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100">
                Primary contact
              </span>
            )}
            <Badge value={contact.customer.status} />
            <LinkButton href={`/contacts/${id}/edit`} variant="secondary">
              Edit
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Activity"
              description="What was logged against this person specifically."
            />
            {contact.activities.length === 0 ? (
              <EmptyState
                title="Nothing logged with them yet"
                hint="Calls and meetings tied to this person appear here. Log them from the account page."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {contact.activities.map((activity) => (
                  <li key={activity.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {TYPE_LABELS[activity.type] ?? activity.type}
                      </span>
                      <p className="text-sm font-medium text-slate-900">{activity.subject}</p>
                    </div>
                    {activity.body && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                        {activity.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {dateFmt.format(activity.occurredAt)}
                      {activity.project && <> · {activity.project.name}</>}
                      {activity.user && <> · logged by {activity.user.name}</>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Quotes for this account"
              description="What their company is currently deciding on."
            />
            {proposals.length === 0 ? (
              <EmptyState title="No quotes for this account yet" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {proposals.map((proposal) => (
                  <li key={proposal.id}>
                    <Link
                      href={`/proposals/${proposal.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          <span className="font-mono tabular-nums">{proposal.number}</span> ·{" "}
                          {proposal.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {dateFmt.format(proposal.issueDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Badge value={effectiveStatus(proposal)} />
                        <span className="text-sm font-medium tabular-nums text-slate-900">
                          {formatMoney(
                            totals(
                              proposal.items.map((i) => ({
                                quantity: Number(i.quantity),
                                unitPrice: Number(i.unitPrice),
                              })),
                              Number(proposal.taxRate),
                            ).total,
                            company.currency,
                          )}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20">
          <Card>
            <CardHeader title="Get in touch" />
            <div className="space-y-4 p-5">
              {contact.emails.length === 0 && contact.phones.length === 0 && (
                <p className="text-sm text-slate-500">
                  No phone number or email address on file.
                </p>
              )}
              {contact.emails.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
                    Email
                  </p>
                  <ul className="space-y-1">
                    {contact.emails.map((email) => (
                      <li key={email.id} className="flex items-center justify-between gap-2 text-sm">
                        <a
                          href={`mailto:${email.email}`}
                          className="truncate text-slate-700 hover:text-brand-600"
                        >
                          {email.email}
                        </a>
                        <span className="shrink-0 text-xs text-slate-400">
                          {email.label.toLowerCase()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {contact.phones.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
                    Phone
                  </p>
                  <ul className="space-y-1">
                    {contact.phones.map((phone) => (
                      <li key={phone.id} className="flex items-center justify-between gap-2 text-sm">
                        <a
                          href={`tel:${phone.number.replace(/[^\d+]/g, "")}`}
                          className="text-slate-700 hover:text-brand-600"
                        >
                          {phone.number}
                        </a>
                        <span className="shrink-0 text-xs text-slate-400">
                          {phone.label.toLowerCase()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {contact.notes && (
            <Card>
              <CardHeader title="Notes" />
              <p className="whitespace-pre-wrap px-5 pb-5 text-sm text-slate-600">
                {contact.notes}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
