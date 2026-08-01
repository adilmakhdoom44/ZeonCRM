import { Button, Input, LinkButton, Select, Textarea } from "@/components/ui";

type ProjectFormValues = {
  customerId?: string;
  name?: string;
  description?: string | null;
  status?: string;
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Status"
          name="status"
          defaultValue={defaults?.status ?? "PLANNED"}
          options={[
            { value: "PLANNED", label: "Planned" },
            { value: "IN_PROGRESS", label: "In progress" },
            { value: "ON_HOLD", label: "On hold" },
            { value: "COMPLETED", label: "Completed" },
          ]}
        />
        <Input label="Start date" name="startDate" type="date" defaultValue={toDateInput(defaults?.startDate)} />
        <Input label="Due date" name="dueDate" type="date" defaultValue={toDateInput(defaults?.dueDate)} />
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
