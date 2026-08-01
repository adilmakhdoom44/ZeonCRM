import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { createProjectAction } from "@/lib/actions/projects";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ProjectForm } from "@/components/project-form";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  await requireUser();
  const { customerId } = await searchParams;

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New project" description="Link a piece of work to a customer." />
      <Card className="p-6">
        {customers.length === 0 ? (
          <EmptyState
            title="You need a customer first"
            hint="Projects belong to customers."
            action={<LinkButton href="/customers/new">+ New customer</LinkButton>}
          />
        ) : (
          <ProjectForm
            action={createProjectAction}
            customers={customers}
            defaults={{ customerId }}
            cancelHref="/projects"
          />
        )}
      </Card>
    </div>
  );
}
