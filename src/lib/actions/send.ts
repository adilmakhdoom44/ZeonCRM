"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { formatMoney, totals } from "@/lib/money";
import { invoiceTotals } from "@/lib/invoices";
import { invoiceEmail, proposalEmail, sendEmail } from "@/lib/email";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function baseUrl() {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** The primary contact's address, falling back to any address we hold. */
function recipientFrom(contacts: { firstName: string; emails: { email: string }[] }[]) {
  for (const contact of contacts) {
    const email = contact.emails[0]?.email;
    if (email) return { email, name: contact.firstName };
  }
  return null;
}

/**
 * Every send is written to the customer's timeline. An email that left the app
 * is a thing that happened to the account, and it should be visible next to the
 * calls and meetings rather than only in a provider's dashboard.
 */
async function logSend({
  customerId,
  subject,
  body,
  userId,
}: {
  customerId: string;
  subject: string;
  body: string;
  userId?: string;
}) {
  await prisma.activity.create({
    data: { customerId, userId: userId ?? null, type: "EMAIL", subject, body },
  });
  revalidatePath(`/customers/${customerId}`);
}

export async function emailProposalAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      items: true,
      customer: {
        include: {
          contacts: {
            orderBy: { isPrimary: "desc" },
            include: { emails: { take: 1 } },
          },
        },
      },
    },
  });
  if (!proposal) return { ok: false as const, error: "This proposal no longer exists." };

  const recipient = recipientFrom(proposal.customer.contacts);
  if (!recipient) {
    return {
      ok: false as const,
      error: `${proposal.customer.name} has no contact with an email address.`,
    };
  }

  // Sending implies issuing it: a client cannot open a quote with no share token.
  const shareToken = proposal.shareToken ?? randomBytes(24).toString("base64url");
  if (proposal.status === "DRAFT" || !proposal.shareToken) {
    await prisma.proposal.update({
      where: { id },
      data: {
        shareToken,
        ...(proposal.status === "DRAFT" ? { status: "SENT", sentAt: new Date() } : {}),
      },
    });
  }

  const { total } = totals(
    proposal.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    Number(proposal.taxRate),
  );

  const { subject, html } = await proposalEmail({
    contactName: recipient.name,
    number: proposal.number,
    title: proposal.title,
    total: formatMoney(total),
    shareUrl: `${baseUrl()}/p/${shareToken}`,
  });

  const result = await sendEmail({ to: recipient.email, subject, html });
  if (!result.ok) return { ok: false as const, error: result.error };

  await logSend({
    customerId: proposal.customerId,
    userId: user.id,
    subject: `Proposal ${proposal.number} sent to ${recipient.email}`,
    body: result.delivered
      ? `${proposal.title} — ${formatMoney(total)}.`
      : `${proposal.title} — ${formatMoney(total)}. Composed but NOT delivered: no email provider is configured.`,
  });

  revalidatePath(`/proposals/${id}`);
  revalidatePath("/proposals");

  return { ok: true as const, delivered: result.delivered, to: recipient.email };
}

export async function emailInvoiceAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { select: { amount: true } },
      customer: {
        include: {
          contacts: {
            orderBy: { isPrimary: "desc" },
            include: { emails: { take: 1 } },
          },
        },
      },
    },
  });
  if (!invoice) return { ok: false as const, error: "This invoice no longer exists." };

  const recipient = recipientFrom(invoice.customer.contacts);
  if (!recipient) {
    return {
      ok: false as const,
      error: `${invoice.customer.name} has no contact with an email address.`,
    };
  }

  const money = invoiceTotals(
    invoice.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    Number(invoice.taxRate),
    invoice.payments.map((p) => ({ amount: Number(p.amount) })),
  );

  const { subject, html } = await invoiceEmail({
    contactName: recipient.name,
    number: invoice.number,
    title: invoice.title,
    amountDue: formatMoney(money.balance),
    dueDate: invoice.dueDate ? dateFmt.format(invoice.dueDate) : null,
    viewUrl: `${baseUrl()}/invoices/${invoice.id}/print`,
  });

  const result = await sendEmail({ to: recipient.email, subject, html });
  if (!result.ok) return { ok: false as const, error: result.error };

  // Sending an invoice issues it — a draft the client has been asked to pay is
  // no longer a draft.
  if (invoice.status === "DRAFT") {
    await prisma.invoice.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  await logSend({
    customerId: invoice.customerId,
    userId: user.id,
    subject: `Invoice ${invoice.number} sent to ${recipient.email}`,
    body: result.delivered
      ? `${formatMoney(money.balance)} due.`
      : `${formatMoney(money.balance)} due. Composed but NOT delivered: no email provider is configured.`,
  });

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");

  return { ok: true as const, delivered: result.delivered, to: recipient.email };
}
