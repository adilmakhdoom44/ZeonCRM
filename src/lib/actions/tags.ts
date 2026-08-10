"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { colorForTag } from "@/lib/tags";

const nameSchema = z.string().trim().min(1).max(40);

function refresh(customerId?: string) {
  revalidatePath("/customers");
  if (customerId) revalidatePath(`/customers/${customerId}`);
}

/**
 * Tags are created by naming them — there is no separate "manage tags" step.
 * An existing tag with the same name is reused rather than duplicated, so two
 * people typing "enterprise" end up on the same tag.
 */
export async function addTagToCustomerAction(customerId: string, formData: FormData) {
  await requireUser();

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return;

  const name = parsed.data;

  const tag = await prisma.tag.upsert({
    where: { name },
    update: {},
    create: { name, color: colorForTag(name) },
  });

  await prisma.customer.update({
    where: { id: customerId },
    data: { tags: { connect: { id: tag.id } } },
  });

  refresh(customerId);
}

export async function removeTagFromCustomerAction(formData: FormData) {
  await requireUser();
  const customerId = String(formData.get("customerId"));
  const tagId = String(formData.get("tagId"));

  await prisma.customer.update({
    where: { id: customerId },
    data: { tags: { disconnect: { id: tagId } } },
  });

  refresh(customerId);
}
