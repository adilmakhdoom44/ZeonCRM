import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { addDays, isDue, nextRun } from "@/lib/recurring";

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 0, 0, 0);
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

describe("nextRun — weekly", () => {
  test("moves on seven days", () => {
    assert.equal(iso(nextRun(at(2026, 8, 17), "WEEKLY")), "2026-08-24");
  });

  test("crosses a month boundary", () => {
    assert.equal(iso(nextRun(at(2026, 8, 28), "WEEKLY")), "2026-09-04");
  });
});

describe("nextRun — monthly", () => {
  test("keeps the same day of the month", () => {
    assert.equal(iso(nextRun(at(2026, 1, 15), "MONTHLY")), "2026-02-15");
  });

  test("crosses the year boundary", () => {
    assert.equal(iso(nextRun(at(2026, 12, 10), "MONTHLY")), "2027-01-10");
  });

  test("the 31st clamps to the end of a short month instead of overflowing", () => {
    // Naive date maths turns 31 January + 1 month into 3 March. It must be 28 Feb.
    assert.equal(iso(nextRun(at(2026, 1, 31), "MONTHLY")), "2026-02-28");
  });

  test("the 31st clamps to 30 in a thirty-day month", () => {
    assert.equal(iso(nextRun(at(2026, 3, 31), "MONTHLY")), "2026-04-30");
  });

  test("February in a leap year gets its 29th", () => {
    assert.equal(iso(nextRun(at(2028, 1, 31), "MONTHLY")), "2028-02-29");
  });

  test("an anchor day restores the original date after a short month", () => {
    // This is the bug the anchor exists to prevent: without it, a 31st schedule
    // clamps to 28 Feb and then stays on the 28th for the rest of its life.
    const february = nextRun(at(2026, 1, 31), "MONTHLY");
    assert.equal(iso(february), "2026-02-28");
    assert.equal(iso(nextRun(february, "MONTHLY", 31)), "2026-03-31");
  });
});

describe("nextRun — quarterly and yearly", () => {
  test("quarterly moves three months", () => {
    assert.equal(iso(nextRun(at(2026, 1, 15), "QUARTERLY")), "2026-04-15");
  });

  test("quarterly crosses the year", () => {
    assert.equal(iso(nextRun(at(2026, 11, 5), "QUARTERLY")), "2027-02-05");
  });

  test("yearly moves twelve months", () => {
    assert.equal(iso(nextRun(at(2026, 6, 30), "YEARLY")), "2027-06-30");
  });

  test("29 February yearly falls back to the 28th in a common year", () => {
    assert.equal(iso(nextRun(at(2028, 2, 29), "YEARLY")), "2029-02-28");
  });
});

describe("isDue", () => {
  const now = at(2026, 8, 17);

  test("a past date is due", () => {
    assert.equal(isDue(at(2026, 8, 1), now), true);
  });

  test("today is due — it counts to the end of the day", () => {
    assert.equal(isDue(at(2026, 8, 17), now), true);
    assert.equal(isDue(new Date(2026, 7, 17, 23, 30), now), true);
  });

  test("tomorrow is not", () => {
    assert.equal(isDue(at(2026, 8, 18), now), false);
  });
});

describe("addDays", () => {
  test("adds without mutating the original", () => {
    const start = at(2026, 8, 17);
    assert.equal(iso(addDays(start, 30)), "2026-09-16");
    assert.equal(iso(start), "2026-08-17");
  });
});
