import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import {
  createUserAction,
  toggleUserActiveAction,
  generateResetLinkAction,
} from "@/lib/actions/users";
import { Badge, Button, Card, CardHeader, Input, PageHeader, Select } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";

const errorMessages: Record<string, string> = {
  invalid: "Please fill all fields — passwords need at least 8 characters.",
  exists: "A user with that email already exists.",
  self: "You can't deactivate your own account.",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; link?: string; for?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <SettingsNav active="/settings/users" />
      <PageHeader
        title="Users"
        description="Manage who can sign in to Zeon CRM."
      />

      {params.error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {errorMessages[params.error] ?? "Something went wrong."}
        </p>
      )}
      {params.created && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          User created. They can sign in with the password you set.
        </p>
      )}
      {params.link && (
        <div className="mb-4 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">
            Password reset link for {params.for} (valid for 1 hour):
          </p>
          <code className="mt-1 block break-all rounded bg-white px-2 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200">
            {params.link}
          </code>
          <p className="mt-1.5 text-xs text-slate-500">
            Share this link with them over a private channel.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Team" />
          <ul className="divide-y divide-slate-100">
            {users.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {user.name}
                    {user.id === admin.id && (
                      <span className="ml-2 text-xs text-slate-400">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge value={user.role} />
                  {!user.isActive && (
                    <span className="text-xs font-medium text-red-500">Deactivated</span>
                  )}
                  <form action={generateResetLinkAction}>
                    <input type="hidden" name="id" value={user.id} />
                    <button className="text-xs font-medium text-slate-500 hover:text-brand-600">
                      Reset link
                    </button>
                  </form>
                  {user.id !== admin.id && (
                    <form action={toggleUserActiveAction}>
                      <input type="hidden" name="id" value={user.id} />
                      <button
                        className={`text-xs font-medium ${
                          user.isActive
                            ? "text-slate-500 hover:text-red-500"
                            : "text-slate-500 hover:text-emerald-600"
                        }`}
                      >
                        {user.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="self-start">
          <CardHeader title="Add user" description="They sign in with the password you set here." />
          <form action={createUserAction} className="space-y-4 px-5 py-4">
            <Input label="Full name" name="name" required />
            <Input label="Email" name="email" type="email" required />
            <Input label="Temporary password" name="password" type="password" required />
            <Select
              label="Role"
              name="role"
              defaultValue="MEMBER"
              options={[
                { value: "MEMBER", label: "Member" },
                { value: "ADMIN", label: "Admin" },
              ]}
            />
            <Button className="w-full">Create user</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
