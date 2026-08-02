import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { ProposalEditor, EditorProposal } from "@/components/proposal-editor";

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
    status: proposal.status,
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
