import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { search, SearchHit } from "@/lib/search";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

const KIND_ORDER: SearchHit["kind"][] = [
  "Customer",
  "Contact",
  "Project",
  "Proposal",
  "Invoice",
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  const hits = await search(term, 10);
  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    hits: hits.filter((hit) => hit.kind === kind),
  })).filter((group) => group.hits.length > 0);

  return (
    <div>
      <PageHeader
        title={term ? `Results for “${term}”` : "Search"}
        description={
          term
            ? `${hits.length} match${hits.length === 1 ? "" : "es"} across customers, contacts, projects, quotes and invoices.`
            : "Find an account, a person, a project, a quote or an invoice."
        }
      />

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={term}
          autoFocus
          placeholder="Search everything…"
          className="w-full max-w-xl rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
        />
      </form>

      {term.length < 2 ? (
        <Card>
          <EmptyState
            title="Type at least two characters"
            hint="Names, email addresses, phone numbers, and document numbers like PRO-0001 or INV-0002 all match."
          />
        </Card>
      ) : hits.length === 0 ? (
        <Card>
          <EmptyState
            title={`Nothing matches “${term}”`}
            hint="Try part of a name, an email address, or a document number."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <Card key={group.kind}>
              <div className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {group.kind}s
                  <span className="ml-2 text-slate-400">{group.hits.length}</span>
                </h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {group.hits.map((hit) => (
                  <li key={`${hit.kind}-${hit.href}-${hit.title}`}>
                    <Link
                      href={hit.href}
                      className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{hit.title}</p>
                        {hit.subtitle && (
                          <p className="truncate text-xs text-slate-500">{hit.subtitle}</p>
                        )}
                      </div>
                      {hit.badge && <Badge value={hit.badge} />}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
