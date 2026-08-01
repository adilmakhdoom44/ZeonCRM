"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

const addressSchema = z.object({
  type: z.enum(["BILLING", "SHIPPING", "OFFICE", "OTHER"]),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(1),
});

function parseAddress(formData: FormData) {
  const parsed = addressSchema.safeParse({
    type: formData.get("type"),
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    state: formData.get("state") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    country: formData.get("country"),
  });
  return parsed.success ? parsed.data : null;
}

export async function createAddressAction(customerId: string, formData: FormData) {
  await requireUser();
  const data = parseAddress(formData);
  if (!data) redirect(`/customers/${customerId}?error=address`);

  await prisma.address.create({ data: { ...data, customerId } });
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function deleteAddressAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));
  const address = await prisma.address.findUnique({ where: { id } });
  if (address) {
    await prisma.address.delete({ where: { id } });
    revalidatePath(`/customers/${address.customerId}`);
  }
}
