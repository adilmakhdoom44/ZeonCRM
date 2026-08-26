import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ageDebts, bucketFor, daysOverdue } from "@/lib/ageing";

const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h, 0, 0, 0);
const NOW = at(2026, 8, 21);

describe("daysOverdue", () => {
  test("counts whole days past the due date", () => {
    assert.equal(daysOverdue(at(2026, 8, 11), NOW), 10);
  });

  test("due yesterday afternoon is one day late this morning, not zero", () => {
    // Compared date-to-date, not by elapsed milliseconds — which is how anyone
    // chasing the money would describe it.
    assert.equal(daysOverdue(at(2026, 8, 20, 17), at(2026, 8, 21, 8)), 1);
  });

  test("due today is not yet late", () => {
    assert.equal(daysOverdue(at(2026, 8, 21, 23), NOW), 0);
  });

  test("a future date is never negative", () => {
    assert.equal(daysOverdue(at(2026, 9, 30), NOW), 0);
  });

  test("no due date cannot be late", () => {
    assert.equal(daysOverdue(null, NOW), 0);
  });

  test("accepts an ISO string", () => {
    assert.equal(daysOverdue(at(2026, 8, 1).toISOString(), NOW), 20);
  });
});

describe("bucketFor", () => {
  test("not yet due sits in current", () => {
    assert.equal(bucketFor(at(2026, 9, 1), NOW), "CURRENT");
    assert.equal(bucketFor(at(2026, 8, 21), NOW), "CURRENT");
  });

  test("no due date counts as current — nothing was ever agreed to be late against", () => {
    assert.equal(bucketFor(null, NOW), "CURRENT");
  });

  test("each boundary lands in the bucket you would say out loud", () => {
    assert.equal(bucketFor(at(2026, 8, 20), NOW), "D1_30"); // 1 day
    assert.equal(bucketFor(at(2026, 7, 22), NOW), "D1_30"); // 30 days
    assert.equal(bucketFor(at(2026, 7, 21), NOW), "D31_60"); // 31 days
    assert.equal(bucketFor(at(2026, 6, 22), NOW), "D31_60"); // 60 days
    assert.equal(bucketFor(at(2026, 6, 21), NOW), "D61_90"); // 61 days
    assert.equal(bucketFor(at(2026, 5, 23), NOW), "D61_90"); // 90 days
    assert.equal(bucketFor(at(2026, 5, 22), NOW), "D90_PLUS"); // 91 days
  });

  test("very old debt stays in the last bucket rather than falling off", () => {
    assert.equal(bucketFor(at(2023, 1, 1), NOW), "D90_PLUS");
  });
});

describe("ageDebts", () => {
  test("totals each bucket and keeps them all, so the table has no gaps", () => {
    const rows = ageDebts(
      [
        { dueDate: at(2026, 9, 1), balance: 100 },
        { dueDate: at(2026, 8, 15), balance: 250 },
        { dueDate: at(2026, 8, 10), balance: 250 },
        { dueDate: at(2026, 5, 1), balance: 999.99 },
      ],
      NOW,
    );

    assert.equal(rows.length, 5);
    const totals = Object.fromEntries(rows.map((r) => [r.bucket, r.total]));
    assert.deepEqual(totals, {
      CURRENT: 100,
      D1_30: 500,
      D31_60: 0,
      D61_90: 0,
      D90_PLUS: 999.99,
    });
  });

  test("every debt lands in exactly one bucket", () => {
    const debts = [
      { dueDate: at(2026, 9, 1), balance: 1 },
      { dueDate: at(2026, 8, 1), balance: 1 },
      { dueDate: at(2026, 7, 1), balance: 1 },
      { dueDate: at(2026, 6, 1), balance: 1 },
      { dueDate: at(2026, 1, 1), balance: 1 },
    ];
    const rows = ageDebts(debts, NOW);
    assert.equal(rows.reduce((sum, r) => sum + r.items.length, 0), debts.length);
    assert.equal(rows.reduce((sum, r) => sum + r.total, 0), 5);
  });

  test("nothing owed gives five empty buckets, not an empty list", () => {
    const rows = ageDebts([], NOW);
    assert.equal(rows.length, 5);
    assert.ok(rows.every((r) => r.total === 0 && r.items.length === 0));
  });
});
