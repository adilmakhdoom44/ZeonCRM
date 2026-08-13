import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { requireUser } from "@/lib/authz";
import { effectiveInvoiceStatus, invoiceTotals } from "@/lib/invoices";
import { InvoiceDocument, DocumentInvoice } from "@/components/invoice-document";
import { PrintButton } from "@/components/print-button";
import { Card } from "@/components/ui";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: "asc" } },
      payments: { select: { amount: true } },
      customer: {
        include: {
          contacts: { where: { isPrimary: true }, take: 1, include: { emails: { take: 1 } } },
          addresses: true,
        },
      },
    },
  });
  if (!invoice) notFound();

  const company = await getCompany();
  const contact = invoice.customer.contacts[0];
  const address =
    invoice.customer.addresses.find((a) => a.type === "BILLING") ??
    invoice.customer.addresses.find((a) => a.type === "OFFICE") ??
    invoice.customer.addresses[0];

  const items = invoice.items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
  }));
  const payments = invoice.payments.map((p) => ({ amount: Number(p.amount) }));
  const { balance } = invoiceTotals(items, Number(invoice.taxRate), payments);

  const document: DocumentInvoice = {
    number: invoice.number,
    title: invoice.title,
    notes: invoice.notes,
    status: effectiveInvoiceStatus(invoice, balance),
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() ?? null,
    taxRate: Number(invoice.taxRate),
    terms: invoice.terms,
    customer: {
      name: invoice.customer.name,
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
    items,
    payments,
  };

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/invoices/${id}`}
          className="text-sm text-slate-500 transition-colors hover:text-brand-600"
        >
          ← Back to editor
        </Link>
        <PrintButton />
      </div>

      <Card className="overflow-hidden print:border-0 print:shadow-none">
        <InvoiceDocument invoice={document} company={company} />
      </Card>
    </div>
  );
}
