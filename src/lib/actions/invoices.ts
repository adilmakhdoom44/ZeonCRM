"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { isInvoiceEditable, nextInvoiceNumber } from "@/lib/invoices";

const itemSchema = z.object({
  description: z.string().trim().max(500),
  quantity: z.number().min(0).max(1_000_000),
  unitPrice: z.number().min(0).max(100_000_000),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  dueDate: z.string(),
  taxRate: z.number().min(0).max(100),
  notes: z.string().trim().max(2000),
  terms: z.string().trim().max(5000),
  items: z.array(itemSchema).max(100),
});

export type InvoicePayload = z.infer<typeof invoiceSchema>;

/** Net 30 unless the user says otherwise — the common case, not a policy. */
function defaultDueDate(from = new Date()) {
  const due = new Date(from);
  due.setDate(due.getDate() + 30);
  return due;
}

function refreshInvoices(id?: string) {
  revalidatePath("/invoices");
  if (id) revalidatePath(`/invoices/${id}`);
  revalidatePath("/dashboard");
}

export async function createInvoiceAction(formData: FormData) {
  await requireUser();

  const parsed = z
    .object({
      customerId: z.string().min(1),
      title: z.string().trim().min(1).max(200),
    })
    .safeParse({
      customerId: formData.get("customerId"),
      title: formData.get("title"),
    });
  if (!parsed.success) redirect("/invoices/new?error=1");

  const invoice = await prisma.$transaction(async (tx) =>
    tx.invoice.create({
      data: {
        number: await nextInvoiceNumber(tx),
        customerId: parsed.data.customerId,
        title: parsed.data.title,
        dueDate: defaultDueDate(),
        items: { create: [{ description: "", quantity: 1, unitPrice: 0, position: 0 }] },
      },
    }),
  );

  refreshInvoices(invoice.id);
  redirect(`/invoices/${invoice.id}`);
}

/**
 * Bills the work: one line for the project at its agreed price. The project keeps
 * its own price — an invoice is a record of what was asked for, not a mirror that
 * moves when the project does.
 */
export async function createInvoiceFromProjectAction(formData: FormData) {
  await requireUser();
  const projectId = String(formData.get("projectId"));

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, customerId: true, name: true, price: true },
  });
  if (!project) redirect("/projects");

  const invoice = await prisma.$transaction(async (tx) =>
    tx.invoice.create({
      data: {
        number: await nextInvoiceNumber(tx),
        customerId: project.customerId,
        projectId: project.id,
        title: project.name,
        dueDate: defaultDueDate(),
        items: {
          create: [
            {
              description: project.name,
              quantity: 1,
              unitPrice: project.price ?? 0,
              position: 0,
            },
          ],
        },
      },
    }),
  );

  refreshInvoices(invoice.id);
  redirect(`/invoices/${invoice.id}`);
}

/**
 * Bills the quote line for line, tax rate included, so what the client agreed to
 * is what they are asked to pay.
 */
export async function createInvoiceFromProposalAction(formData: FormData) {
  await requireUser();
  const proposalId = String(formData.get("proposalId"));

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!proposal) redirect("/proposals");

  const invoice = await prisma.$transaction(async (tx) =>
    tx.invoice.create({
      data: {
        number: await nextInvoiceNumber(tx),
        customerId: proposal.customerId,
        proposalId: proposal.id,
        projectId: proposal.projectId,
        title: proposal.title,
        taxRate: proposal.taxRate,
        terms: proposal.terms,
        dueDate: defaultDueDate(),
        items: {
          create: proposal.items.map((item, position) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            position,
          })),
        },
      },
    }),
  );

  refreshInvoices(invoice.id);
  redirect(`/invoices/${invoice.id}`);
}

export async function saveInvoiceAction(id: string, payload: InvoicePayload) {
  await requireUser();

  const parsed = invoiceSchema.safeParse(payload);
  if (!parsed.success) return { ok: false as const, error: "Please check the highlighted fields." };

  const existing = await prisma.invoice.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return { ok: false as const, error: "This invoice no longer exists." };
  if (!isInvoiceEditable(existing)) {
    return { ok: false as const, error: "Issued invoices are locked. Only drafts can be edited." };
  }

  const { items, dueDate, notes, terms, ...rest } = parsed.data;

  await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
    prisma.invoice.update({
      where: { id },
      data: {
        ...rest,
        notes: notes || null,
        terms: terms || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        items: { create: items.map((item, position) => ({ ...item, position })) },
      },
    }),
  ]);

  refreshInvoices(id);
  return { ok: true as const };
}

export async function deleteInvoiceAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  await prisma.invoice.delete({ where: { id } });
  refreshInvoices();
  redirect("/invoices");
}
