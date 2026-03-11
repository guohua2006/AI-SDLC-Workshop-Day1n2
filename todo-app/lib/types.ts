export type Priority = "high" | "medium" | "low";

export type RecurrencePattern = "daily" | "weekly" | "monthly" | "yearly";

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  recurrencePattern: RecurrencePattern | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  priority?: Priority;
  dueDate?: string | null;
  recurrencePattern?: RecurrencePattern | null;
}

export interface UpdateTodoInput {
  title?: string;
  priority?: Priority;
  dueDate?: string | null;
  recurrencePattern?: RecurrencePattern | null;
  completed?: boolean;
}
