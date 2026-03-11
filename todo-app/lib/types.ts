export type Priority = "high" | "medium" | "low";

export type RecurrencePattern = "daily" | "weekly" | "monthly" | "yearly";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  todoId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  payload: {
    title: string;
    priority: Priority;
    recurrencePattern: RecurrencePattern | null;
    reminderMinutes: number | null;
    tagIds: string[];
    subtasks: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  date: string;
  name: string;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  recurrencePattern: RecurrencePattern | null;
  reminderMinutes: number | null;
  lastNotificationSent: string | null;
  tags: Tag[];
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  priority?: Priority;
  dueDate?: string | null;
  recurrencePattern?: RecurrencePattern | null;
  reminderMinutes?: number | null;
  tagIds?: string[];
}

export interface UpdateTodoInput {
  title?: string;
  priority?: Priority;
  dueDate?: string | null;
  recurrencePattern?: RecurrencePattern | null;
  reminderMinutes?: number | null;
  tagIds?: string[];
  completed?: boolean;
}

export interface CreateTagInput {
  name: string;
  color: string;
}

export interface CreateSubtaskInput {
  todoId: string;
  title: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string | null;
  category?: string | null;
  payload: Template["payload"];
}

export interface TodoExportPayload {
  version: number;
  exportedAt: string;
  todos: Todo[];
}
