"use client";

import { useRef, useState, useTransition } from "react";
import { addExpenseAction, deleteExpenseAction } from "@/lib/actions/expenses";
import { formatMoney } from "@/lib/money";
import { CATEGORY_LABELS, EXPENSE_CATEGORIES, marginTone, type ExpenseCategory } from "@/lib/profit";

export type ProjectExpense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  billable: boolean;
  incurredAt: string;
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

const fieldCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-100";

export function ProjectExpenses({
  projectId,
  expenses,
  price,
  currency,
}: {
  projectId: string;
  expenses: ProjectExpense[];
  price: number | null;
  currency: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cost = expenses.reduce((total, expense) => total + expense.amount, 0);
  const revenue = price ?? 0;
  const profit = revenue - cost;
  const marginPct = revenue === 0 ? null : (profit / revenue) * 100;

  function add(formData: FormData) {
    startTransition(async () => {
      const result = await addExpenseAction(projectId, formData);
      if (result.ok) {
        setError(null);
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Costs & margin
      </p>

      <div className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <span className="text-slate-500">
          Price{" "}
          <span className="font-medium tabular-nums text-slate-900">
            {price === null ? "—" : formatMoney(revenue, currency)}
          </span>
        </span>
        <span className="text-slate-500">
          Costs{" "}
          <span className="font-medium tabular-nums text-slate-900">
            {formatMoney(cost, currency)}
          </span>
        </span>
        <span className="text-slate-500">
          Profit{" "}
          <span className={`font-medium tabular-nums ${marginTone(marginPct)}`}>
            {formatMoney(profit, currency)}
            {marginPct !== null && ` · ${marginPct.toFixed(0)}%`}
          </span>
        </span>
        {price === null && (
          <span className="text-xs text-slate-400">Set a price to see the margin.</span>
        )}
      </div>

      {expenses.length > 0 && (
        <ul className="mb-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {expenses.map((expense) => (
            <li key={expense.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-900">
                  {expense.description}
                  {expense.billable && (
                    <span className="ml-2 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                      rechargeable
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {CATEGORY_LABELS[expense.category as ExpenseCategory] ?? expense.category} ·{" "}
                  {dateFmt.format(new Date(expense.incurredAt))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-medium tabular-nums text-slate-900">
                  {formatMoney(expense.amount, currency)}
                </span>
                <form action={deleteExpenseAction}>
                  <input type="hidden" name="id" value={expense.id} />
                  <button
                    title="Remove cost"
                    aria-label={`Remove ${expense.description}`}
                    className="text-slate-300 transition-colors hover:text-red-500"
                  >
                    ✕
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={add} className="flex flex-wrap items-center gap-2">
        <input
          name="description"
          required
          placeholder="What did it cost you?"
          className={`${fieldCls} min-w-44 flex-1`}
        />
        <input
          name="amount"
          inputMode="decimal"
          required
          placeholder="0.00"
          aria-label="Amount"
          className={`${fieldCls} w-24 text-right tabular-nums`}
        />
        <select name="category" defaultValue="OTHER" aria-label="Category" className={fieldCls}>
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
        <input
          name="incurredAt"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          aria-label="Date"
          className={fieldCls}
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" name="billable" className="rounded border-slate-300" />
          Rechargeable
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add cost"}
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
