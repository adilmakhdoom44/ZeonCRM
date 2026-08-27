import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { updateCustomerAction } from "@/lib/actions/customers";
import { Card, PageHeader } from "@/components/ui";
import { CustomerForm } from "@/components/customer-form";
import { DeleteCustomer } from "@/components/delete-customer";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          contacts: true,
          addresses: true,
          projects: true,
          proposals: true,
          invoices: true,
          expenses: true,
          activities: true,
          recurring: true,
        },
      },
    },
  });
  if (!customer) notFound();

  // Payments hang off invoices rather than the customer, so they need counting
  // separately — and they are the part most worth warning about.
  const payments = await prisma.payment.count({
    where: { invoice: { customerId: id } },
  });

  const action = updateCustomerAction.bind(null, id);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={`Edit ${customer.name}`} />
      <Card className="p-6">
        <CustomerForm action={action} defaults={customer} cancelHref={`/customers/${id}`} />
      </Card>

      <DeleteCustomer
        id={id}
        name={customer.name}
        impact={{
          contacts: customer._count.contacts,
          addresses: customer._count.addresses,
          projects: customer._count.projects,
          proposals: customer._count.proposals,
          invoices: customer._count.invoices,
          payments,
          expenses: customer._count.expenses,
          activities: customer._count.activities,
          recurring: customer._count.recurring,
        }}
      />
    </div>
  );
}
