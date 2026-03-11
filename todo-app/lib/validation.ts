import { z } from "zod";

const prioritySchema = z.enum(["high", "medium", "low"]);
const recurrenceSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);
const MINIMUM_FUTURE_MS = 60 * 1000;

function isMinimumOneMinuteFuture(value: string): boolean {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp >= Date.now() + MINIMUM_FUTURE_MS;
}

export const createTodoSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    priority: prioritySchema.optional().default("medium"),
    dueDate: z.string().datetime({ offset: true }).nullable().optional(),
    recurrencePattern: recurrenceSchema.nullable().optional(),
  })
  .refine(
    (value) => !value.recurrencePattern || !!value.dueDate,
    {
      message: "Recurring todos require a due date",
      path: ["dueDate"],
    }
  )
  .refine(
    (value) => !value.dueDate || isMinimumOneMinuteFuture(value.dueDate),
    {
      message: "Due date must be at least 1 minute in the future",
      path: ["dueDate"],
    }
  );

export const updateTodoSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    priority: prioritySchema.optional(),
    dueDate: z.string().datetime({ offset: true }).nullable().optional(),
    recurrencePattern: recurrenceSchema.nullable().optional(),
    completed: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.recurrencePattern === undefined ||
      value.dueDate === undefined ||
      !value.recurrencePattern ||
      !!value.dueDate,
    {
      message: "Recurring todos require a due date",
      path: ["dueDate"],
    }
  )
  .refine(
    (value) =>
      value.dueDate === undefined || value.dueDate === null || isMinimumOneMinuteFuture(value.dueDate),
    {
      message: "Due date must be at least 1 minute in the future",
      path: ["dueDate"],
    }
  );
