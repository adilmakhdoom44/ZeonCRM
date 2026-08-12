"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { recordAudit } from "@/lib/audit";

const customerSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]),
});

function parseCustomer(formData: FormData) {
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
    website: formData.get("website") || undefined,
    notes: formData.get("notes") || undefined,
    status: formData.get("status"),
  });
  return parsed.success ? parsed.data : null;
}

export async function createCustomerAction(formData: FormData) {
  const user = await requireUser();
  const data = parseCustomer(formData);
  if (!data) redirect("/customers/new?error=1");

  // New accounts belong to whoever added them until someone says otherwise.
  const customer = await prisma.customer.create({ data: { ...data, ownerId: user.id } });
  await recordAudit({
    actor: user,
    action: "created",
    entity: "Customer",
    entityId: customer.id,
    summary: `Added ${customer.name}`,
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomerAction(id: string, formData: FormData) {
  const user = await requireUser();
  const data = parseCustomer(formData);
  if (!data) redirect(`/customers/${id}/edit?error=1`);

  const before = await prisma.customer.findUnique({ where: { id }, select: { status: true } });
  const customer = await prisma.customer.update({ where: { id }, data });

  await recordAudit({
    actor: user,
    action: "updated",
    entity: "Customer",
    entityId: id,
    summary:
      before && before.status !== customer.status
        ? `Moved ${customer.name} from ${before.status.toLowerCase()} to ${customer.status.toLowerCase()}`
        : `Edited ${customer.name}`,
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomerAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));

  // Read the name before it is gone — the log has to say what was deleted.
  const customer = await prisma.customer.findUnique({ where: { id }, select: { name: true } });
  await prisma.customer.delete({ where: { id } });

  await recordAudit({
    actor: user,
    action: "deleted",
    entity: "Customer",
    entityId: id,
    summary: `Deleted ${customer?.name ?? "a customer"}`,
  });

  revalidatePath("/customers");
  redirect("/customers");
}
