import { z } from "zod";

const prioritySchema = z.enum(["high", "medium", "low"]);
const recurrenceSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

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
    (value) => !value.recurrencePattern || !!value.dueDate,
    {
      message: "Recurring todos require a due date",
      path: ["dueDate"],
    }
  );
