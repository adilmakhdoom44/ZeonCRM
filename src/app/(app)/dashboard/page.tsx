import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();

  const [customerCount, contactCount, activeProjects, recentCustomers, upcomingProjects] =
    await Promise.all([
      prisma.customer.count(),
      prisma.contact.count(),
      prisma.project.count({ where: { stage: { in: ["QUOTED", "CONFIRMED", "IN_PROGRESS", "REVIEW"] } } }),
      prisma.customer.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { contacts: true, projects: true } } },
      }),
      prisma.project.findMany({
        where: { stage: { in: ["QUOTED", "CONFIRMED", "IN_PROGRESS", "REVIEW"] } },
        orderBy: [{ dueDate: "asc" }],
        take: 5,
        include: { customer: { select: { id: true, name: true } } },
      }),
    ]);

  const stats = [
    { label: "Customers", value: customerCount, href: "/customers" },
    { label: "Contacts", value: contactCount, href: "/customers" },
    { label: "Open projects", value: activeProjects, href: "/projects" },
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

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="px-5 py-4 transition-shadow hover:shadow-md">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{s.value}</p>
            </Card>
          </Link>
        ))}
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
                      {p.dueDate && ` · due ${p.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
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
