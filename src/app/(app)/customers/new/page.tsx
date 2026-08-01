import { createCustomerAction } from "@/lib/actions/customers";
import { requireUser } from "@/lib/authz";
import { Card, PageHeader } from "@/components/ui";
import { CustomerForm } from "@/components/customer-form";

export default async function NewCustomerPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New customer" description="Add an account to your CRM." />
      <Card className="p-6">
        <CustomerForm action={createCustomerAction} cancelHref="/customers" />
      </Card>
    </div>
  );
}
