import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { effectiveInvoiceStatus, invoiceTotals, isInvoiceEditable } from "@/lib/invoices";

const DAY = 86_400_000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

const items = [{ quantity: 1, unitPrice: 4000 }];

describe("invoiceTotals", () => {
  test("balance is the total less what has been received", () => {
    const money = invoiceTotals(items, 0, [{ amount: 1500 }]);
    assert.deepEqual(money, { subtotal: 4000, tax: 0, total: 4000, paid: 1500, balance: 2500 });
  });

  test("sums multiple receipts", () => {
    const money = invoiceTotals(items, 0, [{ amount: 1000 }, { amount: 500.5 }, { amount: 99.5 }]);
    assert.equal(money.paid, 1600);
    assert.equal(money.balance, 2400);
  });

  test("no payments leaves the full total owing", () => {
    assert.equal(invoiceTotals(items, 0, []).balance, 4000);
  });

  test("an overpayment produces a negative balance rather than clamping", () => {
    // Clamping here would hide a real bookkeeping mistake.
    assert.equal(invoiceTotals(items, 0, [{ amount: 4500 }]).balance, -500);
  });

  test("tax is included in what is owed", () => {
    const money = invoiceTotals(items, 8.5, []);
    assert.equal(money.total, 4340);
    assert.equal(money.balance, 4340);
  });
});

describe("effectiveInvoiceStatus", () => {
  test("a draft stays a draft even with a due date long past", () => {
    assert.equal(effectiveInvoiceStatus({ status: "DRAFT", dueDate: daysFromNow(-30) }, 4000), "DRAFT");
  });

  test("a cancelled invoice is never overdue", () => {
    assert.equal(
      effectiveInvoiceStatus({ status: "CANCELLED", dueDate: daysFromNow(-30) }, 4000),
      "CANCELLED",
    );
  });

  test("settling the balance reads as paid without anyone setting it", () => {
    assert.equal(effectiveInvoiceStatus({ status: "SENT", dueDate: daysFromNow(5) }, 0), "PAID");
  });

  test("past due with a balance reads as overdue", () => {
    assert.equal(effectiveInvoiceStatus({ status: "SENT", dueDate: daysFromNow(-1) }, 2500), "OVERDUE");
  });

  test("overdue beats partially paid — the money being late is the point", () => {
    assert.equal(
      effectiveInvoiceStatus({ status: "PARTIALLY_PAID", dueDate: daysFromNow(-6) }, 2500),
      "OVERDUE",
    );
  });

  test("part paid and still in date reads as partially paid", () => {
    assert.equal(
      effectiveInvoiceStatus({ status: "PARTIALLY_PAID", dueDate: daysFromNow(6) }, 2500),
      "PARTIALLY_PAID",
    );
  });

  test("due today is not yet overdue", () => {
    const endOfToday = new Date();
    endOfToday.setHours(12, 0, 0, 0);
    assert.equal(effectiveInvoiceStatus({ status: "SENT", dueDate: endOfToday }, 100), "SENT");
  });

  test("no due date can never be overdue", () => {
    assert.equal(effectiveInvoiceStatus({ status: "SENT", dueDate: null }, 4000), "SENT");
  });
});

describe("isInvoiceEditable", () => {
  test("only drafts are editable", () => {
    assert.equal(isInvoiceEditable({ status: "DRAFT" }), true);
    for (const status of ["SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"]) {
      assert.equal(isInvoiceEditable({ status }), false, `${status} must be locked`);
    }
  });
});
