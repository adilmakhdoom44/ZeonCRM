import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { retryMessage } from "@/lib/rate-limit";
import { Button, Input } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; throttled?: string }>;
}) {
  const params = await searchParams;
  const throttledFor = Number(params.throttled);

  return (
    <div>
      <div className="mb-8 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white">
            Z
          </div>
          <span className="text-lg font-semibold tracking-tight">Zeon CRM</span>
        </div>
      </div>

      <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500">
        Welcome back. Enter your details to continue.
      </p>

      {params.error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Invalid email or password.
        </p>
      )}
      {Number.isFinite(throttledFor) && throttledFor > 0 && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {retryMessage(throttledFor)}
        </p>
      )}
      {params.reset && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Password updated. Sign in with your new password.
        </p>
      )}

      <form action={loginAction} className="mt-6 space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        <Button className="w-full">Sign in</Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
          Forgot your password?
        </Link>
      </p>
    </div>
  );
}
