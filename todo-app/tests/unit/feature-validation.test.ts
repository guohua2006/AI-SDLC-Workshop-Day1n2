import {
  createTagSchema,
  createTemplateSchema,
  importTodosSchema,
} from "@/lib/validation";
import { describe, expect, test } from "vitest";

describe("extended feature validation", () => {
  test("accepts valid tag payload", () => {
    const result = createTagSchema.safeParse({
      name: "Work",
      color: "#1d4ed8",
    });

    expect(result.success).toBe(true);
  });

  test("rejects invalid tag color", () => {
    const result = createTagSchema.safeParse({
      name: "Work",
      color: "blue",
    });

    expect(result.success).toBe(false);
  });

  test("accepts valid template payload", () => {
    const result = createTemplateSchema.safeParse({
      name: "Morning Routine",
      category: "Daily",
      payload: {
        title: "Morning routine",
        priority: "medium",
        recurrencePattern: "daily",
        reminderMinutes: 60,
        tagIds: ["f2e99842-8068-4204-b90f-38422cebd6f5"],
        subtasks: ["Drink water", "Review plan"],
      },
    });

    expect(result.success).toBe(true);
  });

  test("accepts import payload with todos", () => {
    const futureDate = new Date(Date.now() + 3600_000).toISOString();

    const result = importTodosSchema.safeParse({
      version: 1,
      exportedAt: new Date().toISOString(),
      todos: [
        {
          title: "Imported todo",
          priority: "high",
          dueDate: futureDate,
          recurrencePattern: null,
          reminderMinutes: 15,
          tags: [{ name: "Imported", color: "#059669" }],
          subtasks: [{ title: "Nested item", completed: false }],
          completed: false,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
