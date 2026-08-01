import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { updateContactAction } from "@/lib/actions/contacts";
import { Button, Card, Input, LinkButton, PageHeader, Textarea } from "@/components/ui";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { customer: { select: { id: true, name: true } } },
  });
  if (!contact) notFound();

  const action = updateContactAction.bind(null, id);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={`Edit ${contact.firstName} ${contact.lastName}`}
        description={`Contact at ${contact.customer.name}`}
      />
      <Card className="p-6">
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" name="firstName" required defaultValue={contact.firstName} />
            <Input label="Last name" name="lastName" required defaultValue={contact.lastName} />
          </div>
          <Input label="Job title" name="title" defaultValue={contact.title ?? undefined} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isPrimary"
              defaultChecked={contact.isPrimary}
              className="rounded border-slate-300"
            />
            Primary contact for this customer
          </label>
          <Textarea label="Notes" name="notes" defaultValue={contact.notes ?? undefined} />
          <div className="flex gap-3 pt-2">
            <Button>Save contact</Button>
            <LinkButton href={`/customers/${contact.customer.id}`} variant="secondary">
              Cancel
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
