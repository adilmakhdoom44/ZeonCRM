import type { Company } from "@/lib/company";
import { formatMoney, lineTotal } from "@/lib/money";
import { invoiceTotals, type InvoiceStatus } from "@/lib/invoices";

export type DocumentInvoice = {
  number: string;
  title: string;
  notes: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  taxRate: number;
  terms: string | null;
  customer: {
    name: string;
    contactName: string | null;
    contactEmail: string | null;
    address: string[];
  };
  items: { description: string; quantity: number; unitPrice: number }[];
  payments: { amount: number }[];
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const qtyFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function StatusNotice({
  status,
  balance,
  currency,
}: {
  status: InvoiceStatus;
  balance: number;
  currency: string;
}) {
  if (status === "PAID") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <strong className="font-semibold">Paid in full</strong> — thank you, nothing further is due.
      </div>
    );
  }

  if (status === "OVERDUE") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <strong className="font-semibold">Overdue</strong> — {formatMoney(balance, currency)} remains
        outstanding past the due date.
      </div>
    );
  }

  if (status === "PARTIALLY_PAID") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <strong className="font-semibold">Part paid</strong> — {formatMoney(balance, currency)} remains
        outstanding.
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <strong className="font-semibold">Cancelled</strong> — this invoice has been written off and
        is not payable.
      </div>
    );
  }

  if (status === "DRAFT") {
    return (
      <div className="no-print rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong className="font-semibold">Draft</strong> — not yet issued to the customer.
      </div>
    );
  }

  return null;
}

/** The customer-facing invoice, used by the print view. */
export function InvoiceDocument({
  invoice,
  company,
}: {
  invoice: DocumentInvoice;
  company: Company;
}) {
  const money = invoiceTotals(invoice.items, invoice.taxRate, invoice.payments);

  return (
    <article className="mx-auto max-w-3xl bg-white p-8 text-slate-900 sm:p-12 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <p className="text-lg font-semibold tracking-tight">{company.name}</p>
          <div className="mt-1 space-y-0.5 text-sm text-slate-500">
            {company.address && <p>{company.address}</p>}
            {company.email && <p>{company.email}</p>}
            {company.phone && <p>{company.phone}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Invoice</p>
          <p className="font-mono text-lg font-semibold tabular-nums">{invoice.number}</p>
          <p className="mt-1 text-sm text-slate-500">
            Issued {dateFmt.format(new Date(invoice.issueDate))}
          </p>
          {invoice.dueDate && (
            <p className="text-sm text-slate-500">
              Due {dateFmt.format(new Date(invoice.dueDate))}
            </p>
          )}
        </div>
      </header>

      <div className="flex flex-wrap justify-between gap-6 py-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Billed to</p>
          <p className="mt-2 font-medium">{invoice.customer.name}</p>
          <div className="mt-0.5 space-y-0.5 text-sm text-slate-500">
            {invoice.customer.contactName && <p>{invoice.customer.contactName}</p>}
            {invoice.customer.contactEmail && <p>{invoice.customer.contactEmail}</p>}
            {invoice.customer.address.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            Amount due
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{formatMoney(money.balance, company.currency)}</p>
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{invoice.title}</h1>
      {invoice.notes && <p className="mt-2 max-w-prose text-slate-600">{invoice.notes}</p>}

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-y border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <th className="py-2.5 pr-4 font-medium">Description</th>
            <th className="w-20 py-2.5 text-right font-medium">Qty</th>
            <th className="w-32 py-2.5 text-right font-medium">Unit price</th>
            <th className="w-32 py-2.5 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoice.items.map((item, i) => (
            <tr key={i} className="align-top">
              <td className="py-3 pr-4">{item.description || "—"}</td>
              <td className="py-3 text-right tabular-nums text-slate-600">
                {qtyFmt.format(item.quantity)}
              </td>
              <td className="py-3 text-right tabular-nums text-slate-600">
                {formatMoney(item.unitPrice, company.currency)}
              </td>
              <td className="py-3 text-right font-medium tabular-nums">
                {formatMoney(lineTotal(item), company.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(money.subtotal, company.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Tax ({qtyFmt.format(invoice.taxRate)}%)</dt>
            <dd className="tabular-nums">{formatMoney(money.tax, company.currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <dt className="text-slate-500">Total</dt>
            <dd className="tabular-nums">{formatMoney(money.total, company.currency)}</dd>
          </div>
          {money.paid > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Paid</dt>
              <dd className="tabular-nums">−{formatMoney(money.paid, company.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
            <dt className="font-semibold">Amount due</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(money.balance, company.currency)}</dd>
          </div>
        </dl>
      </div>

      {invoice.terms && (
        <section className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            Payment terms
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{invoice.terms}</p>
        </section>
      )}

      <div className="mt-8">
        <StatusNotice status={invoice.status} balance={money.balance} currency={company.currency} />
      </div>

      <footer className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-400">
        {invoice.number} · {company.name} · Thank you for your business.
      </footer>
    </article>
  );
}
