import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { LinkButton, PageHeader } from "@/components/ui";
import { KanbanBoard, KanbanProject } from "@/components/kanban";

export default async function ProjectsPage() {
  await requireUser();

  const projects = await prisma.project.findMany({
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    include: {
      customer: { select: { id: true, name: true } },
      tasks: { orderBy: { createdAt: "asc" } },
    },
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
    tasks: p.tasks.map((t) => ({ id: t.id, title: t.title, isDone: t.isDone })),
  }));

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Drag projects between stages, click a card for details."
        action={<LinkButton href="/projects/new">+ New project</LinkButton>}
      />
      <KanbanBoard projects={board} />
    </div>
  );
}
