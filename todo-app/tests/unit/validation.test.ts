import { createTodoSchema, updateTodoSchema } from "@/lib/validation";
import { describe, expect, test } from "vitest";

describe("validation", () => {
  test("accepts valid create payload", () => {
    const result = createTodoSchema.safeParse({
      title: "Prepare report",
      priority: "high",
      dueDate: "2026-03-11T01:30:00.000Z",
      recurrencePattern: "daily",
    });

    expect(result.success).toBe(true);
  });

  test("rejects recurring create payload without due date", () => {
    const result = createTodoSchema.safeParse({
      title: "Daily task",
      recurrencePattern: "daily",
    });

    expect(result.success).toBe(false);
  });

  test("accepts partial update payload", () => {
    const result = updateTodoSchema.safeParse({
      priority: "low",
      completed: true,
    });

    expect(result.success).toBe(true);
  });
});
