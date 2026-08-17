"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { recordAudit } from "@/lib/audit";
import { nextInvoiceNumber } from "@/lib/invoices";
import { CADENCES, addDays, isDue, nextRun, type Cadence } from "@/lib/recurring";

function refresh(id?: string) {
  revalidatePath("/invoices/recurring");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/invoices/recurring/${id}`);
}

const scheduleSchema = z.object({
  cadence: z.enum(CADENCES),
  startOn: z.string().min(1),
  dueInDays: z.number().int().min(0).max(365),
});

/**
 * Turns an invoice you have already written into a standing arrangement. The
 * line items are copied, not referenced: editing or deleting this invoice later
 * must not change what gets billed next month.
 */
export async function createRecurringFromInvoiceAction(formData: FormData) {
  const user = await requireUser();
  const invoiceId = String(formData.get("invoiceId"));

  const parsed = scheduleSchema.safeParse({
    cadence: formData.get("cadence"),
    startOn: formData.get("startOn") ?? "",
    dueInDays: Number(formData.get("dueInDays") ?? 30),
  });
  if (!parsed.success) return { ok: false as const, error: "Pick a cadence and a first date." };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!invoice) return { ok: false as const, error: "That invoice no longer exists." };

  const schedule = await prisma.recurringInvoice.create({
    data: {
      customerId: invoice.customerId,
      title: invoice.title,
      taxRate: invoice.taxRate,
      notes: invoice.notes,
      terms: invoice.terms,
      cadence: parsed.data.cadence as Cadence,
      dueInDays: parsed.data.dueInDays,
      nextRunOn: new Date(parsed.data.startOn),
      items: {
        create: invoice.items.map((item, position) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          position,
        })),
      },
    },
  });

  await recordAudit({
    actor: user,
    action: "created",
    entity: "Invoice",
    entityId: schedule.id,
    summary: `Set up a repeating invoice for ${invoice.title}`,
  });

  refresh();
  redirect("/invoices/recurring");
}

export async function toggleRecurringAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));

  const existing = await prisma.recurringInvoice.findUnique({
    where: { id },
    select: { isActive: true, title: true },
  });
  if (!existing) return;

  await prisma.recurringInvoice.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  await recordAudit({
    actor: user,
    action: "updated",
    entity: "Invoice",
    entityId: id,
    summary: `${existing.isActive ? "Paused" : "Resumed"} the repeating invoice for ${existing.title}`,
  });

  refresh(id);
}

export async function deleteRecurringAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));

  const existing = await prisma.recurringInvoice.findUnique({
    where: { id },
    select: { title: true },
  });
  await prisma.recurringInvoice.delete({ where: { id } });

  await recordAudit({
    actor: user,
    action: "deleted",
    entity: "Invoice",
    entityId: id,
    summary: `Stopped the repeating invoice for ${existing?.title ?? "a customer"}`,
  });

  refresh();
}

/**
 * Raises an invoice for every schedule that has come due, then moves each one
 * on. Invoices arrive as drafts on purpose: a bill going out to a client should
 * be something a person chose to send, not something that happened overnight.
 *
 * Catching up matters as much as keeping up — a schedule left alone for three
 * months owes three invoices, so each one loops until it is back in the future
 * rather than skipping the months nobody was watching.
 */
export async function generateDueInvoicesAction() {
  const user = await requireUser();

  const due = await prisma.recurringInvoice.findMany({
    where: { isActive: true },
    include: { items: { orderBy: { position: "asc" } } },
  });

  let created = 0;

  for (const schedule of due) {
    let cursor = schedule.nextRunOn;
    const anchorDay = schedule.nextRunOn.getDate();

    while (isDue(cursor)) {
      await prisma.$transaction(async (tx) => {
        await tx.invoice.create({
          data: {
            number: await nextInvoiceNumber(tx),
            customerId: schedule.customerId,
            recurringInvoiceId: schedule.id,
            title: schedule.title,
            taxRate: schedule.taxRate,
            notes: schedule.notes,
            terms: schedule.terms,
            issueDate: cursor,
            dueDate: addDays(cursor, schedule.dueInDays),
            items: {
              create: schedule.items.map((item, position) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                position,
              })),
            },
          },
        });
      });

      created += 1;
      cursor = nextRun(cursor, schedule.cadence as Cadence, anchorDay);
    }

    if (cursor.getTime() !== schedule.nextRunOn.getTime()) {
      await prisma.recurringInvoice.update({
        where: { id: schedule.id },
        data: { nextRunOn: cursor, lastRunOn: new Date() },
      });
    }
  }

  if (created > 0) {
    await recordAudit({
      actor: user,
      action: "created",
      entity: "Invoice",
      entityId: "recurring-run",
      summary: `Generated ${created} invoice${created === 1 ? "" : "s"} from repeating schedules`,
    });
  }

  refresh();
  return { ok: true as const, created };
}
