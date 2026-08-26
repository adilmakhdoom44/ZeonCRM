import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { CATEGORY_LABELS, type ExpenseCategory } from "@/lib/profit";
import { csvFilename, toCsv } from "@/lib/csv";

/**
 * Costs as a spreadsheet — the other half of what an accountant asks for, and
 * the one financial record that could not yet leave the app. Rows carry the
 * project and customer so spend can be grouped either way at the other end.
 */
export async function GET() {
  await requireUser();

  const expenses = await prisma.expense.findMany({
    orderBy: { incurredAt: "desc" },
    include: {
      project: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });

  const rows = expenses.map((expense) => [
    expense.incurredAt,
    expense.description,
    CATEGORY_LABELS[expense.category as ExpenseCategory] ?? expense.category,
    expense.project?.name ?? "",
    expense.customer?.name ?? "",
    expense.billable ? "yes" : "no",
    Number(expense.amount).toFixed(2),
    expense.notes ?? "",
  ]);

  const csv = toCsv(
    ["Date", "Description", "Category", "Project", "Customer", "Rechargeable", "Amount", "Notes"],
    rows,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("expenses")}"`,
      "Cache-Control": "no-store",
    },
  });
}
