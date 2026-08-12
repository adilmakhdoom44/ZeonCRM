import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { Card, EmptyState, PageHeader } from "@/components/ui";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const ACTION_TONES: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-700",
  updated: "bg-brand-50 text-brand-700",
  assigned: "bg-violet-50 text-violet-700",
  sent: "bg-sky-50 text-sky-700",
  paid: "bg-emerald-50 text-emerald-700",
  deleted: "bg-red-50 text-red-600",
};

/** Where an entity still exists, link to it — a log you cannot follow is half a log. */
function hrefFor(entity: string, entityId: string) {
  switch (entity) {
    case "Customer":
      return `/customers/${entityId}`;
    case "Project":
      return `/projects?focus=${entityId}`;
    case "Proposal":
      return `/proposals/${entityId}`;
    case "Invoice":
      return `/invoices/${entityId}`;
    default:
      return null;
  }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  await requireAdmin();
  const { entity } = await searchParams;

  const entries = await prisma.auditLog.findMany({
    where: entity ? { entity } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const entities = ["Customer", "Project", "Proposal", "Invoice", "Payment"];

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Who changed what. Written alongside the change and never edited."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/settings/audit"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !entity
              ? "bg-ink-900 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Everything
        </Link>
        {entities.map((name) => (
          <Link
            key={name}
            href={`/settings/audit?entity=${name}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              entity === name
                ? "bg-ink-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {name}s
          </Link>
        ))}
      </div>

      <Card>
        {entries.length === 0 ? (
          <EmptyState
            title="Nothing recorded yet"
            hint="Changes to customers, projects, invoices and payments are logged here as they happen."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const href = entry.action === "deleted" ? null : hrefFor(entry.entity, entry.entityId);
              const body = (
                <div className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        ACTION_TONES[entry.action] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {entry.action}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-900">{entry.summary}</p>
                      <p className="text-xs text-slate-500">
                        {entry.actorName} · {entry.entity}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-slate-400">
                    {dateFmt.format(entry.createdAt)}
                  </span>
                </div>
              );

              return (
                <li key={entry.id}>
                  {href ? (
                    <Link href={href} className="block transition-colors hover:bg-slate-50">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
