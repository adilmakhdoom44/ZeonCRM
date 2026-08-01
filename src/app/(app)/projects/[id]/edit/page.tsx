import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { updateProjectAction } from "@/lib/actions/projects";
import { Card, PageHeader } from "@/components/ui";
import { ProjectForm } from "@/components/project-form";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [project, customers] = await Promise.all([
    prisma.project.findUnique({ where: { id } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!project) notFound();

  const action = updateProjectAction.bind(null, id);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={`Edit ${project.name}`} />
      <Card className="p-6">
        <ProjectForm
          action={action}
          customers={customers}
          defaults={{ ...project, price: project.price === null ? null : Number(project.price) }}
          cancelHref="/projects"
        />
      </Card>
    </div>
  );
}
