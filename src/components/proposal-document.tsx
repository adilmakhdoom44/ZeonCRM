import type { Company } from "@/lib/company";
import { formatMoney, lineTotal, totals } from "@/lib/money";
import type { ProposalStatus } from "@/lib/proposals";

export type DocumentProposal = {
  number: string;
  title: string;
  summary: string | null;
  status: ProposalStatus;
  issueDate: string;
  validUntil: string | null;
  taxRate: number;
  terms: string | null;
  respondedByName: string | null;
  respondedAt: string | null;
  declineNote: string | null;
  customer: {
    name: string;
    contactName: string | null;
    contactEmail: string | null;
    address: string[];
  };
  items: { description: string; quantity: number; unitPrice: number }[];
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const qtyFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function ResponseNotice({ proposal }: { proposal: DocumentProposal }) {
  if (proposal.status === "ACCEPTED") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <strong className="font-semibold">Accepted</strong>
        {proposal.respondedByName && <> by {proposal.respondedByName}</>}
        {proposal.respondedAt && <> on {dateFmt.format(new Date(proposal.respondedAt))}</>}.
      </div>
    );
  }

  if (proposal.status === "DECLINED") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <strong className="font-semibold">Declined</strong>
        {proposal.respondedByName && <> by {proposal.respondedByName}</>}
        {proposal.respondedAt && <> on {dateFmt.format(new Date(proposal.respondedAt))}</>}.
        {proposal.declineNote && <p className="mt-1 italic">“{proposal.declineNote}”</p>}
      </div>
    );
  }

  if (proposal.status === "EXPIRED") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong className="font-semibold">Expired</strong> — this quote passed its validity date.
        Get in touch and we will gladly refresh it.
      </div>
    );
  }

  return null;
}

/** The customer-facing quote: used by the internal print view and the public share link. */
export function ProposalDocument({
  proposal,
  company,
}: {
  proposal: DocumentProposal;
  company: Company;
}) {
  const summaryTotals = totals(proposal.items, proposal.taxRate);

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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Proposal</p>
          <p className="font-mono text-lg font-semibold tabular-nums">{proposal.number}</p>
          <p className="mt-1 text-sm text-slate-500">
            Issued {dateFmt.format(new Date(proposal.issueDate))}
          </p>
          {proposal.validUntil && (
            <p className="text-sm text-slate-500">
              Valid until {dateFmt.format(new Date(proposal.validUntil))}
            </p>
          )}
        </div>
      </header>

      <div className="flex flex-wrap justify-between gap-6 py-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Prepared for</p>
          <p className="mt-2 font-medium">{proposal.customer.name}</p>
          <div className="mt-0.5 space-y-0.5 text-sm text-slate-500">
            {proposal.customer.contactName && <p>{proposal.customer.contactName}</p>}
            {proposal.customer.contactEmail && <p>{proposal.customer.contactEmail}</p>}
            {proposal.customer.address.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{proposal.title}</h1>
      {proposal.summary && (
        <p className="mt-2 max-w-prose text-slate-600">{proposal.summary}</p>
      )}

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
          {proposal.items.map((item, i) => (
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
            <dd className="tabular-nums">{formatMoney(summaryTotals.subtotal, company.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Tax ({qtyFmt.format(proposal.taxRate)}%)</dt>
            <dd className="tabular-nums">{formatMoney(summaryTotals.tax, company.currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(summaryTotals.total, company.currency)}</dd>
          </div>
        </dl>
      </div>

      {proposal.terms && (
        <section className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Terms</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{proposal.terms}</p>
        </section>
      )}

      <div className="mt-8">
        <ResponseNotice proposal={proposal} />
      </div>

      <footer className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-400">
        {proposal.number} · {company.name} · Thank you for your business.
      </footer>
    </article>
  );
}
