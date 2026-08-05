import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { createInvoiceAction } from "@/lib/actions/invoices";
import {
  Button,
  Card,
  EmptyState,
  Input,
  LinkButton,
  PageHeader,
  Select,
} from "@/components/ui";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; error?: string }>;
}) {
  await requireUser();
  const { customerId, error } = await searchParams;

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="New invoice"
        description="Start a draft — you will add line items next."
      />
      <Card className="p-6">
        {customers.length === 0 ? (
          <EmptyState
            title="You need a customer first"
            hint="Invoices are always billed to a customer."
            action={<LinkButton href="/customers/new">+ New customer</LinkButton>}
          />
        ) : (
          <form action={createInvoiceAction} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                Please fill in a customer and a title.
              </p>
            )}
            <Select
              label="Customer"
              name="customerId"
              defaultValue={customerId}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Input
              label="Title"
              name="title"
              placeholder="Website redesign — milestone 1"
              required
            />
            <p className="text-sm text-slate-500">
              Due 30 days from today unless you change it on the next screen.
            </p>
            <div className="flex gap-3 pt-2">
              <Button>Create draft</Button>
              <LinkButton href="/invoices" variant="secondary">
                Cancel
              </LinkButton>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
