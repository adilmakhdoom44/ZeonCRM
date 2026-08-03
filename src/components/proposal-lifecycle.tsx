"use client";

import Link from "next/link";
import { useState } from "react";
import {
  markProposalSentAction,
  revertProposalToDraftAction,
} from "@/lib/actions/proposals";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const secondaryBtn =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600"
      />
      <button type="button" onClick={copy} className={secondaryBtn}>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <button type="submit" className={className}>
      {children}
    </button>
  );
}

export function ProposalLifecycle({
  id,
  status,
  shareUrl,
  sentAt,
  validUntil,
  respondedByName,
  respondedAt,
  declineNote,
}: {
  id: string;
  status: string;
  shareUrl: string | null;
  sentAt: string | null;
  validUntil: string | null;
  respondedByName: string | null;
  respondedAt: string | null;
  declineNote: string | null;
}) {
  const previewLink = (
    <Link href={`/proposals/${id}/print`} className={secondaryBtn}>
      Preview & print
    </Link>
  );

  const revertForm = (label: string) => (
    <form action={revertProposalToDraftAction}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton className={secondaryBtn}>{label}</SubmitButton>
    </form>
  );

  if (status === "DRAFT") {
    return (
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Draft — only your team can see this</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Sending creates a private link you can share with the customer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewLink}
            <form action={markProposalSentAction}>
              <input type="hidden" name="id" value={id} />
              <SubmitButton className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700">
                Mark as sent
              </SubmitButton>
            </form>
          </div>
        </div>
      </section>
    );
  }

  if (status === "SENT") {
    return (
      <section className="mb-6 rounded-xl border border-sky-200 bg-sky-50/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">
              Sent{sentAt && <> on {dateFmt.format(new Date(sentAt))}</>} — awaiting a response
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Anyone with this link can view and respond
              {validUntil && <> until {dateFmt.format(new Date(validUntil))}</>}. Editing is locked
              while it is out.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewLink}
            {revertForm("Return to draft")}
          </div>
        </div>
        {shareUrl && (
          <div className="mt-4">
            <ShareLink url={shareUrl} />
          </div>
        )}
      </section>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <section className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-900">
              Accepted{respondedByName && <> by {respondedByName}</>}
              {respondedAt && <> on {dateFmt.format(new Date(respondedAt))}</>}
            </p>
            <p className="mt-0.5 text-sm text-emerald-700">
              Time to get started — converting this into a project lands tomorrow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">{previewLink}</div>
        </div>
      </section>
    );
  }

  if (status === "DECLINED") {
    return (
      <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-red-900">
              Declined{respondedByName && <> by {respondedByName}</>}
              {respondedAt && <> on {dateFmt.format(new Date(respondedAt))}</>}
            </p>
            {declineNote && <p className="mt-0.5 text-sm italic text-red-700">“{declineNote}”</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {previewLink}
            {revertForm("Revise as draft")}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-amber-900">
            Expired{validUntil && <> on {dateFmt.format(new Date(validUntil))}</>}
          </p>
          <p className="mt-0.5 text-sm text-amber-700">
            The customer can no longer respond. Revise it as a draft to send a fresh quote.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {previewLink}
          {revertForm("Revise as draft")}
        </div>
      </div>
    </section>
  );
}
