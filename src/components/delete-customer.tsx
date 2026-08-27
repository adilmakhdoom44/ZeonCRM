"use client";

import { useState } from "react";
import { deleteCustomerAction } from "@/lib/actions/customers";
import { Card, CardHeader } from "@/components/ui";

export type DeletionImpact = {
  contacts: number;
  addresses: number;
  projects: number;
  proposals: number;
  invoices: number;
  payments: number;
  expenses: number;
  activities: number;
  recurring: number;
};

const LABELS: Record<keyof DeletionImpact, [string, string]> = {
  contacts: ["contact", "contacts"],
  addresses: ["address", "addresses"],
  projects: ["project", "projects"],
  proposals: ["quote", "quotes"],
  invoices: ["invoice", "invoices"],
  payments: ["recorded payment", "recorded payments"],
  expenses: ["logged cost", "logged costs"],
  activities: ["timeline entry", "timeline entries"],
  recurring: ["repeating invoice", "repeating invoices"],
};

/**
 * Deleting a customer takes its whole financial history with it — invoices,
 * the payments recorded against them, costs, the lot. Typing the name is the
 * price of that: it is the difference between an accident and a decision.
 */
export function DeleteCustomer({
  id,
  name,
  impact,
}: {
  id: string;
  name: string;
  impact: DeletionImpact;
}) {
  const [typed, setTyped] = useState("");

  const losses = (Object.keys(LABELS) as (keyof DeletionImpact)[])
    .filter((key) => impact[key] > 0)
    .map((key) => {
      const [one, many] = LABELS[key];
      return `${impact[key]} ${impact[key] === 1 ? one : many}`;
    });

  const confirmed = typed.trim() === name;

  return (
    <Card className="mt-6 border-red-200">
      <CardHeader
        title="Delete this customer"
        description={
          losses.length === 0
            ? "Nothing else is attached to this account."
            : "This cannot be undone, and it does not stop at the account itself."
        }
      />
      <div className="space-y-4 px-5 py-4">
        {losses.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-900">Deleting {name} also destroys:</p>
            <ul className="mt-1.5 list-inside list-disc text-sm text-red-700">
              {losses.map((loss) => (
                <li key={loss}>{loss}</li>
              ))}
            </ul>
            {impact.payments > 0 && (
              <p className="mt-2 text-xs text-red-700">
                That includes money you have recorded as received. Consider marking the account
                inactive instead.
              </p>
            )}
          </div>
        )}

        <form action={deleteCustomerAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-700">
              Type <strong className="font-semibold">{name}</strong> to confirm
            </span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-2 focus:outline-red-100"
            />
          </label>
          <button
            type="submit"
            disabled={!confirmed}
            className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete customer
          </button>
        </form>
      </div>
    </Card>
  );
}
