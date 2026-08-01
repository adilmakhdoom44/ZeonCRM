"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

const projectSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

function parseProject(formData: FormData) {
  const parsed = projectSchema.safeParse({
    customerId: formData.get("customerId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    status: formData.get("status"),
    startDate: formData.get("startDate") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return null;
  const { startDate, dueDate, ...rest } = parsed.data;
  return {
    ...rest,
    startDate: startDate ? new Date(startDate) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
  };
}

export async function createProjectAction(formData: FormData) {
  await requireUser();
  const data = parseProject(formData);
  if (!data) redirect("/projects/new?error=1");

  await prisma.project.create({ data });
  revalidatePath("/projects");
  redirect("/projects");
}

export async function updateProjectAction(id: string, formData: FormData) {
  await requireUser();
  const data = parseProject(formData);
  if (!data) redirect(`/projects/${id}/edit?error=1`);

  await prisma.project.update({ where: { id }, data });
  revalidatePath("/projects");
  redirect("/projects");
}

export async function deleteProjectAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));
  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
}
