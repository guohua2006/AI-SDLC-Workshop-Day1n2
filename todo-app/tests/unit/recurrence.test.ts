import { calculateNextDueDate } from "@/lib/recurrence";
import { describe, expect, test } from "vitest";

describe("calculateNextDueDate", () => {
  test("adds one day for daily", () => {
    const next = calculateNextDueDate("2026-03-11T01:00:00.000Z", "daily");
    expect(next).toBe("2026-03-12T01:00:00.000Z");
  });

  test("clamps end-of-month dates", () => {
    const next = calculateNextDueDate("2026-01-31T01:00:00.000Z", "monthly");
    expect(next).toBe("2026-02-28T01:00:00.000Z");
  });

  test("handles leap-day yearly recurrence", () => {
    const next = calculateNextDueDate("2024-02-29T05:00:00.000Z", "yearly");
    expect(next).toBe("2025-02-28T05:00:00.000Z");
  });
});
