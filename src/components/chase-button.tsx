"use client";

import { useState, useTransition } from "react";
import { sendPaymentReminderAction } from "@/lib/actions/send";

type SendResult =
  | { ok: true; delivered: boolean; to: string }
  | { ok: false; error: string };

/**
 * A compact chase, sized to sit inside a list row. Says what actually happened
 * rather than just "sent" — with no email provider configured the message is
 * composed and not delivered, and a row that claimed success would be a lie the
 * next overdue notice exposes.
 */
export function ChaseButton({ invoiceId }: { invoiceId: string }) {
  const [result, setResult] = useState<SendResult | null>(null);
  const [pending, startTransition] = useTransition();

  function send(formData: FormData) {
    startTransition(async () => setResult(await sendPaymentReminderAction(formData)));
  }

  if (result) {
    return (
      <span
        role="status"
        aria-live="polite"
        className={`text-xs ${
          !result.ok ? "text-red-600" : result.delivered ? "text-emerald-700" : "text-amber-700"
        }`}
      >
        {!result.ok ? result.error : result.delivered ? "Reminder sent" : "Composed, not delivered"}
      </span>
    );
  }

  return (
    <form action={send}>
      <input type="hidden" name="id" value={invoiceId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Chase"}
      </button>
    </form>
  );
}
