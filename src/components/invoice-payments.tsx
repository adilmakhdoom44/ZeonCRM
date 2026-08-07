"use client";

import { useRef, useState, useTransition } from "react";
import { formatMoney } from "@/lib/money";
import { deletePaymentAction, recordPaymentAction } from "@/lib/actions/payments";
import { Card, CardHeader } from "@/components/ui";

export type EditorPayment = {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  receivedAt: string;
  note: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  CASH: "Cash",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const fieldCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100";

export function InvoicePayments({
  invoiceId,
  payments,
  balance,
  canRecord,
  blockedReason,
}: {
  invoiceId: string;
  payments: EditorPayment[];
  balance: number;
  canRecord: boolean;
  blockedReason: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function record(formData: FormData) {
    startTransition(async () => {
      const result = await recordPaymentAction(invoiceId, formData);
      if (result.ok) {
        setError(null);
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader
        title="Payments"
        description={
          payments.length > 0
            ? `${payments.length} receipt${payments.length === 1 ? "" : "s"} against this invoice.`
            : "Money received against this invoice."
        }
      />

      {payments.length > 0 && (
        <ul className="divide-y divide-slate-100 border-b border-slate-100">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {formatMoney(payment.amount)}{" "}
                  <span className="font-normal text-slate-500">
                    · {METHOD_LABELS[payment.method] ?? payment.method}
                  </span>
                </p>
                <p className="truncate text-xs text-slate-500">
                  {dateFmt.format(new Date(payment.receivedAt))}
                  {payment.reference && <> · {payment.reference}</>}
                  {payment.note && <> · {payment.note}</>}
                </p>
              </div>
              <form
                action={deletePaymentAction}
                onSubmit={(e) => {
                  if (!confirm(`Remove the ${formatMoney(payment.amount)} payment?`)) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={payment.id} />
                <button
                  title="Remove payment"
                  aria-label="Remove payment"
                  className="text-slate-300 transition-colors hover:text-red-500"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="p-5">
        {!canRecord ? (
          <p className="text-sm text-slate-500">{blockedReason}</p>
        ) : (
          <form ref={formRef} action={record} className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <label className="flex-1">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Amount</span>
                <input
                  name="amount"
                  inputMode="decimal"
                  required
                  // Pre-filled with what is left, since settling the balance is the
                  // common case and a part payment is the exception.
                  defaultValue={balance > 0 ? String(balance) : ""}
                  className={`${fieldCls} w-full text-right tabular-nums`}
                />
              </label>
              <label className="flex-1">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Method</span>
                <select name="method" defaultValue="BANK_TRANSFER" className={`${fieldCls} w-full`}>
                  {Object.entries(METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Received</span>
                <input
                  name="receivedAt"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className={`${fieldCls} w-full`}
                />
              </label>
            </div>

            <input
              name="reference"
              placeholder="Reference — transaction id, cheque number…"
              className={`${fieldCls} w-full`}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? "Recording…" : "Record payment"}
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}
