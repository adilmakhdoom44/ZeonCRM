import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { updateCustomerAction, deleteCustomerAction } from "@/lib/actions/customers";
import { Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { CustomerForm } from "@/components/customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const action = updateCustomerAction.bind(null, id);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={`Edit ${customer.name}`} />
      <Card className="p-6">
        <CustomerForm action={action} defaults={customer} cancelHref={`/customers/${id}`} />
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Danger zone"
          description="Deleting a customer removes its contacts, addresses and projects."
        />
        <div className="px-5 py-4">
          <form action={deleteCustomerAction}>
            <input type="hidden" name="id" value={id} />
            <Button variant="danger">Delete customer</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
