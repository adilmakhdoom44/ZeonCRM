"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

const itemSchema = z.object({
  description: z.string().trim().max(500),
  quantity: z.number().min(0).max(1_000_000),
  unitPrice: z.number().min(0).max(100_000_000),
});

const proposalSchema = z.object({
  customerId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(2000),
  validUntil: z.string(),
  taxRate: z.number().min(0).max(100),
  terms: z.string().trim().max(5000),
  items: z.array(itemSchema).max(100),
});

export type ProposalPayload = z.infer<typeof proposalSchema>;

/** Sequential, human-readable document number: PRO-0001, PRO-0002, … */
async function nextProposalNumber(tx: Prisma.TransactionClient) {
  const latest = await tx.proposal.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const seq = latest ? Number(latest.number.replace(/\D/g, "")) : 0;
  return `PRO-${String(seq + 1).padStart(4, "0")}`;
}

function refreshProposals(id?: string) {
  revalidatePath("/proposals");
  if (id) revalidatePath(`/proposals/${id}`);
}

export async function createProposalAction(formData: FormData) {
  await requireUser();

  const parsed = z
    .object({
      customerId: z.string().min(1),
      title: z.string().trim().min(1).max(200),
      validUntil: z.string().optional(),
    })
    .safeParse({
      customerId: formData.get("customerId"),
      title: formData.get("title"),
      validUntil: formData.get("validUntil") || undefined,
    });
  if (!parsed.success) redirect("/proposals/new?error=1");

  const proposal = await prisma.$transaction(async (tx) =>
    tx.proposal.create({
      data: {
        number: await nextProposalNumber(tx),
        customerId: parsed.data.customerId,
        title: parsed.data.title,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        items: { create: [{ description: "", quantity: 1, unitPrice: 0, position: 0 }] },
      },
    }),
  );

  refreshProposals(proposal.id);
  redirect(`/proposals/${proposal.id}`);
}

export async function saveProposalAction(id: string, payload: ProposalPayload) {
  await requireUser();

  const parsed = proposalSchema.safeParse(payload);
  if (!parsed.success) return { ok: false as const, error: "Please check the highlighted fields." };

  const { items, validUntil, summary, terms, ...rest } = parsed.data;

  await prisma.$transaction([
    prisma.proposalItem.deleteMany({ where: { proposalId: id } }),
    prisma.proposal.update({
      where: { id },
      data: {
        ...rest,
        summary: summary || null,
        terms: terms || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        items: {
          create: items.map((item, position) => ({ ...item, position })),
        },
      },
    }),
  ]);

  refreshProposals(id);
  return { ok: true as const };
}

export async function deleteProposalAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  await prisma.proposal.delete({ where: { id } });
  refreshProposals();
  redirect("/proposals");
}

export async function duplicateProposalAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const source = await prisma.proposal.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!source) redirect("/proposals");

  const copy = await prisma.$transaction(async (tx) =>
    tx.proposal.create({
      data: {
        number: await nextProposalNumber(tx),
        customerId: source.customerId,
        title: `${source.title} (copy)`,
        summary: source.summary,
        taxRate: source.taxRate,
        terms: source.terms,
        validUntil: source.validUntil,
        items: {
          create: source.items.map((item, position) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            position,
          })),
        },
      },
    }),
  );

  refreshProposals(copy.id);
  redirect(`/proposals/${copy.id}`);
}
