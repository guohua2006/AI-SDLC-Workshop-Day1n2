import { fromDatetimeLocalToIso } from "@/lib/timezone";
import { describe, expect, test } from "vitest";

describe("fromDatetimeLocalToIso", () => {
  test("converts singapore datetime-local to UTC ISO", () => {
    const result = fromDatetimeLocalToIso("2026-03-11T09:30");
    expect(result).toBe("2026-03-11T01:30:00.000Z");
  });

  test("returns null for missing value", () => {
    expect(fromDatetimeLocalToIso(null)).toBeNull();
  });
});
