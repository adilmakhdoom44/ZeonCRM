import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { deleteProjectAction } from "@/lib/actions/projects";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

export default async function ProjectsPage() {
  await requireUser();

  const projects = await prisma.project.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: { customer: { select: { id: true, name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Work you're delivering for customers."
        action={<LinkButton href="/projects/new">+ New project</LinkButton>}
      />

      <Card>
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            hint="Create a project and link it to a customer."
            action={<LinkButton href="/projects/new">+ New project</LinkButton>}
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Timeline</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/projects/${p.id}/edit`}
                      className="font-medium text-slate-900 hover:text-brand-600"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/customers/${p.customer.id}`} className="text-slate-500 hover:text-brand-600">
                      {p.customer.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {p.startDate
                      ? p.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                    {" → "}
                    {p.dueDate
                      ? p.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge value={p.status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={deleteProjectAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs font-medium text-slate-400 hover:text-red-500">
                        Delete
                      </button>
                    </form>
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
