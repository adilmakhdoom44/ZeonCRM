import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, lineTotal, round2, totals } from "@/lib/money";

describe("round2", () => {
  test("rounds to two places", () => {
    assert.equal(round2(1.005), 1.01);
    assert.equal(round2(2.675), 2.68);
  });

  test("survives the classic float error", () => {
    // 0.1 + 0.2 === 0.30000000000000004 — the reason round2 exists at all.
    assert.equal(round2(0.1 + 0.2), 0.3);
  });
});

describe("lineTotal", () => {
  test("multiplies quantity by unit price", () => {
    assert.equal(lineTotal({ quantity: 12, unitPrice: 450 }), 5400);
  });

  test("rounds fractional quantities rather than carrying the error", () => {
    // 3.33 × 99.99 = 332.9667
    assert.equal(lineTotal({ quantity: 3.33, unitPrice: 99.99 }), 332.97);
  });

  test("a zero line is worth nothing, not NaN", () => {
    assert.equal(lineTotal({ quantity: 0, unitPrice: 1200 }), 0);
  });
});

describe("totals", () => {
  test("matches the worked example from the seeded quote", () => {
    const result = totals(
      [
        { quantity: 1, unitPrice: 2400 },
        { quantity: 12, unitPrice: 450 },
      ],
      8.5,
    );
    assert.deepEqual(result, { subtotal: 7800, tax: 663, total: 8463 });
  });

  test("no tax means total equals subtotal", () => {
    const result = totals([{ quantity: 2, unitPrice: 50 }], 0);
    assert.deepEqual(result, { subtotal: 100, tax: 0, total: 100 });
  });

  test("an empty document is zero, not NaN", () => {
    assert.deepEqual(totals([], 20), { subtotal: 0, tax: 0, total: 0 });
  });

  test("tax is computed on the rounded subtotal, so the parts always sum to the total", () => {
    const result = totals(
      [
        { quantity: 3, unitPrice: 33.33 },
        { quantity: 7, unitPrice: 11.11 },
      ],
      17.5,
    );
    assert.equal(round2(result.subtotal + result.tax), result.total);
  });
});

describe("formatMoney", () => {
  test("defaults to USD", () => {
    assert.equal(formatMoney(8463), "$8,463.00");
  });

  test("honours a currency from settings", () => {
    assert.match(formatMoney(1000, "GBP"), /1,000\.00/);
    assert.ok(formatMoney(1000, "GBP").includes("£"));
  });

  test("falls back rather than throwing on a bad currency code", () => {
    // Someone can type anything into the settings field; a page must not die for it.
    assert.doesNotThrow(() => formatMoney(10, "NOTACODE"));
  });

  test("non-finite input reads as zero instead of 'NaN'", () => {
    assert.equal(formatMoney(Number.NaN), "$0.00");
    assert.equal(formatMoney(Number.POSITIVE_INFINITY), "$0.00");
  });
});
