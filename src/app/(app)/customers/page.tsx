import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireUser();
  const { q, status } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: {
      ...(q ? { name: { contains: q } } : {}),
      ...(status && ["LEAD", "ACTIVE", "INACTIVE"].includes(status)
        ? { status: status as "LEAD" | "ACTIVE" | "INACTIVE" }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { contacts: true, projects: true } },
      contacts: { where: { isPrimary: true }, take: 1 },
    },
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="All the accounts your team works with."
        action={<LinkButton href="/customers/new">+ New customer</LinkButton>}
      />

      <form className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
        >
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Filter
        </button>
      </form>

      <Card>
        {customers.length === 0 ? (
          <EmptyState
            title={q || status ? "No customers match your filters" : "No customers yet"}
            hint={q || status ? "Try a different search." : "Create your first customer to get started."}
            action={!q && !status ? <LinkButton href="/customers/new">+ New customer</LinkButton> : undefined}
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Industry</th>
                <th className="px-5 py-3 font-medium">Primary contact</th>
                <th className="px-5 py-3 font-medium">Contacts</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-medium text-slate-900 hover:text-brand-600"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{c.industry ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {c.contacts[0]
                      ? `${c.contacts[0].firstName} ${c.contacts[0].lastName}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{c._count.contacts}</td>
                  <td className="px-5 py-3">
                    <Badge value={c.status} />
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
