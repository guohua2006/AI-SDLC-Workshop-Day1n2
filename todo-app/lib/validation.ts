import { z } from "zod";

const prioritySchema = z.enum(["high", "medium", "low"]);
const recurrenceSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);
const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color");
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
    reminderMinutes: z.number().int().min(5).max(10080).nullable().optional(),
    tagIds: z.array(z.string().uuid()).max(20).optional().default([]),
  })
  .refine(
    (value) => !value.recurrencePattern || !!value.dueDate,
    {
      message: "Recurring todos require a due date",
      path: ["dueDate"],
    }
  )
  .refine(
    (value) => !value.reminderMinutes || !!value.dueDate,
    {
      message: "Reminders require a due date",
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
    reminderMinutes: z.number().int().min(5).max(10080).nullable().optional(),
    tagIds: z.array(z.string().uuid()).max(20).optional(),
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

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: hexColorSchema,
});

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
});

const templatePayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  priority: prioritySchema,
  recurrencePattern: recurrenceSchema.nullable(),
  reminderMinutes: z.number().int().min(5).max(10080).nullable(),
  tagIds: z.array(z.string().uuid()).max(20),
  subtasks: z.array(z.string().trim().min(1).max(200)).max(100),
});

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(200).nullable().optional(),
  category: z.string().trim().max(50).nullable().optional(),
  payload: templatePayloadSchema,
});

export const searchTodosSchema = z.object({
  q: z.string().trim().max(200).optional(),
  priority: prioritySchema.optional(),
  completed: z.enum(["true", "false"]).optional(),
  tagId: z.string().uuid().optional(),
});

export const reminderCheckSchema = z.object({
  now: z.string().datetime({ offset: true }).optional(),
});

export const updateTodoTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()).max(20),
});

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month format");

export const importTodosSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string().datetime({ offset: true }),
  todos: z.array(
    z.object({
      title: z.string().trim().min(1).max(200),
      priority: prioritySchema,
      dueDate: z.string().datetime({ offset: true }).nullable(),
      recurrencePattern: recurrenceSchema.nullable(),
      reminderMinutes: z.number().int().min(5).max(10080).nullable(),
      tags: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(50),
            color: hexColorSchema,
          })
        )
        .max(20),
      subtasks: z
        .array(
          z.object({
            title: z.string().trim().min(1).max(200),
            completed: z.boolean(),
          })
        )
        .max(100),
      completed: z.boolean(),
    })
  ).max(1000),
});
