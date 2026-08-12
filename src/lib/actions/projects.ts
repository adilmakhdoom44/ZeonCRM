"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { recordAudit } from "@/lib/audit";

const STAGES = ["QUOTED", "CONFIRMED", "IN_PROGRESS", "REVIEW", "COMPLETED", "CANCELLED"] as const;

const projectSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  stage: z.enum(STAGES),
  price: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

function parseProject(formData: FormData) {
  const parsed = projectSchema.safeParse({
    customerId: formData.get("customerId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    stage: formData.get("stage"),
    price: formData.get("price") || undefined,
    startDate: formData.get("startDate") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return null;
  const { startDate, dueDate, price, ...rest } = parsed.data;
  const priceNum = price ? Number(price.replace(/[^0-9.]/g, "")) : null;
  return {
    ...rest,
    price: priceNum !== null && !Number.isNaN(priceNum) ? priceNum : null,
    startDate: startDate ? new Date(startDate) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
  };
}

function stageTimestamps(stage: (typeof STAGES)[number]) {
  return { completedAt: stage === "COMPLETED" ? new Date() : null };
}

function refreshProjects() {
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export async function createProjectAction(formData: FormData) {
  await requireUser();
  const data = parseProject(formData);
  if (!data) redirect("/projects/new?error=1");

  await prisma.project.create({ data: { ...data, ...stageTimestamps(data.stage) } });
  refreshProjects();
  redirect("/projects");
}

export async function updateProjectAction(id: string, formData: FormData) {
  await requireUser();
  const data = parseProject(formData);
  if (!data) redirect(`/projects/${id}/edit?error=1`);

  await prisma.project.update({ where: { id }, data: { ...data, ...stageTimestamps(data.stage) } });
  refreshProjects();
  redirect("/projects");
}

export async function deleteProjectAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));

  const project = await prisma.project.findUnique({ where: { id }, select: { name: true } });
  await prisma.project.delete({ where: { id } });

  await recordAudit({
    actor: user,
    action: "deleted",
    entity: "Project",
    entityId: id,
    summary: `Deleted ${project?.name ?? "a project"}`,
  });
  refreshProjects();
}

export async function moveProjectStageAction(projectId: string, stage: string) {
  const user = await requireUser();
  const parsed = z.enum(STAGES).safeParse(stage);
  if (!parsed.success) return;

  const before = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, stage: true },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { stage: parsed.data, ...stageTimestamps(parsed.data) },
  });

  // A drag that lands where it started is not a change worth recording.
  if (before && before.stage !== parsed.data) {
    await recordAudit({
      actor: user,
      action: "updated",
      entity: "Project",
      entityId: projectId,
      summary: `Moved ${before.name} from ${before.stage.replace("_", " ").toLowerCase()} to ${parsed.data.replace("_", " ").toLowerCase()}`,
    });
  }
  refreshProjects();
}

export async function updateProjectTermsAction(projectId: string, formData: FormData) {
  await requireUser();
  const price = String(formData.get("price") ?? "").replace(/[^0-9.]/g, "");
  const priceNum = price ? Number(price) : null;
  const dueDate = String(formData.get("dueDate") ?? "");

  await prisma.project.update({
    where: { id: projectId },
    data: {
      price: priceNum !== null && !Number.isNaN(priceNum) ? priceNum : null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  refreshProjects();
}

export async function addProjectTaskAction(projectId: string, formData: FormData) {
  await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  await prisma.projectTask.create({ data: { projectId, title } });
  refreshProjects();
}

export async function toggleProjectTaskAction(taskId: string) {
  await requireUser();
  const task = await prisma.projectTask.findUnique({ where: { id: taskId } });
  if (!task) return;

  await prisma.projectTask.update({
    where: { id: taskId },
    data: { isDone: !task.isDone },
  });
  refreshProjects();
}

export async function deleteProjectTaskAction(taskId: string) {
  await requireUser();
  await prisma.projectTask.delete({ where: { id: taskId } }).catch(() => {});
  refreshProjects();
}
