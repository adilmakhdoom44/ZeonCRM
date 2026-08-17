"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { formatMoney, lineTotal, totals } from "@/lib/money";
import { deleteInvoiceAction, saveInvoiceAction } from "@/lib/actions/invoices";
import { Badge, Card, CardHeader } from "@/components/ui";
import { InvoiceLifecycle } from "@/components/invoice-lifecycle";
import { InvoicePayments, EditorPayment } from "@/components/invoice-payments";
import { RepeatInvoiceForm } from "@/components/recurring-controls";

export type EditorItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type EditorInvoice = {
  id: string;
  number: string;
  /** Derived, not stored: payments and the due date decide what this reads as. */
  status: string;
  editable: boolean;
  title: string;
  customerId: string;
  notes: string;
  terms: string;
  dueDate: string;
  taxRate: number;
  issueDate: string;
  sentAt: string | null;
  paid: number;
  hasPayments: boolean;
  payments: EditorPayment[];
  /** Where the invoice came from, if it was raised off existing work. */
  projectId: string | null;
  projectName: string | null;
  proposalId: string | null;
  proposalNumber: string | null;
  items: EditorItem[];
};

type Row = { key: number; description: string; quantity: string; unitPrice: string };

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

export function InvoiceEditor({
  invoice,
  customers,
}: {
  invoice: EditorInvoice;
  customers: { id: string; name: string }[];
}) {
  const nextKey = useRef(invoice.items.length);
  const [title, setTitle] = useState(invoice.title);
  const [customerId, setCustomerId] = useState(invoice.customerId);
  const [notes, setNotes] = useState(invoice.notes);
  const [terms, setTerms] = useState(invoice.terms);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [taxRate, setTaxRate] = useState(String(invoice.taxRate));
  const [rows, setRows] = useState<Row[]>(
    invoice.items.map((item, i) => ({
      key: i,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
    })),
  );

  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // An invoice the customer has been given must not change under them.
  const readOnly = !invoice.editable;

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
  const balance = summaryTotals.total - invoice.paid;

  function save() {
    startTransition(async () => {
      const items = rows
        .map((row) => ({
          description: row.description.trim(),
          quantity: num(row.quantity),
          unitPrice: num(row.unitPrice),
        }))
        .filter((item) => item.description || item.quantity * item.unitPrice !== 0);

      const result = await saveInvoiceAction(invoice.id, {
        customerId,
        title: title.trim(),
        notes,
        terms,
        dueDate,
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
          <Link href="/invoices" className="text-sm text-slate-500 hover:text-brand-600">
            ← Invoices
          </Link>
          <span className="font-mono text-sm font-medium tabular-nums text-slate-900">
            {invoice.number}
          </span>
          <Badge value={invoice.status} />
        </div>

        {readOnly ? (
          <span className="text-sm text-slate-500">Locked once issued</span>
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

      <InvoiceLifecycle
        id={invoice.id}
        status={invoice.status}
        sentAt={invoice.sentAt}
        dueDate={invoice.dueDate || null}
        total={summaryTotals.total}
        paid={invoice.paid}
        balance={balance}
        hasPayments={invoice.hasPayments}
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
              placeholder="Invoice title"
              disabled={readOnly}
              className="w-full border-0 bg-transparent p-0 text-lg font-semibold tracking-tight text-slate-900 placeholder:text-slate-300 focus:outline-none disabled:text-slate-900"
            />
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                touch();
              }}
              rows={2}
              placeholder="A note for the customer — what this covers, PO number…"
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
                      placeholder="Design sprint, hosting, milestone 1…"
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
            <CardHeader title="Payment terms" description="How and when you expect to be paid." />
            <div className="p-5">
              <textarea
                value={terms}
                onChange={(e) => {
                  setTerms(e.target.value);
                  touch();
                }}
                rows={4}
                placeholder="Payable within 30 days by bank transfer to…"
                disabled={readOnly}
                className={`${fieldCls} w-full`}
              />
            </div>
          </Card>

          <RepeatInvoiceForm
            invoiceId={invoice.id}
            defaultStart={new Date().toISOString().slice(0, 10)}
          />

          <InvoicePayments
            invoiceId={invoice.id}
            payments={invoice.payments}
            balance={balance}
            canRecord={invoice.status !== "DRAFT" && invoice.status !== "CANCELLED"}
            blockedReason={
              invoice.status === "DRAFT"
                ? "Mark this invoice as sent before recording a payment against it."
                : "This invoice has been cancelled — nothing is payable against it."
            }
          />
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
              {invoice.paid > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Paid</dt>
                    <dd className="font-medium tabular-nums text-emerald-600">
                      −{formatMoney(invoice.paid)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <dt className="font-medium text-slate-900">Balance</dt>
                    <dd className="text-lg font-semibold tabular-nums text-slate-900">
                      {formatMoney(balance)}
                    </dd>
                  </div>
                </>
              )}
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
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Due</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    touch();
                  }}
                  disabled={readOnly}
                  className={`${fieldCls} w-full`}
                />
              </label>

              <p className="text-sm text-slate-500">
                Issued {dateFmt.format(new Date(invoice.issueDate))}
              </p>

              {(invoice.projectId || invoice.proposalId) && (
                <div className="space-y-1 border-t border-slate-100 pt-4 text-sm">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Raised from</p>
                  {invoice.projectId && (
                    <Link
                      href={`/projects?focus=${invoice.projectId}`}
                      className="block text-slate-700 hover:text-brand-600"
                    >
                      {invoice.projectName ?? "Project"}
                    </Link>
                  )}
                  {invoice.proposalId && (
                    <Link
                      href={`/proposals/${invoice.proposalId}`}
                      className="block font-mono tabular-nums text-slate-700 hover:text-brand-600"
                    >
                      {invoice.proposalNumber ?? "Proposal"}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </Card>

          <form
            action={deleteInvoiceAction}
            onSubmit={(e) => {
              if (!confirm(`Delete invoice ${invoice.number}? This cannot be undone.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={invoice.id} />
            <button className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
