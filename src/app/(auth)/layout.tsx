import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-ink-900 p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white">
            Z
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            Zeon CRM
          </span>
        </div>
        <div>
          <p className="max-w-md text-2xl font-medium leading-snug text-white">
            Every customer, contact and project — organised in one place.
          </p>
          <p className="mt-4 text-sm text-slate-400">
            Built for teams that want a CRM without the clutter.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Zeon CRM
        </p>
      </div>
      <div className="flex w-full items-center justify-center bg-background px-6 lg:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
