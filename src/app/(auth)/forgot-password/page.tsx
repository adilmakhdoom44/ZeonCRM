import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { Button, Input } from "@/components/ui";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Reset password</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter your account email and we&apos;ll generate a reset link for you.
      </p>

      {params.sent ? (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          If an account exists for that email, a reset link has been generated.
          Contact your administrator to receive it, or check the server logs in
          development.
        </div>
      ) : (
        <form action={requestPasswordResetAction} className="mt-6 space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
          />
          <Button className="w-full">Generate reset link</Button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
