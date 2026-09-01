import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { effectiveInvoiceStatus, invoiceTotals, isInvoiceEditable } from "@/lib/invoices";
import { getCompany } from "@/lib/company";
import { InvoiceEditor, EditorInvoice } from "@/components/invoice-editor";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [invoice, customers] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        items: { orderBy: { position: "asc" } },
        payments: { orderBy: { receivedAt: "desc" } },
        project: { select: { name: true } },
        proposal: { select: { number: true } },
      },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!invoice) notFound();

  const company = await getCompany();

  // Same scope the recharge action uses: the project if there is one, else the account.
  const waitingCosts = await prisma.expense.findMany({
    where: {
      billable: true,
      rechargedOnInvoiceId: null,
      ...(invoice.projectId ? { projectId: invoice.projectId } : { customerId: invoice.customerId }),
    },
    select: { amount: true },
  });

  const money = invoiceTotals(
    invoice.items.map((i) => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    Number(invoice.taxRate),
    invoice.payments.map((p) => ({ amount: Number(p.amount) })),
  );

  const editorInvoice: EditorInvoice = {
    id: invoice.id,
    number: invoice.number,
    status: effectiveInvoiceStatus(invoice, money.balance),
    editable: isInvoiceEditable(invoice),
    title: invoice.title,
    customerId: invoice.customerId,
    notes: invoice.notes ?? "",
    terms: invoice.terms ?? "",
    dueDate: invoice.dueDate?.toISOString().slice(0, 10) ?? "",
    taxRate: Number(invoice.taxRate),
    issueDate: invoice.issueDate.toISOString(),
    sentAt: invoice.sentAt?.toISOString() ?? null,
    paid: money.paid,
    hasPayments: invoice.payments.length > 0,
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference,
      receivedAt: payment.receivedAt.toISOString(),
      note: payment.note,
    })),
    projectId: invoice.projectId,
    projectName: invoice.project?.name ?? null,
    proposalId: invoice.proposalId,
    proposalNumber: invoice.proposal?.number ?? null,
    currency: company.currency,
    pendingCosts: {
      count: waitingCosts.length,
      total: waitingCosts.reduce((sum, cost) => sum + Number(cost.amount), 0),
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  };

  return <InvoiceEditor invoice={editorInvoice} customers={customers} />;
}
