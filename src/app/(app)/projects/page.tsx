import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCompany } from "@/lib/company";
import { LinkButton, PageHeader } from "@/components/ui";
import { KanbanBoard, KanbanProject } from "@/components/kanban";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; mine?: string }>;
}) {
  const user = await requireUser();
  const { focus, mine } = await searchParams;
  const onlyMine = mine === "1";

  const projects = await prisma.project.findMany({
    where: onlyMine ? { ownerId: user.id } : {},
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    include: {
      customer: { select: { id: true, name: true } },
      tasks: { orderBy: { createdAt: "asc" } },
      owner: { select: { name: true } },
      expenses: { orderBy: { incurredAt: "desc" } },
    },
  });

  const company = await getCompany();

  const teammates = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const board: KanbanProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    stage: p.stage,
    price: p.price === null ? null : Number(p.price),
    dueDate: p.dueDate?.toISOString() ?? null,
    completedAt: p.completedAt?.toISOString() ?? null,
    customerId: p.customer.id,
    customerName: p.customer.name,
    ownerName: p.owner?.name ?? null,
    currency: company.currency,
    expenses: p.expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      category: e.category,
      billable: e.billable,
      incurredAt: e.incurredAt.toISOString(),
    })),
    tasks: p.tasks.map((t) => ({ id: t.id, title: t.title, isDone: t.isDone })),
  }));

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Drag projects between stages, click a card for details."
        action={<LinkButton href="/projects/new">+ New project</LinkButton>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/projects"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !onlyMine
              ? "bg-ink-900 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          All projects
        </Link>
        <Link
          href="/projects?mine=1"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            onlyMine
              ? "bg-ink-900 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          My projects
        </Link>
      </div>

      <KanbanBoard projects={board} teammates={teammates} focusId={focus} />
    </div>
  );
}
