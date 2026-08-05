"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/money";
import {
  cancelInvoiceAction,
  markInvoiceSentAction,
  reopenInvoiceAction,
  revertInvoiceToDraftAction,
} from "@/lib/actions/invoices";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const secondaryBtn =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

function ActionForm({
  action,
  id,
  label,
  className = secondaryBtn,
}: {
  action: (formData: FormData) => void;
  id: string;
  label: string;
  className?: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

export function InvoiceLifecycle({
  id,
  status,
  sentAt,
  dueDate,
  total,
  paid,
  balance,
  hasPayments,
}: {
  id: string;
  status: string;
  sentAt: string | null;
  dueDate: string | null;
  total: number;
  paid: number;
  balance: number;
  hasPayments: boolean;
}) {
  const previewLink = (
    <Link href={`/invoices/${id}/print`} className={secondaryBtn}>
      Preview & print
    </Link>
  );

  const cancelForm = (
    <ActionForm action={cancelInvoiceAction} id={id} label="Cancel invoice" />
  );

  if (status === "DRAFT") {
    return (
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Draft — not yet issued</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Marking it sent locks the figures and starts the clock on the due date.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewLink}
            <ActionForm
              action={markInvoiceSentAction}
              id={id}
              label="Mark as sent"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            />
          </div>
        </div>
      </section>
    );
  }

  if (status === "PAID") {
    return (
      <section className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-900">
              Paid in full — {formatMoney(paid)} received
            </p>
            <p className="mt-0.5 text-sm text-emerald-700">Nothing outstanding on this invoice.</p>
          </div>
          <div className="flex flex-wrap gap-2">{previewLink}</div>
        </div>
      </section>
    );
  }

  if (status === "CANCELLED") {
    return (
      <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Cancelled</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Written off rather than deleted — the number stays used so the sequence has no gaps.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewLink}
            <ActionForm action={reopenInvoiceAction} id={id} label="Reopen" />
          </div>
        </div>
      </section>
    );
  }

  if (status === "OVERDUE") {
    return (
      <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-red-900">
              Overdue{dueDate && <> since {dateFmt.format(new Date(dueDate))}</>} —{" "}
              {formatMoney(balance)} outstanding
            </p>
            <p className="mt-0.5 text-sm text-red-700">
              {paid > 0
                ? `${formatMoney(paid)} of ${formatMoney(total)} received so far.`
                : "Nothing has been received against this invoice yet."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewLink}
            {cancelForm}
          </div>
        </div>
      </section>
    );
  }

  if (status === "PARTIALLY_PAID") {
    return (
      <section className="mb-6 rounded-xl border border-brand-100 bg-brand-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {formatMoney(paid)} of {formatMoney(total)} received — {formatMoney(balance)} to go
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              {dueDate && <>Balance due {dateFmt.format(new Date(dueDate))}.</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewLink}
            {cancelForm}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-xl border border-sky-200 bg-sky-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Issued{sentAt && <> on {dateFmt.format(new Date(sentAt))}</>} — {formatMoney(balance)}{" "}
            outstanding
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {dueDate ? <>Due {dateFmt.format(new Date(dueDate))}. </> : null}
            Editing is locked while the customer has it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {previewLink}
          {/* Once money has arrived the figures are part of a settled record. */}
          {!hasPayments && (
            <ActionForm action={revertInvoiceToDraftAction} id={id} label="Return to draft" />
          )}
          {cancelForm}
        </div>
      </div>
    </section>
  );
}
