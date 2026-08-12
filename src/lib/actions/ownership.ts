"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { recordAudit } from "@/lib/audit";

/** Empty string means "nobody" — unassigning is a deliberate choice, not an error. */
function ownerIdFrom(formData: FormData) {
  const raw = String(formData.get("ownerId") ?? "").trim();
  return raw === "" ? null : raw;
}

export async function setCustomerOwnerAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const ownerId = ownerIdFrom(formData);

  const customer = await prisma.customer.update({
    where: { id },
    data: { ownerId },
    select: { name: true, owner: { select: { name: true } } },
  });

  await recordAudit({
    actor: user,
    action: "assigned",
    entity: "Customer",
    entityId: id,
    summary: customer.owner
      ? `Assigned ${customer.name} to ${customer.owner.name}`
      : `Left ${customer.name} unassigned`,
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
}

export async function setProjectOwnerAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const ownerId = ownerIdFrom(formData);

  const project = await prisma.project.update({
    where: { id },
    data: { ownerId },
    select: { name: true, owner: { select: { name: true } } },
  });

  await recordAudit({
    actor: user,
    action: "assigned",
    entity: "Project",
    entityId: id,
    summary: project.owner
      ? `Assigned ${project.name} to ${project.owner.name}`
      : `Left ${project.name} unassigned`,
  });

  revalidatePath("/projects");
}
