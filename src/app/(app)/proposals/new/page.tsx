import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { createProposalAction } from "@/lib/actions/proposals";
import {
  Button,
  Card,
  EmptyState,
  Input,
  LinkButton,
  PageHeader,
  Select,
} from "@/components/ui";

export default async function NewProposalPage({
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

  const defaultValidUntil = new Date();
  defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="New proposal"
        description="Start a quote — you will add line items next."
      />
      <Card className="p-6">
        {customers.length === 0 ? (
          <EmptyState
            title="You need a customer first"
            hint="Proposals are always addressed to a customer."
            action={<LinkButton href="/customers/new">+ New customer</LinkButton>}
          />
        ) : (
          <form action={createProposalAction} className="space-y-4">
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
              placeholder="Website redesign — phase 1"
              required
            />
            <Input
              label="Valid until"
              name="validUntil"
              type="date"
              defaultValue={defaultValidUntil.toISOString().slice(0, 10)}
            />
            <div className="flex gap-3 pt-2">
              <Button>Create draft</Button>
              <LinkButton href="/proposals" variant="secondary">
                Cancel
              </LinkButton>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
