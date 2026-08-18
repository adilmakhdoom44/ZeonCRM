import Link from "next/link";

/**
 * Reached both by a bad URL and by notFound() on a record that no longer exists,
 * so the wording has to cover a deleted invoice as well as a typo.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm text-slate-400">404</p>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
          We could not find that
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The link may be wrong, or whatever it pointed at has since been deleted.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
