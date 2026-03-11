import { createTodoSchema, updateTodoSchema } from "@/lib/validation";
import { describe, expect, test } from "vitest";

describe("validation", () => {
  test("accepts valid create payload", () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const result = createTodoSchema.safeParse({
      title: "Prepare report",
      priority: "high",
      dueDate: futureDate,
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

  test("rejects past due date", () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();

    const result = createTodoSchema.safeParse({
      title: "Past date todo",
      dueDate: pastDate,
    });

    expect(result.success).toBe(false);
  });
});
