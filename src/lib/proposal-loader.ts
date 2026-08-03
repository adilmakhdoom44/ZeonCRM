import { prisma } from "@/lib/prisma";
import { effectiveStatus } from "@/lib/proposals";
import type { DocumentProposal } from "@/components/proposal-document";

/** Loads a proposal by id (internal) or share token (public) in document shape. */
export async function loadProposalDocument(
  where: { id: string } | { shareToken: string },
): Promise<DocumentProposal | null> {
  const proposal = await prisma.proposal.findUnique({
    where,
    include: {
      items: { orderBy: { position: "asc" } },
      customer: {
        include: {
          contacts: {
            where: { isPrimary: true },
            take: 1,
            include: { emails: { take: 1 } },
          },
          addresses: true,
        },
      },
    },
  });
  if (!proposal) return null;

  const contact = proposal.customer.contacts[0];
  const address =
    proposal.customer.addresses.find((a) => a.type === "BILLING") ??
    proposal.customer.addresses.find((a) => a.type === "OFFICE") ??
    proposal.customer.addresses[0];

  return {
    number: proposal.number,
    title: proposal.title,
    summary: proposal.summary,
    status: effectiveStatus(proposal),
    issueDate: proposal.issueDate.toISOString(),
    validUntil: proposal.validUntil?.toISOString() ?? null,
    taxRate: Number(proposal.taxRate),
    terms: proposal.terms,
    respondedByName: proposal.respondedByName,
    respondedAt: proposal.respondedAt?.toISOString() ?? null,
    declineNote: proposal.declineNote,
    customer: {
      name: proposal.customer.name,
      contactName: contact ? `${contact.firstName} ${contact.lastName}` : null,
      contactEmail: contact?.emails[0]?.email ?? null,
      address: address
        ? [
            address.line1,
            address.line2,
            [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
            address.country,
          ].filter((line): line is string => Boolean(line))
        : [],
    },
    items: proposal.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  };
}
