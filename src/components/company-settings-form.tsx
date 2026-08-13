"use client";

import { useState, useTransition } from "react";
import { saveCompanySettingsAction } from "@/lib/actions/settings";
import type { Company } from "@/lib/company";
import { Card, CardHeader } from "@/components/ui";

const fieldCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100";

export function CompanySettingsForm({ company }: { company: Company }) {
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    startTransition(async () => {
      const result = await saveCompanySettingsAction(formData);
      setStatus(
        result.ok
          ? { ok: true, message: "Saved — proposals and invoices will use these details." }
          : { ok: false, message: result.error },
      );
    });
  }

  return (
    <Card>
      <CardHeader
        title="Company profile"
        description="Printed at the top of every proposal and invoice, and used in the emails you send."
      />
      <form action={save} className="space-y-4 p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Business name</span>
          <input name="name" required defaultValue={company.name} className={`${fieldCls} w-full`} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              defaultValue={company.email}
              placeholder="hello@yourstudio.com"
              className={`${fieldCls} w-full`}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone</span>
            <input
              name="phone"
              defaultValue={company.phone}
              placeholder="+1 415 555 0100"
              className={`${fieldCls} w-full`}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Address</span>
          <input
            name="address"
            defaultValue={company.address}
            placeholder="14 Riverside Business Park, London"
            className={`${fieldCls} w-full`}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Currency</span>
            <input
              name="currency"
              defaultValue={company.currency}
              maxLength={3}
              placeholder="USD"
              className={`${fieldCls} w-full uppercase`}
            />
            <span className="mt-1 block text-xs text-slate-500">
              Three-letter code — USD, GBP, EUR, PKR.
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Default tax rate
            </span>
            <input
              name="taxRate"
              inputMode="decimal"
              defaultValue={String(company.taxRate)}
              className={`${fieldCls} w-full`}
            />
            <span className="mt-1 block text-xs text-slate-500">
              A starting point for new documents; each one can still be changed.
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save settings"}
          </button>
          {status && (
            <span className={`text-sm ${status.ok ? "text-emerald-700" : "text-red-600"}`}>
              {status.message}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
