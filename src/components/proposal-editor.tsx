"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { formatMoney, lineTotal, totals } from "@/lib/money";
import {
  deleteProposalAction,
  duplicateProposalAction,
  saveProposalAction,
} from "@/lib/actions/proposals";
import { Badge, Card, CardHeader } from "@/components/ui";
import { ProposalLifecycle } from "@/components/proposal-lifecycle";

export type EditorItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type EditorProposal = {
  id: string;
  number: string;
  /** Calendar-aware status: a sent proposal past its validity reads as EXPIRED. */
  status: string;
  editable: boolean;
  shareUrl: string | null;
  sentAt: string | null;
  respondedByName: string | null;
  respondedAt: string | null;
  declineNote: string | null;
  title: string;
  customerId: string;
  summary: string;
  terms: string;
  validUntil: string;
  taxRate: number;
  issueDate: string;
  items: EditorItem[];
};

type Row = { key: number; description: string; quantity: string; unitPrice: string };

// No width here on purpose — callers set their own, and a `w-full` baked in would
// win over a narrower utility depending on stylesheet order.
const fieldCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100";

const num = (value: string) => {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ProposalEditor({
  proposal,
  customers,
}: {
  proposal: EditorProposal;
  customers: { id: string; name: string }[];
}) {
  const nextKey = useRef(proposal.items.length);
  const [title, setTitle] = useState(proposal.title);
  const [customerId, setCustomerId] = useState(proposal.customerId);
  const [summary, setSummary] = useState(proposal.summary);
  const [terms, setTerms] = useState(proposal.terms);
  const [validUntil, setValidUntil] = useState(proposal.validUntil);
  const [taxRate, setTaxRate] = useState(String(proposal.taxRate));
  const [rows, setRows] = useState<Row[]>(
    proposal.items.map((item, i) => ({
      key: i,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
    })),
  );

  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A quote the customer can already see must not change under them.
  const readOnly = !proposal.editable;

  function touch() {
    setSaved(false);
    setError(null);
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    touch();
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { key: nextKey.current++, description: "", quantity: "1", unitPrice: "0" },
    ]);
    touch();
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
    touch();
  }

  const lines = rows.map((row) => ({
    quantity: num(row.quantity),
    unitPrice: num(row.unitPrice),
  }));
  const summaryTotals = totals(lines, num(taxRate));

  function save() {
    startTransition(async () => {
      const items = rows
        .map((row) => ({
          description: row.description.trim(),
          quantity: num(row.quantity),
          unitPrice: num(row.unitPrice),
        }))
        .filter((item) => item.description || item.quantity * item.unitPrice !== 0);

      const result = await saveProposalAction(proposal.id, {
        customerId,
        title: title.trim(),
        summary,
        terms,
        validUntil,
        taxRate: num(taxRate),
        items,
      });

      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/proposals" className="text-sm text-slate-500 hover:text-brand-600">
            ← Proposals
          </Link>
          <span className="font-mono text-sm font-medium tabular-nums text-slate-900">
            {proposal.number}
          </span>
          <Badge value={proposal.status} />
        </div>

        {readOnly ? (
          <span className="text-sm text-slate-500">Locked while the customer has it</span>
        ) : (
          <div className="flex items-center gap-3">
            <span className={`text-sm ${error ? "text-red-600" : "text-slate-500"}`}>
              {error ?? (pending ? "Saving…" : saved ? "All changes saved" : "Unsaved changes")}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={pending || saved}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        )}
      </div>

      <ProposalLifecycle
        id={proposal.id}
        status={proposal.status}
        shareUrl={proposal.shareUrl}
        sentAt={proposal.sentAt}
        validUntil={proposal.validUntil || null}
        respondedByName={proposal.respondedByName}
        respondedAt={proposal.respondedAt}
        declineNote={proposal.declineNote}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-6">
          <Card className="p-6">
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                touch();
              }}
              placeholder="Proposal title"
              disabled={readOnly}
              className="w-full border-0 bg-transparent p-0 text-lg font-semibold tracking-tight text-slate-900 placeholder:text-slate-300 focus:outline-none disabled:text-slate-900"
            />
            <textarea
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                touch();
              }}
              rows={2}
              placeholder="A short summary of what you are proposing…"
              disabled={readOnly}
              className="mt-2 w-full resize-none border-0 bg-transparent p-0 text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none disabled:text-slate-600"
            />
          </Card>

          <Card>
            <CardHeader title="Line items" description="Quantity × unit price." />
            <div className="px-5 py-2">
              <div className="hidden gap-3 border-b border-slate-100 pb-2 text-xs uppercase tracking-wider text-slate-500 sm:flex">
                <span className="flex-1">Description</span>
                <span className="w-20 text-right">Qty</span>
                <span className="w-28 text-right">Unit price</span>
                <span className="w-28 text-right">Amount</span>
                <span className="w-5" />
              </div>

              {rows.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">
                  No line items yet — add your first one below.
                </p>
              )}

              <ul className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <li key={row.key} className="flex flex-wrap items-center gap-3 py-2.5">
                    <input
                      value={row.description}
                      onChange={(e) => updateRow(row.key, { description: e.target.value })}
                      placeholder="Discovery workshop, design sprint, hosting…"
                      disabled={readOnly}
                      className={`${fieldCls} min-w-40 flex-1`}
                    />
                    <input
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      inputMode="decimal"
                      aria-label="Quantity"
                      disabled={readOnly}
                      className={`${fieldCls} w-20 text-right tabular-nums`}
                    />
                    <input
                      value={row.unitPrice}
                      onChange={(e) => updateRow(row.key, { unitPrice: e.target.value })}
                      inputMode="decimal"
                      aria-label="Unit price"
                      disabled={readOnly}
                      className={`${fieldCls} w-28 text-right tabular-nums`}
                    />
                    <span className="w-28 text-right text-sm font-medium tabular-nums text-slate-900">
                      {formatMoney(
                        lineTotal({ quantity: num(row.quantity), unitPrice: num(row.unitPrice) }),
                      )}
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        title="Remove line"
                        aria-label="Remove line"
                        className="w-5 text-slate-300 transition-colors hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {!readOnly && (
                <button
                  type="button"
                  onClick={addRow}
                  className="my-2 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50"
                >
                  + Add line
                </button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Terms" description="Payment terms, scope notes, exclusions." />
            <div className="p-5">
              <textarea
                value={terms}
                onChange={(e) => {
                  setTerms(e.target.value);
                  touch();
                }}
                rows={4}
                placeholder="50% due on acceptance, balance on delivery…"
                disabled={readOnly}
                className={`${fieldCls} w-full`}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20">
          <Card>
            <CardHeader title="Summary" />
            <dl className="space-y-3 p-5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {formatMoney(summaryTotals.subtotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-slate-500">
                  Tax
                  <input
                    value={taxRate}
                    onChange={(e) => {
                      setTaxRate(e.target.value);
                      touch();
                    }}
                    inputMode="decimal"
                    aria-label="Tax rate percentage"
                    disabled={readOnly}
                    className="w-14 rounded-md border border-slate-300 px-2 py-1 text-right text-xs tabular-nums focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
                  />
                  %
                </dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {formatMoney(summaryTotals.tax)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <dt className="font-medium text-slate-900">Total</dt>
                <dd className="text-lg font-semibold tabular-nums text-slate-900">
                  {formatMoney(summaryTotals.total)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <div className="space-y-4 p-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Customer</span>
                <select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    touch();
                  }}
                  disabled={readOnly}
                  className={`${fieldCls} w-full`}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Valid until</span>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => {
                    setValidUntil(e.target.value);
                    touch();
                  }}
                  disabled={readOnly}
                  className={`${fieldCls} w-full`}
                />
              </label>

              <p className="text-sm text-slate-500">
                Issued {dateFmt.format(new Date(proposal.issueDate))}
              </p>
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            <form action={duplicateProposalAction}>
              <input type="hidden" name="id" value={proposal.id} />
              <button className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                Duplicate
              </button>
            </form>
            <form
              action={deleteProposalAction}
              onSubmit={(e) => {
                if (!confirm(`Delete proposal ${proposal.number}? This cannot be undone.`)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={proposal.id} />
              <button className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
