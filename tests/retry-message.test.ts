import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { retryMessage } from "@/lib/retry-message";

describe("retryMessage", () => {
  test("a minute or less reads as 'a minute', not '1 minutes'", () => {
    assert.equal(retryMessage(60), "Too many attempts. Try again in a minute.");
  });

  test("a few seconds still rounds up to 'a minute' rather than claiming 0", () => {
    assert.equal(retryMessage(5), "Too many attempts. Try again in a minute.");
  });

  test("just over a minute switches to the minutes phrasing", () => {
    assert.equal(retryMessage(61), "Too many attempts. Try again in about 2 minutes.");
  });

  test("rounds up so the caller never retries a beat too early", () => {
    // 121s is 2.01 minutes — must read as 3, not 2, or the retry lands too soon.
    assert.equal(retryMessage(121), "Too many attempts. Try again in about 3 minutes.");
  });

  test("a clean multiple of 60 does not round up unnecessarily", () => {
    assert.equal(retryMessage(600), "Too many attempts. Try again in about 10 minutes.");
  });
});
