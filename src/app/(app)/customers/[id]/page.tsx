import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import {
  createContactAction,
  deleteContactAction,
  addPhoneAction,
  deletePhoneAction,
  addEmailAction,
  deleteEmailAction,
} from "@/lib/actions/contacts";
import { createAddressAction, deleteAddressAction } from "@/lib/actions/addresses";
import { Badge, Button, Card, CardHeader, EmptyState, LinkButton, PageHeader } from "@/components/ui";

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100";

function IconDeleteButton() {
  return (
    <button
      className="text-slate-300 transition-colors hover:text-red-500"
      title="Remove"
      aria-label="Remove"
    >
      ✕
    </button>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
        include: { phones: true, emails: true },
      },
      addresses: true,
      projects: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!customer) notFound();

  const newContact = createContactAction.bind(null, id);
  const newAddress = createAddressAction.bind(null, id);

  return (
    <div>
      <div className="mb-1 text-sm text-slate-500">
        <Link href="/customers" className="hover:text-brand-600">
          Customers
        </Link>{" "}
        / {customer.name}
      </div>
      <PageHeader
        title={customer.name}
        description={[customer.industry, customer.website].filter(Boolean).join(" · ") || undefined}
        action={
          <div className="flex items-center gap-3">
            <Badge value={customer.status} />
            <LinkButton href={`/customers/${id}/edit`} variant="secondary">
              Edit
            </LinkButton>
          </div>
        }
      />

      {customer.notes && (
        <Card className="mb-6 px-5 py-4">
          <p className="text-sm whitespace-pre-wrap text-slate-600">{customer.notes}</p>
        </Card>
      )}

      <div className="space-y-6">
        {/* Contacts */}
        <Card>
          <CardHeader
            title="Contacts"
            description="People at this account, with their phone numbers and emails."
          />
          {customer.contacts.length === 0 && (
            <EmptyState title="No contacts yet" hint="Add the first person below." />
          )}
          <ul className="divide-y divide-slate-100">
            {customer.contacts.map((contact) => (
              <li key={contact.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {contact.firstName} {contact.lastName}
                      {contact.isPrimary && (
                        <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 ring-1 ring-inset ring-brand-100">
                          Primary
                        </span>
                      )}
                    </p>
                    {contact.title && <p className="text-xs text-slate-500">{contact.title}</p>}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Link
                      href={`/contacts/${contact.id}/edit`}
                      className="font-medium text-slate-500 hover:text-brand-600"
                    >
                      Edit
                    </Link>
                    <form action={deleteContactAction}>
                      <input type="hidden" name="id" value={contact.id} />
                      <IconDeleteButton />
                    </form>
                  </div>
                </div>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
                      Phones
                    </p>
                    <ul className="space-y-1">
                      {contact.phones.map((phone) => (
                        <li key={phone.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-slate-700">{phone.number}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{phone.label.toLowerCase()}</span>
                            <form action={deletePhoneAction}>
                              <input type="hidden" name="id" value={phone.id} />
                              <IconDeleteButton />
                            </form>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <form action={addPhoneAction.bind(null, contact.id)} className="mt-2 flex gap-2">
                      <input name="number" placeholder="Add phone…" className={`${inputCls} w-36 flex-1`} />
                      <select name="label" className={inputCls}>
                        <option value="WORK">Work</option>
                        <option value="MOBILE">Mobile</option>
                        <option value="HOME">Home</option>
                        <option value="OTHER">Other</option>
                      </select>
                      <button className="text-sm font-medium text-brand-600 hover:text-brand-700">Add</button>
                    </form>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
                      Emails
                    </p>
                    <ul className="space-y-1">
                      {contact.emails.map((email) => (
                        <li key={email.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate text-slate-700">{email.email}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{email.label.toLowerCase()}</span>
                            <form action={deleteEmailAction}>
                              <input type="hidden" name="id" value={email.id} />
                              <IconDeleteButton />
                            </form>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <form action={addEmailAction.bind(null, contact.id)} className="mt-2 flex gap-2">
                      <input
                        name="email"
                        type="email"
                        placeholder="Add email…"
                        className={`${inputCls} w-36 flex-1`}
                      />
                      <select name="label" className={inputCls}>
                        <option value="WORK">Work</option>
                        <option value="HOME">Home</option>
                        <option value="OTHER">Other</option>
                      </select>
                      <button className="text-sm font-medium text-brand-600 hover:text-brand-700">Add</button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <details className="border-t border-slate-100 px-5 py-4">
            <summary className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700">
              + Add contact
            </summary>
            <form action={newContact} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input name="firstName" required placeholder="First name *" className={inputCls} />
              <input name="lastName" required placeholder="Last name *" className={inputCls} />
              <input name="title" placeholder="Job title" className={inputCls} />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="isPrimary" className="rounded border-slate-300" />
                Primary contact
              </label>
              <input name="phone" placeholder="Phone (optional)" className={inputCls} />
              <input name="email" type="email" placeholder="Email (optional)" className={inputCls} />
              <div className="sm:col-span-2">
                <Button>Add contact</Button>
              </div>
            </form>
          </details>
        </Card>

        {/* Addresses */}
        <Card>
          <CardHeader title="Addresses" />
          {customer.addresses.length === 0 && (
            <EmptyState title="No addresses yet" hint="Add an office or billing address below." />
          )}
          <ul className="grid gap-0 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0">
            {customer.addresses.map((address) => (
              <li key={address.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="text-sm text-slate-700">
                  <p className="mb-1">
                    <Badge value={address.type} />
                  </p>
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  <p>
                    {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
                  </p>
                  <p>{address.country}</p>
                </div>
                <form action={deleteAddressAction}>
                  <input type="hidden" name="id" value={address.id} />
                  <IconDeleteButton />
                </form>
              </li>
            ))}
          </ul>

          <details className="border-t border-slate-100 px-5 py-4">
            <summary className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700">
              + Add address
            </summary>
            <form action={newAddress} className="mt-4 grid gap-3 sm:grid-cols-2">
              <select name="type" className={inputCls}>
                <option value="OFFICE">Office</option>
                <option value="BILLING">Billing</option>
                <option value="SHIPPING">Shipping</option>
                <option value="OTHER">Other</option>
              </select>
              <span />
              <input name="line1" required placeholder="Address line 1 *" className={inputCls} />
              <input name="line2" placeholder="Address line 2" className={inputCls} />
              <input name="city" required placeholder="City *" className={inputCls} />
              <input name="state" placeholder="State / region" className={inputCls} />
              <input name="postalCode" placeholder="Postal code" className={inputCls} />
              <input name="country" required placeholder="Country *" className={inputCls} />
              <div className="sm:col-span-2">
                <Button>Add address</Button>
              </div>
            </form>
          </details>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader
            title="Projects"
            action={
              <LinkButton href={`/projects/new?customerId=${id}`} variant="secondary">
                + New project
              </LinkButton>
            }
          />
          {customer.projects.length === 0 ? (
            <EmptyState title="No projects for this customer yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {customer.projects.map((project) => (
                <li key={project.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <Link
                      href={`/projects/${project.id}/edit`}
                      className="text-sm font-medium text-slate-900 hover:text-brand-600"
                    >
                      {project.name}
                    </Link>
                    {project.dueDate && (
                      <p className="text-xs text-slate-500">
                        Due {project.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <Badge value={project.stage} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
