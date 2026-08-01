"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

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
  await requireUser();
  const data = parseCustomer(formData);
  if (!data) redirect("/customers/new?error=1");

  const customer = await prisma.customer.create({ data });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomerAction(id: string, formData: FormData) {
  await requireUser();
  const data = parseCustomer(formData);
  if (!data) redirect(`/customers/${id}/edit?error=1`);

  await prisma.customer.update({ where: { id }, data });
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomerAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  redirect("/customers");
}
