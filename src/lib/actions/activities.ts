"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

const TYPES = ["NOTE", "CALL", "MEETING", "EMAIL"] as const;

const activitySchema = z.object({
  type: z.enum(TYPES),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().max(5000),
  occurredAt: z.string(),
  contactId: z.string(),
  projectId: z.string(),
  followUpAt: z.string(),
});

function refresh(customerId: string) {
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/dashboard");
}

export async function logActivityAction(customerId: string, formData: FormData) {
  const user = await requireUser();

  const parsed = activitySchema.safeParse({
    type: formData.get("type"),
    subject: formData.get("subject"),
    body: formData.get("body") ?? "",
    occurredAt: formData.get("occurredAt") ?? "",
    contactId: formData.get("contactId") ?? "",
    projectId: formData.get("projectId") ?? "",
    followUpAt: formData.get("followUpAt") ?? "",
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Give the entry a subject before saving it." };
  }

  const { subject, body, occurredAt, contactId, projectId, followUpAt, type } = parsed.data;

  await prisma.activity.create({
    data: {
      customerId,
      userId: user.id,
      type,
      subject,
      body: body || null,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      contactId: contactId || null,
      projectId: projectId || null,
      followUpAt: followUpAt ? new Date(followUpAt) : null,
    },
  });

  refresh(customerId);
  return { ok: true as const };
}

export async function completeFollowUpAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const activity = await prisma.activity.update({
    where: { id },
    data: { followUpDoneAt: new Date() },
    select: { customerId: true },
  });

  refresh(activity.customerId);
}

export async function reopenFollowUpAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const activity = await prisma.activity.update({
    where: { id },
    data: { followUpDoneAt: null },
    select: { customerId: true },
  });

  refresh(activity.customerId);
}

export async function deleteActivityAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const activity = await prisma.activity.delete({
    where: { id },
    select: { customerId: true },
  });

  refresh(activity.customerId);
}
