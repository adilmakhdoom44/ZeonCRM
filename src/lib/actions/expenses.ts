"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { recordAudit } from "@/lib/audit";
import { formatMoney } from "@/lib/money";
import { EXPENSE_CATEGORIES } from "@/lib/profit";

const expenseSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amount: z.number().positive().max(100_000_000),
  category: z.enum(EXPENSE_CATEGORIES),
  incurredAt: z.string(),
  billable: z.boolean(),
});

function refresh(projectId: string) {
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/reports/profitability");
  revalidatePath("/dashboard");
}

export async function addExpenseAction(projectId: string, formData: FormData) {
  const user = await requireUser();

  const parsed = expenseSchema.safeParse({
    description: formData.get("description"),
    amount: Number(String(formData.get("amount") ?? "").replace(/[^0-9.]/g, "")),
    category: formData.get("category"),
    incurredAt: formData.get("incurredAt") ?? "",
    billable: formData.get("billable") === "on",
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Give it a description and an amount above zero." };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { customerId: true, name: true },
  });
  if (!project) return { ok: false as const, error: "That project no longer exists." };

  await prisma.expense.create({
    data: {
      projectId,
      // Denormalised so a cost still belongs to an account if the project is dropped.
      customerId: project.customerId,
      description: parsed.data.description,
      amount: parsed.data.amount,
      category: parsed.data.category,
      billable: parsed.data.billable,
      incurredAt: parsed.data.incurredAt ? new Date(parsed.data.incurredAt) : new Date(),
    },
  });

  await recordAudit({
    actor: user,
    action: "created",
    entity: "Project",
    entityId: projectId,
    summary: `Logged ${formatMoney(parsed.data.amount)} of costs against ${project.name}`,
  });

  refresh(projectId);
  return { ok: true as const };
}

export async function deleteExpenseAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));

  const expense = await prisma.expense.findUnique({
    where: { id },
    select: { projectId: true, amount: true, description: true },
  });
  if (!expense) return;

  await prisma.expense.delete({ where: { id } });

  // Removing a cost changes what a job appears to have made, so it is logged.
  await recordAudit({
    actor: user,
    action: "deleted",
    entity: "Project",
    entityId: expense.projectId ?? "unassigned",
    summary: `Removed a ${formatMoney(Number(expense.amount))} cost (${expense.description})`,
  });

  if (expense.projectId) refresh(expense.projectId);
}
