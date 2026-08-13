import Link from "next/link";

const TABS = [
  { href: "/settings/company", label: "Company" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/audit", label: "Audit log" },
];

/**
 * Admin pages share one entry in the top bar and separate here. Three more
 * links in the header crowded out the search box on a laptop, and settings are
 * somewhere you go once, not somewhere you need one click away.
 */
export function SettingsNav({ active }: { active: string }) {
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
