import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { effectiveStatus, isEditable } from "@/lib/proposals";
import { ProposalEditor, EditorProposal } from "@/components/proposal-editor";

/** Absolute origin for share links, so the copied URL works outside the app. */
async function origin() {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "";
}

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [proposal, customers] = await Promise.all([
    prisma.proposal.findUnique({
      where: { id },
      include: { items: { orderBy: { position: "asc" } } },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!proposal) notFound();

  const editorProposal: EditorProposal = {
    id: proposal.id,
    number: proposal.number,
    status: effectiveStatus(proposal),
    editable: isEditable(proposal),
    shareUrl: proposal.shareToken ? `${await origin()}/p/${proposal.shareToken}` : null,
    sentAt: proposal.sentAt?.toISOString() ?? null,
    respondedByName: proposal.respondedByName,
    respondedAt: proposal.respondedAt?.toISOString() ?? null,
    declineNote: proposal.declineNote,
    title: proposal.title,
    customerId: proposal.customerId,
    summary: proposal.summary ?? "",
    terms: proposal.terms ?? "",
    validUntil: proposal.validUntil?.toISOString().slice(0, 10) ?? "",
    taxRate: Number(proposal.taxRate),
    issueDate: proposal.issueDate.toISOString(),
    items: proposal.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  };

  return <ProposalEditor proposal={editorProposal} customers={customers} />;
}
