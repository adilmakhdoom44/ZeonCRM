import Link from "next/link";

const TABS = [
  { href: "/reports/profitability", label: "Profitability" },
  { href: "/reports/debtors", label: "Who owes you" },
];

/**
 * Reports share one entry in the top bar and separate here, the same way
 * settings do. Adding a seventh link to the header crowded the search box out
 * once already.
 */
export function ReportsNav({ active }: { active: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            active === tab.href
              ? "bg-ink-900 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
