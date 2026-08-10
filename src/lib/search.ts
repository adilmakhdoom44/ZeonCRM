import { prisma } from "@/lib/prisma";

export type SearchHit = {
  kind: "Customer" | "Contact" | "Project" | "Proposal" | "Invoice";
  href: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
};

/**
 * One query across everything worth finding by name. Deliberately not a
 * full-text index: at this size a set of LIKE lookups is faster to run and far
 * easier to reason about than keeping an index in sync.
 */
export async function search(term: string, take = 5): Promise<SearchHit[]> {
  const q = term.trim();
  if (q.length < 2) return [];

  const [customers, contacts, projects, proposals, invoices] = await Promise.all([
    prisma.customer.findMany({
      where: { OR: [{ name: { contains: q } }, { industry: { contains: q } }] },
      take,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { emails: { some: { email: { contains: q } } } },
          { phones: { some: { number: { contains: q } } } },
        ],
      },
      take,
      include: { customer: { select: { id: true, name: true } } },
    }),
    prisma.project.findMany({
      where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
      take,
      include: { customer: { select: { name: true } } },
    }),
    prisma.proposal.findMany({
      where: { OR: [{ title: { contains: q } }, { number: { contains: q } }] },
      take,
      include: { customer: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      where: { OR: [{ title: { contains: q } }, { number: { contains: q } }] },
      take,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  return [
    ...customers.map((c) => ({
      kind: "Customer" as const,
      href: `/customers/${c.id}`,
      title: c.name,
      subtitle: c.industry,
      badge: c.status,
    })),
    ...contacts.map((c) => ({
      kind: "Contact" as const,
      // Contacts have no page of their own — their account is the useful destination.
      href: `/customers/${c.customer.id}`,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: [c.title, c.customer.name].filter(Boolean).join(" · ") || null,
      badge: null,
    })),
    ...projects.map((p) => ({
      kind: "Project" as const,
      href: `/projects?focus=${p.id}`,
      title: p.name,
      subtitle: p.customer.name,
      badge: p.stage,
    })),
    ...proposals.map((p) => ({
      kind: "Proposal" as const,
      href: `/proposals/${p.id}`,
      title: `${p.number} · ${p.title}`,
      subtitle: p.customer.name,
      badge: p.status,
    })),
    ...invoices.map((i) => ({
      kind: "Invoice" as const,
      href: `/invoices/${i.id}`,
      title: `${i.number} · ${i.title}`,
      subtitle: i.customer.name,
      badge: i.status,
    })),
  ];
}
