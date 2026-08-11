"use client";

import { useState, useTransition } from "react";

type SendResult =
  | { ok: true; delivered: boolean; to: string }
  | { ok: false; error: string };

/**
 * Reports what actually happened rather than just "sent". With no provider
 * configured the send succeeds but delivers nothing, and saying so plainly is
 * the difference between a working demo and a client who never got their quote.
 */
export function SendButton({
  action,
  id,
  label,
  className,
}: {
  action: (formData: FormData) => Promise<SendResult>;
  id: string;
  label: string;
  className: string;
}) {
  const [result, setResult] = useState<SendResult | null>(null);
  const [pending, startTransition] = useTransition();

  function send(formData: FormData) {
    startTransition(async () => {
      setResult(await action(formData));
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={send}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>
          {pending ? "Sending…" : label}
        </button>
      </form>

      {result && (
        <p
          className={`text-right text-xs ${
            !result.ok ? "text-red-600" : result.delivered ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          {!result.ok
            ? result.error
            : result.delivered
              ? `Sent to ${result.to}`
              : `Composed for ${result.to} — not delivered, no email provider configured`}
        </p>
      )}
    </div>
  );
}
