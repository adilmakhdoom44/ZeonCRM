import { Button, Input, LinkButton, Select, Textarea } from "@/components/ui";

type CustomerFormValues = {
  name?: string;
  industry?: string | null;
  website?: string | null;
  notes?: string | null;
  status?: string;
};

export function CustomerForm({
  action,
  defaults,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<void>;
  defaults?: CustomerFormValues;
  cancelHref: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <Input label="Name" name="name" required defaultValue={defaults?.name} placeholder="Acme Inc." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Industry"
          name="industry"
          defaultValue={defaults?.industry ?? undefined}
          placeholder="e.g. Healthcare"
        />
        <Select
          label="Status"
          name="status"
          defaultValue={defaults?.status ?? "LEAD"}
          options={[
            { value: "LEAD", label: "Lead" },
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ]}
        />
      </div>
      <Input
        label="Website"
        name="website"
        defaultValue={defaults?.website ?? undefined}
        placeholder="https://…"
      />
      <Textarea label="Notes" name="notes" defaultValue={defaults?.notes ?? undefined} rows={4} />
      <div className="flex gap-3 pt-2">
        <Button>Save customer</Button>
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
