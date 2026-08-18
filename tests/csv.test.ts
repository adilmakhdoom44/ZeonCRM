import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { csvFilename, toCsv } from "@/lib/csv";

const body = (csv: string) => csv.replace(/^﻿/, "").trimEnd().split("\r\n");

describe("toCsv", () => {
  test("writes a header and a row", () => {
    assert.deepEqual(body(toCsv(["A", "B"], [[1, 2]])), ["A,B", "1,2"]);
  });

  test("quotes a field containing a comma", () => {
    // Without this, one customer name shifts every later column in the row.
    assert.deepEqual(body(toCsv(["Name"], [["Smith, Jones & Co"]])), [
      "Name",
      '"Smith, Jones & Co"',
    ]);
  });

  test("doubles embedded quotes", () => {
    assert.deepEqual(body(toCsv(["Note"], [['He said "yes"']])), ["Note", '"He said ""yes"""']);
  });

  test("quotes a field containing a newline", () => {
    const csv = toCsv(["Note"], [["line one\nline two"]]);
    assert.ok(csv.includes('"line one\nline two"'));
  });

  test("empty and missing values become empty cells, not 'null'", () => {
    assert.deepEqual(body(toCsv(["A", "B", "C"], [[null, undefined, ""]])), ["A,B,C", ",,"]);
  });

  test("dates are written as plain calendar dates", () => {
    assert.deepEqual(body(toCsv(["Due"], [[new Date(Date.UTC(2026, 7, 18))]])), [
      "Due",
      "2026-08-18",
    ]);
  });

  test("neutralises a field a spreadsheet would treat as a formula", () => {
    // =1+1 or @SUM in a cell is the classic CSV injection route.
    assert.deepEqual(body(toCsv(["X"], [["=1+1"]])), ["X", "'=1+1"]);
    assert.deepEqual(body(toCsv(["X"], [["@SUM(A1)"]])), ["X", "'@SUM(A1)"]);
    assert.deepEqual(body(toCsv(["X"], [["+441234"]])), ["X", "'+441234"]);
  });

  test("a leading minus is neutralised without breaking real negatives elsewhere", () => {
    assert.deepEqual(body(toCsv(["X"], [["-500"]])), ["X", "'-500"]);
    // A number, not a string, is not at risk and stays readable.
    assert.deepEqual(body(toCsv(["X"], [[-500]])), ["X", "'-500"]);
  });

  test("starts with a BOM and uses CRLF, which is what Excel expects", () => {
    const csv = toCsv(["A"], [["b"]]);
    assert.ok(csv.startsWith("﻿"));
    assert.ok(csv.includes("\r\n"));
  });

  test("no rows still produces a usable header", () => {
    assert.deepEqual(body(toCsv(["A", "B"], [])), ["A,B"]);
  });
});

describe("csvFilename", () => {
  test("stamps the date so successive exports do not overwrite each other", () => {
    assert.equal(csvFilename("invoices", new Date(Date.UTC(2026, 7, 18))), "invoices-2026-08-18.csv");
  });
});
