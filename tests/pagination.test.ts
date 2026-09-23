import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { pageFrom, PAGE_SIZE } from "@/lib/pagination";

describe("pageFrom", () => {
  test("no page in the URL means page 1", () => {
    assert.equal(pageFrom(undefined, 100), 1);
  });

  test("garbage in the URL falls back to page 1 rather than NaN", () => {
    assert.equal(pageFrom("not-a-number", 100), 1);
    assert.equal(pageFrom("", 100), 1);
  });

  test("zero or negative pages are not real pages", () => {
    assert.equal(pageFrom("0", 100), 1);
    assert.equal(pageFrom("-3", 100), 1);
  });

  test("clamps a page past the end of the list to the last real page", () => {
    // 100 rows at PAGE_SIZE 25 is 4 pages; page 9 does not exist.
    assert.equal(pageFrom("9", 100), 4);
  });

  test("an empty list still has one (empty) page, never zero", () => {
    assert.equal(pageFrom("5", 0), 1);
  });

  test("a fractional page number truncates rather than rounding up past the list", () => {
    assert.equal(pageFrom("1.9", 100), 1);
  });

  test("a valid mid-range page passes straight through", () => {
    assert.equal(pageFrom("2", 100), 2);
  });

  test(`exactly one full page of rows is still a single page (PAGE_SIZE = ${PAGE_SIZE})`, () => {
    assert.equal(pageFrom("2", PAGE_SIZE), 1);
  });
});
