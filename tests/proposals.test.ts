import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { effectiveStatus, isAwaitingResponse, isEditable } from "@/lib/proposals";

const DAY = 86_400_000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

describe("effectiveStatus", () => {
  test("a sent quote past its validity date reads as expired", () => {
    assert.equal(effectiveStatus({ status: "SENT", validUntil: daysFromNow(-1) }), "EXPIRED");
  });

  test("a sent quote still in date stays sent", () => {
    assert.equal(effectiveStatus({ status: "SENT", validUntil: daysFromNow(1) }), "SENT");
  });

  test("expiry runs to the end of the day, not the moment it turns", () => {
    // A quote valid until today is valid all of today.
    const today = new Date();
    today.setHours(1, 0, 0, 0);
    assert.equal(effectiveStatus({ status: "SENT", validUntil: today }), "SENT");
  });

  test("no validity date means it never expires", () => {
    assert.equal(effectiveStatus({ status: "SENT", validUntil: null }), "SENT");
  });

  test("an answered quote is never re-read as expired", () => {
    // Whether they said yes or no, the date passing does not undo the answer.
    assert.equal(effectiveStatus({ status: "ACCEPTED", validUntil: daysFromNow(-30) }), "ACCEPTED");
    assert.equal(effectiveStatus({ status: "DECLINED", validUntil: daysFromNow(-30) }), "DECLINED");
  });

  test("a draft past a stale validity date is still a draft", () => {
    assert.equal(effectiveStatus({ status: "DRAFT", validUntil: daysFromNow(-5) }), "DRAFT");
  });

  test("accepts an ISO string as readily as a Date", () => {
    const iso = daysFromNow(-2).toISOString();
    assert.equal(effectiveStatus({ status: "SENT", validUntil: iso }), "EXPIRED");
  });
});

describe("isEditable", () => {
  test("only a draft can be edited", () => {
    assert.equal(isEditable({ status: "DRAFT" }), true);
    for (const status of ["SENT", "ACCEPTED", "DECLINED", "EXPIRED"]) {
      assert.equal(isEditable({ status }), false, `${status} must be locked`);
    }
  });
});

describe("isAwaitingResponse", () => {
  test("a live sent quote can still be answered", () => {
    assert.equal(isAwaitingResponse({ status: "SENT", validUntil: daysFromNow(3) }), true);
  });

  test("an expired quote can no longer be answered", () => {
    assert.equal(isAwaitingResponse({ status: "SENT", validUntil: daysFromNow(-3) }), false);
  });

  test("an already-answered quote cannot be answered twice", () => {
    assert.equal(isAwaitingResponse({ status: "ACCEPTED", validUntil: daysFromNow(3) }), false);
    assert.equal(isAwaitingResponse({ status: "DECLINED", validUntil: daysFromNow(3) }), false);
  });

  test("a draft is not awaiting anything — nobody has seen it", () => {
    assert.equal(isAwaitingResponse({ status: "DRAFT", validUntil: daysFromNow(3) }), false);
  });
});
