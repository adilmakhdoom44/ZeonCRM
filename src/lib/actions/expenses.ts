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

/**
 * Puts a project's rechargeable costs onto one of its draft invoices.
 *
 * Only draft invoices: an issued one is locked, and quietly growing a document
 * the client already has would be worse than refusing. Only costs not already
 * recharged, so nothing is billed twice. Each becomes its own line, because a
 * client querying a bill wants to see what the £340 was, not a lump labelled
 * "expenses".
 */
export async function rechargeCostsAction(formData: FormData) {
  const user = await requireUser();
  const invoiceId = String(formData.get("invoiceId"));

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, number: true, projectId: true, customerId: true, items: { select: { id: true } } },
  });
  if (!invoice) return { ok: false as const, error: "That invoice no longer exists." };
  if (invoice.status !== "DRAFT") {
    return { ok: false as const, error: "Only a draft invoice can take new lines." };
  }

  // Scoped to the project where the invoice has one, otherwise the account.
  const scope = invoice.projectId
    ? { projectId: invoice.projectId }
    : { customerId: invoice.customerId };

  const costs = await prisma.expense.findMany({
    where: { ...scope, billable: true, rechargedOnInvoiceId: null },
    orderBy: { incurredAt: "asc" },
  });

  if (costs.length === 0) {
    return { ok: false as const, error: "No rechargeable costs are waiting to be billed." };
  }

  const total = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
  let position = invoice.items.length;

  await prisma.$transaction(async (tx) => {
    for (const cost of costs) {
      await tx.invoiceItem.create({
        data: {
          invoiceId,
          description: cost.description,
          quantity: 1,
          unitPrice: cost.amount,
          position: position++,
        },
      });
    }
    await tx.expense.updateMany({
      where: { id: { in: costs.map((cost) => cost.id) } },
      data: { rechargedOnInvoiceId: invoiceId },
    });
  });

  await recordAudit({
    actor: user,
    action: "updated",
    entity: "Invoice",
    entityId: invoiceId,
    summary: `Recharged ${costs.length} cost${costs.length === 1 ? "" : "s"} (${formatMoney(total)}) onto ${invoice.number}`,
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/reports/profitability");
  if (invoice.projectId) refresh(invoice.projectId);

  return { ok: true as const, count: costs.length, total };
}
