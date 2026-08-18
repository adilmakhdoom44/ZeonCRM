"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Catches a failed render anywhere inside the app shell. Deliberately says
 * nothing about what went wrong: the message could carry a connection string or
 * a query, and the person reading it cannot act on it anyway. The detail goes to
 * the server log, where it is useful.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Zeon CRM] Render failed:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <h1 className="text-lg font-semibold tracking-tight text-slate-900">
        Something went wrong on this page
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Nothing you did caused it and nothing has been lost. Trying again often works — the database
        may simply have been briefly unreachable.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-xs text-slate-400">Reference: {error.digest}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
