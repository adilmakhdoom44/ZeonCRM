import { Button, Input, LinkButton, Select, Textarea } from "@/components/ui";

type ProjectFormValues = {
  customerId?: string;
  name?: string;
  description?: string | null;
  stage?: string;
  price?: number | string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
};

function toDateInput(d?: Date | null) {
  return d ? d.toISOString().slice(0, 10) : undefined;
}

export function ProjectForm({
  action,
  customers,
  defaults,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<void>;
  customers: { id: string; name: string }[];
  defaults?: ProjectFormValues;
  cancelHref: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <Select
        label="Customer"
        name="customerId"
        defaultValue={defaults?.customerId}
        options={customers.map((c) => ({ value: c.id, label: c.name }))}
      />
      <Input label="Project name" name="name" required defaultValue={defaults?.name} />
      <Textarea label="Description" name="description" defaultValue={defaults?.description ?? undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Stage"
          name="stage"
          defaultValue={defaults?.stage ?? "QUOTED"}
          options={[
            { value: "QUOTED", label: "Quoted" },
            { value: "CONFIRMED", label: "Confirmed" },
            { value: "IN_PROGRESS", label: "In progress" },
            { value: "REVIEW", label: "Review" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
        />
        <Input
          label="Fixed price (USD)"
          name="price"
          defaultValue={defaults?.price != null ? String(defaults.price) : undefined}
          placeholder="e.g. 12000"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Start date" name="startDate" type="date" defaultValue={toDateInput(defaults?.startDate)} />
        <Input label="Deadline" name="dueDate" type="date" defaultValue={toDateInput(defaults?.dueDate)} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button>Save project</Button>
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
