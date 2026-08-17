"use client";

import { useState, useTransition } from "react";
import {
  createRecurringFromInvoiceAction,
  generateDueInvoicesAction,
} from "@/lib/actions/recurring";
import { CADENCES, CADENCE_LABELS } from "@/lib/recurring";
import { Card, CardHeader } from "@/components/ui";

const fieldCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-100";

export function GenerateDueButton() {
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const outcome = await generateDueInvoicesAction();
      setResult(
        outcome.created === 0
          ? "Nothing due — every schedule is up to date."
          : `Raised ${outcome.created} draft invoice${outcome.created === 1 ? "" : "s"}.`,
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Checking…" : "Generate due invoices"}
      </button>
      {result && <span className="text-sm text-slate-600">{result}</span>}
    </div>
  );
}

export function RepeatInvoiceForm({
  invoiceId,
  defaultStart,
}: {
  invoiceId: string;
  defaultStart: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const outcome = await createRecurringFromInvoiceAction(formData);
      // A success redirects, so anything returned here is a refusal.
      if (outcome && !outcome.ok) setError(outcome.error);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Repeat this invoice
      </button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader
        title="Repeat this invoice"
        description="Copies the line items into a standing arrangement. Future invoices arrive as drafts for you to check and send."
      />
      <form action={submit} className="flex flex-wrap items-end gap-3 p-5">
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">How often</span>
          <select name="cadence" defaultValue="MONTHLY" className={fieldCls}>
            {CADENCES.map((cadence) => (
              <option key={cadence} value={cadence}>
                {CADENCE_LABELS[cadence]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Starting</span>
          <input type="date" name="startOn" defaultValue={defaultStart} className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Payable within</span>
          <div className="flex items-center gap-2">
            <input
              name="dueInDays"
              inputMode="numeric"
              defaultValue="30"
              className={`${fieldCls} w-20 text-right tabular-nums`}
            />
            <span className="text-sm text-slate-500">days</span>
          </div>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Setting up…" : "Set up"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>
    </Card>
  );
}
