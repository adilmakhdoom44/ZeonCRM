import Link from "next/link";
import { ReactNode } from "react";
import { requireUser } from "@/lib/authz";
import { logoutAction } from "@/lib/actions/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/customers", label: "Customers", icon: "◉" },
  { href: "/projects", label: "Projects", icon: "▤" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-10 flex w-60 flex-col bg-ink-900">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-base font-bold text-white">
            Z
          </div>
          <span className="text-base font-semibold tracking-tight text-white">
            Zeon CRM
          </span>
        </div>

        <nav className="mt-2 flex-1 space-y-0.5 px-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-ink-700 hover:text-white"
            >
              <span aria-hidden className="text-xs opacity-70">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
          {user.role === "ADMIN" && (
            <>
              <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Admin
              </p>
              <Link
                href="/settings/users"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-ink-700 hover:text-white"
              >
                <span aria-hidden className="text-xs opacity-70">
                  ◎
                </span>
                Users
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-ink-700 px-5 py-4">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
          <form action={logoutAction} className="mt-3">
            <button className="text-xs font-medium text-slate-400 transition-colors hover:text-white">
              Sign out →
            </button>
          </form>
        </div>
      </aside>

      <main className="ml-60 flex-1 px-8 py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
