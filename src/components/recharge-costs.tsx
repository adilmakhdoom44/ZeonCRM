"use client";

import { useState, useTransition } from "react";
import { rechargeCostsAction } from "@/lib/actions/expenses";
import { formatMoney } from "@/lib/money";

/**
 * Offered only when there is something to recharge, and it says how much before
 * you press it — adding lines to an invoice sight unseen is how a client ends up
 * querying a bill.
 */
export function RechargeCosts({
  invoiceId,
  pending: waiting,
  currency,
}: {
  invoiceId: string;
  pending: { count: number; total: number };
  currency: string;
}) {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  if (waiting.count === 0 && !result) return null;

  function recharge(formData: FormData) {
    startTransition(async () => {
      const outcome = await rechargeCostsAction(formData);
      if (outcome.ok) {
        setError(null);
        setResult(
          `Added ${outcome.count} line${outcome.count === 1 ? "" : "s"} — ${formatMoney(outcome.total, currency)}.`,
        );
      } else {
        setError(outcome.error);
      }
    });
  }

  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3">
      {result ? (
        <p className="text-sm text-emerald-700">{result}</p>
      ) : (
        <form action={recharge} className="flex flex-wrap items-center justify-between gap-3">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <p className="text-sm text-slate-700">
            {waiting.count} rechargeable cost{waiting.count === 1 ? "" : "s"} on this work —{" "}
            <span className="font-medium">{formatMoney(waiting.total, currency)}</span> not yet
            billed.
          </p>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add to this invoice"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
