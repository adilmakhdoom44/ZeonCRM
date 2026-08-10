import Link from "next/link";
import { ReactNode } from "react";
import { requireUser } from "@/lib/authz";
import { logoutAction } from "@/lib/actions/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/proposals", label: "Proposals" },
  { href: "/projects", label: "Projects" },
  { href: "/invoices", label: "Invoices" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              Z
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight text-white sm:block">
              Zeon CRM
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-ink-700 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            {user.role === "ADMIN" && (
              <Link
                href="/settings/users"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-ink-700 hover:text-white"
              >
                Users
              </Link>
            )}
          </nav>

          <form action="/search" className="ml-auto hidden min-w-0 lg:block">
            <input
              type="search"
              name="q"
              placeholder="Search everything…"
              aria-label="Search"
              className="w-44 rounded-lg border border-ink-700 bg-ink-800 px-3 py-1.5 text-sm text-white transition-[width] placeholder:text-slate-500 focus:w-56 focus:border-brand-500 focus:outline-none"
            />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-3 lg:ml-0">
            <span className="hidden text-sm text-slate-300 md:block">{user.name}</span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-700 text-xs font-semibold text-white"
              title={user.email ?? undefined}
            >
              {(user.name ?? "?")
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <form action={logoutAction}>
              <button className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-ink-700 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
