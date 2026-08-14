import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { colorForTag, tagChipClass } from "@/lib/tags";

describe("colorForTag", () => {
  test("the same name always gets the same colour", () => {
    assert.equal(colorForTag("enterprise"), colorForTag("enterprise"));
  });

  test("casing does not change the colour", () => {
    // "Enterprise" and "enterprise" are the same tag to a person.
    assert.equal(colorForTag("Enterprise"), colorForTag("enterprise"));
    assert.equal(colorForTag("HEALTHCARE"), colorForTag("healthcare"));
  });

  test("spreads names across the palette rather than favouring one colour", () => {
    const names = [
      "enterprise", "healthcare", "construction", "retail", "agency",
      "nonprofit", "startup", "legal", "finance", "education",
      "hospitality", "logistics",
    ];
    const used = new Set(names.map(colorForTag));
    // A hash that collapsed everything onto one colour would defeat the point.
    assert.ok(used.size >= 4, `only ${used.size} distinct colours across 12 names`);
  });

  test("always returns a colour the chip styles know about", () => {
    for (const name of ["", "a", "a very long tag name indeed", "123", "émoji ✨"]) {
      const color = colorForTag(name);
      assert.notEqual(tagChipClass(color), undefined);
      assert.ok(tagChipClass(color).length > 0);
    }
  });
});

describe("tagChipClass", () => {
  test("falls back to slate for a colour it does not recognise", () => {
    // Colours are stored per tag, so an old or hand-edited row must not break the page.
    assert.equal(tagChipClass("chartreuse"), tagChipClass("slate"));
  });
});
