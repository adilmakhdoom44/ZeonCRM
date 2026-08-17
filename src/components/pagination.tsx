import Link from "next/link";

export const PAGE_SIZE = 25;

/** Clamps whatever arrived in the URL to a real page number. */
export function pageFrom(value: string | undefined, total: number) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const asked = Number(value);
  if (!Number.isFinite(asked) || asked < 1) return 1;
  return Math.min(Math.trunc(asked), pages);
}

const linkCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

/**
 * Page links keep the filters that are already on the URL, so paging through a
 * filtered list does not quietly drop the filter.
 */
function href(basePath: string, params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({
  basePath,
  params,
  page,
  total,
  noun,
}: {
  basePath: string;
  params: URLSearchParams;
  page: number;
  total: number;
  noun: string;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  // One page of results needs a count, not controls.
  if (pages <= 1) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        {total} {noun}
        {total === 1 ? "" : "s"}
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-500">
        Showing {first}–{last} of {total} {noun}
        {total === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(basePath, params, page - 1)} className={linkCls}>
            ← Previous
          </Link>
        ) : (
          <span className={`${linkCls} cursor-default opacity-40`}>← Previous</span>
        )}
        <span className="text-xs tabular-nums text-slate-500">
          Page {page} of {pages}
        </span>
        {page < pages ? (
          <Link href={href(basePath, params, page + 1)} className={linkCls}>
            Next →
          </Link>
        ) : (
          <span className={`${linkCls} cursor-default opacity-40`}>Next →</span>
        )}
      </div>
    </div>
  );
}
