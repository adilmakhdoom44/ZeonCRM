"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { isAwaitingResponse, isEditable } from "@/lib/proposals";
import { totals } from "@/lib/money";
import { callerIp, checkRateLimit, recordAttempt, retryMessage } from "@/lib/rate-limit";

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

function refreshProposals(id?: string, shareToken?: string | null) {
  revalidatePath("/proposals");
  if (id) revalidatePath(`/proposals/${id}`);
  if (shareToken) revalidatePath(`/p/${shareToken}`);
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

  const existing = await prisma.proposal.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) return { ok: false as const, error: "This proposal no longer exists." };
  if (!isEditable(existing)) {
    return { ok: false as const, error: "Sent proposals are locked. Return it to draft to edit." };
  }

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

/** Issues the share link and puts the proposal in front of the client. */
export async function markProposalSentAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: { status: true, shareToken: true },
  });
  if (!proposal || proposal.status !== "DRAFT") return;

  const shareToken = proposal.shareToken ?? randomBytes(24).toString("base64url");

  await prisma.proposal.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date(), shareToken },
  });
  refreshProposals(id, shareToken);
}

/**
 * Back to draft so it can be edited again. The old link is revoked rather than
 * reused — whoever had it should not silently see a revised quote.
 */
export async function revertProposalToDraftAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: { shareToken: true },
  });

  await prisma.proposal.update({
    where: { id },
    data: {
      status: "DRAFT",
      shareToken: null,
      sentAt: null,
      respondedAt: null,
      respondedByName: null,
      declineNote: null,
    },
  });
  refreshProposals(id, proposal?.shareToken);
}

const responseSchema = z.object({
  decision: z.enum(["ACCEPTED", "DECLINED"]),
  name: z.string().trim().min(2).max(120),
  note: z.string().trim().max(1000).optional(),
});

/**
 * Public — reachable by anyone holding the share token, so it re-reads the
 * proposal from the token alone and refuses anything not currently awaiting a reply.
 */
export async function respondToProposalAction(
  token: string,
  payload: { decision: string; name: string; note?: string },
) {
  // This endpoint is reachable by anyone holding a link, so it gets its own
  // ceiling — enough for a client who mistypes their name, not enough to hammer.
  const ip = await callerIp();
  const allowance = await checkRateLimit({
    scope: "proposal-response:ip",
    identifier: ip,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!allowance.allowed) {
    return { ok: false as const, error: retryMessage(allowance.retryAfterSeconds) };
  }
  await recordAttempt("proposal-response:ip", ip);

  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, error: "Please enter your full name to confirm." };
  }

  const proposal = await prisma.proposal.findUnique({
    where: { shareToken: token },
    select: { id: true, status: true, validUntil: true },
  });
  if (!proposal) return { ok: false as const, error: "This link is no longer valid." };
  if (!isAwaitingResponse(proposal)) {
    return { ok: false as const, error: "This proposal is no longer awaiting a response." };
  }

  await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      status: parsed.data.decision,
      respondedAt: new Date(),
      respondedByName: parsed.data.name,
      declineNote: parsed.data.decision === "DECLINED" ? parsed.data.note || null : null,
    },
  });

  // Deliberately no revalidatePath here: any revalidation re-renders the page the
  // action was called from, which would swap out the client's confirmation panel
  // before they read it. The CRM user is in a different browser, so their pages
  // re-render on their own next request regardless.
  return { ok: true as const };
}

/**
 * Turns a won quote into the work itself: the project starts CONFIRMED at the
 * quoted total, with each line item pre-filled as a step. Guarded on ACCEPTED
 * and on not already having a project, so a double-submit cannot bill twice.
 */
export async function convertProposalToProjectAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!proposal || proposal.status !== "ACCEPTED" || proposal.projectId) {
    redirect(`/proposals/${id}`);
  }

  const { total } = totals(
    proposal.items.map((item) => ({
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
    Number(proposal.taxRate),
  );

  const steps = proposal.items
    .map((item) => item.description.trim())
    .filter(Boolean)
    .map((title) => ({ title }));

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        customerId: proposal.customerId,
        name: proposal.title,
        description: proposal.summary,
        stage: "CONFIRMED",
        // The contract value is what the client agreed to pay — tax included.
        price: total,
        startDate: new Date(),
        tasks: { create: steps },
      },
    });

    await tx.proposal.update({
      where: { id },
      data: { projectId: created.id, convertedAt: new Date() },
    });

    return created;
  });

  refreshProposals(id, proposal.shareToken);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects?focus=${project.id}`);
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
