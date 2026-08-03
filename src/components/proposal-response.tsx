"use client";

import { useState, useTransition } from "react";
import { respondToProposalAction } from "@/lib/actions/proposals";

type Decision = "ACCEPTED" | "DECLINED";

const fieldCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100";

/** Accept / decline controls for the client viewing a shared proposal. */
export function ProposalResponse({ token }: { token: string }) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Decision | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await respondToProposalAction(token, {
        decision: decision as Decision,
        name,
        note,
      });
      if (result.ok) setDone(decision);
      else setError(result.error);
    });
  }

  if (done) {
    return (
      <div
        className={`rounded-xl border px-5 py-4 text-sm ${
          done === "ACCEPTED"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-slate-200 bg-slate-50 text-slate-700"
        }`}
      >
        <p className="font-medium">
          {done === "ACCEPTED" ? "Thank you — proposal accepted." : "Thank you for letting us know."}
        </p>
        <p className="mt-1">
          {done === "ACCEPTED"
            ? "We have been notified and will be in touch shortly to get started."
            : "We have recorded your response. Do reach out if anything changes."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      {!decision ? (
        <>
          <p className="text-sm font-medium text-slate-900">Ready to go ahead?</p>
          <p className="mt-1 text-sm text-slate-500">
            Let us know your decision and we will take it from there.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDecision("ACCEPTED")}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Accept proposal
            </button>
            <button
              type="button"
              onClick={() => setDecision("DECLINED")}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Decline
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-900">
            {decision === "ACCEPTED" ? "Confirm acceptance" : "Decline this proposal"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {decision === "ACCEPTED"
              ? "Type your full name to confirm — this is recorded with today's date as your acceptance."
              : "Type your full name to confirm. A short reason is optional but helps us improve."}
          </p>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
                className={fieldCls}
              />
            </label>

            {decision === "DECLINED" && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Reason <span className="font-normal text-slate-400">(optional)</span>
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Timing isn't right, budget, going another direction…"
                  className={fieldCls}
                />
              </label>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={submit}
                disabled={pending || name.trim().length < 2}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  decision === "ACCEPTED"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-800 hover:bg-slate-900"
                }`}
              >
                {pending
                  ? "Sending…"
                  : decision === "ACCEPTED"
                    ? "Confirm acceptance"
                    : "Confirm decline"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDecision(null);
                  setError(null);
                }}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Back
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
