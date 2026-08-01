import Link from "next/link";
import { resetPasswordAction } from "@/lib/actions/auth";
import { Button, Input } from "@/components/ui";

const errorMessages: Record<string, string> = {
  short: "Password must be at least 8 characters.",
  mismatch: "Passwords do not match.",
  invalid: "This reset link is invalid or has expired. Request a new one.",
};

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const action = resetPasswordAction.bind(null, token);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Choose a new password</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your new password must be at least 8 characters.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessages[error] ?? "Something went wrong."}
        </p>
      )}

      <form action={action} className="mt-6 space-y-4">
        <Input
          label="New password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
        />
        <Button className="w-full">Update password</Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
