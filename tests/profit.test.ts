import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { byCategory, margin, marginTone, sumExpenses } from "@/lib/profit";

describe("margin", () => {
  test("profit is revenue less cost", () => {
    const result = margin(10000, 4000);
    assert.equal(result.profit, 6000);
    assert.equal(result.marginPct, 60);
  });

  test("a job that cost more than it earned shows a loss, not zero", () => {
    const result = margin(1000, 1500);
    assert.equal(result.profit, -500);
    assert.equal(result.marginPct, -50);
  });

  test("no cost means the whole thing is profit", () => {
    assert.equal(margin(2500, 0).marginPct, 100);
  });

  test("no revenue gives an unknown margin, not 0%", () => {
    // A job with no agreed price has an unknown margin. Showing 0% against
    // unbilled work reads as a loss it has not made.
    const result = margin(0, 300);
    assert.equal(result.marginPct, null);
    assert.equal(result.profit, -300);
  });

  test("nothing at all is zero across the board, with no margin to report", () => {
    assert.deepEqual(margin(0, 0), { revenue: 0, cost: 0, profit: 0, marginPct: null });
  });

  test("rounds to two places rather than carrying float error", () => {
    const result = margin(0.1 + 0.2, 0.1);
    assert.equal(result.revenue, 0.3);
    assert.equal(result.profit, 0.2);
  });

  test("non-finite input is treated as zero instead of poisoning the total", () => {
    assert.equal(margin(Number.NaN, 100).revenue, 0);
    assert.equal(margin(1000, Number.POSITIVE_INFINITY).cost, 0);
  });
});

describe("sumExpenses", () => {
  test("adds them up", () => {
    assert.equal(sumExpenses([{ amount: 120.5 }, { amount: 79.5 }, { amount: 1000 }]), 1200);
  });

  test("no expenses is zero, not NaN", () => {
    assert.equal(sumExpenses([]), 0);
  });

  test("rounds the total, so a list of thirds does not drift", () => {
    assert.equal(sumExpenses([{ amount: 33.333 }, { amount: 33.333 }, { amount: 33.334 }]), 100);
  });
});

describe("byCategory", () => {
  test("combines rows sharing a category", () => {
    const result = byCategory([
      { amount: 500, category: "SUBCONTRACTOR" },
      { amount: 250, category: "SUBCONTRACTOR" },
      { amount: 90, category: "SOFTWARE" },
    ]);
    assert.deepEqual(result, [
      { category: "SUBCONTRACTOR", amount: 750 },
      { category: "SOFTWARE", amount: 90 },
    ]);
  });

  test("orders by spend so the biggest cost reads first", () => {
    const result = byCategory([
      { amount: 10, category: "TRAVEL" },
      { amount: 900, category: "HARDWARE" },
      { amount: 100, category: "SOFTWARE" },
    ]);
    assert.deepEqual(result.map((r) => r.category), ["HARDWARE", "SOFTWARE", "TRAVEL"]);
  });

  test("nothing spent is an empty list", () => {
    assert.deepEqual(byCategory([]), []);
  });
});

describe("marginTone", () => {
  test("healthy, thin, under water, and unknown each read differently", () => {
    assert.match(marginTone(45), /emerald/);
    assert.match(marginTone(12), /amber/);
    assert.match(marginTone(-5), /red/);
    assert.match(marginTone(null), /slate/);
  });

  test("the boundary at 20% counts as healthy", () => {
    assert.match(marginTone(20), /emerald/);
    assert.match(marginTone(19.99), /amber/);
  });
});
