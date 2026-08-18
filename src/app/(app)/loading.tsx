import { Card } from "@/components/ui";

/**
 * Shown while a page's data is on its way. Shaped like the lists it stands in
 * for — a header, a row of tiles, some rows — so the layout does not jump when
 * the real content lands.
 */
export default function AppLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="mb-6">
        <div className="h-6 w-40 rounded bg-slate-200" />
        <div className="mt-2 h-4 w-64 rounded bg-slate-100" />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="px-5 py-4">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="mt-2 h-5 w-24 rounded bg-slate-200" />
          </Card>
        ))}
      </div>

      <Card>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-1/4 rounded bg-slate-100" />
              </div>
              <div className="h-5 w-16 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
