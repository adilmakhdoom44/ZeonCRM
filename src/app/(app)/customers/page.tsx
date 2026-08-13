import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { deleteViewAction, saveViewAction } from "@/lib/actions/views";
import { tagChipClass } from "@/lib/tags";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

const STATUSES = ["LEAD", "ACTIVE", "INACTIVE"] as const;

const fieldCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100";

/** The filters as a query string, so a view can restore exactly this list. */
function toQuery(filters: { q?: string; status?: string; tag?: string; mine?: boolean }) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.mine) params.set("mine", "1");
  return params.toString();
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tag?: string; mine?: string }>;
}) {
  const user = await requireUser();
  const { q, status, tag, mine } = await searchParams;
  const onlyMine = mine === "1";

  const activeStatus = status && STATUSES.includes(status as (typeof STATUSES)[number])
    ? (status as (typeof STATUSES)[number])
    : undefined;

  const [customers, tags, views] = await Promise.all([
    prisma.customer.findMany({
      where: {
        ...(q
          ? { OR: [{ name: { contains: q } }, { industry: { contains: q } }] }
          : {}),
        ...(activeStatus ? { status: activeStatus } : {}),
        ...(tag ? { tags: { some: { name: tag } } } : {}),
        ...(onlyMine ? { ownerId: user.id } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { contacts: true, projects: true } },
        contacts: { where: { isPrimary: true }, take: 1 },
        tags: { orderBy: { name: "asc" } },
        owner: { select: { name: true } },
      },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { customers: true } } } }),
    prisma.savedView.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  const filtered = Boolean(q || activeStatus || tag || onlyMine);
  const currentQuery = toQuery({ q, status: activeStatus, tag, mine: onlyMine });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="All the accounts your team works with."
        action={<LinkButton href="/customers/new">+ New customer</LinkButton>}
      />

      {views.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-500">Views</span>
          {views.map((view) => {
            const active = view.query === currentQuery;
            return (
              <span
                key={view.id}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                  active
                    ? "bg-brand-50 text-brand-700 ring-brand-200"
                    : "bg-white text-slate-600 ring-slate-200"
                }`}
              >
                <Link href={`/customers${view.query ? `?${view.query}` : ""}`}>{view.name}</Link>
                <form action={deleteViewAction} className="flex">
                  <input type="hidden" name="id" value={view.id} />
                  <button
                    className="opacity-40 transition-opacity hover:opacity-100"
                    title={`Delete “${view.name}”`}
                    aria-label={`Delete ${view.name}`}
                  >
                    ✕
                  </button>
                </form>
              </span>
            );
          })}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <Link
          href="/customers"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !onlyMine
              ? "bg-ink-900 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          All accounts
        </Link>
        <Link
          href="/customers?mine=1"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            onlyMine
              ? "bg-ink-900 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          My accounts
        </Link>
      </div>

      <form className="mb-3 flex flex-wrap gap-3">
        {onlyMine && <input type="hidden" name="mine" value="1" />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name or industry…"
          className={`${fieldCls} w-64`}
        />
        <select name="status" defaultValue={activeStatus ?? ""} className={fieldCls}>
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select name="tag" defaultValue={tag ?? ""} className={fieldCls}>
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name} ({t._count.customers})
            </option>
          ))}
        </select>
        <button className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Filter
        </button>
        {filtered && (
          <Link
            href="/customers"
            className="inline-flex items-center px-2 py-2 text-sm font-medium text-slate-500 hover:text-brand-600"
          >
            Clear
          </Link>
        )}
      </form>

      {filtered && (
        <form action={saveViewAction} className="mb-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="query" value={currentQuery} />
          <input
            name="name"
            required
            placeholder="Save this filter as…"
            className={`${fieldCls} w-52 py-1.5 text-xs`}
          />
          <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Save view
          </button>
          <span className="text-xs text-slate-400">
            {customers.length} match{customers.length === 1 ? "" : "es"}
          </span>
        </form>
      )}

      <Card>
        {customers.length === 0 ? (
          <EmptyState
            title={filtered ? "No customers match your filters" : "No customers yet"}
            hint={filtered ? "Try a different search." : "Create your first customer to get started."}
            action={!filtered ? <LinkButton href="/customers/new">+ New customer</LinkButton> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Tags</th>
                <th className="px-5 py-3 font-medium">Primary contact</th>
                <th className="px-5 py-3 font-medium">Owner</th>
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
                    {c.industry && <p className="text-xs text-slate-500">{c.industry}</p>}
                  </td>
                  <td className="px-5 py-3">
                    {c.tags.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <Link
                            key={t.id}
                            href={`/customers?tag=${encodeURIComponent(t.name)}`}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tagChipClass(t.color)}`}
                          >
                            {t.name}
                          </Link>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {c.contacts[0]
                      ? `${c.contacts[0].firstName} ${c.contacts[0].lastName}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {c.owner?.name ?? <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-5 py-3">
                    <Badge value={c.status} />
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
