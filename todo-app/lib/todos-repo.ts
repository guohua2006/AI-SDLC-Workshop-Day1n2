import db from "@/lib/db";
import { calculateNextDueDate } from "@/lib/recurrence";
import type {
  CreateTodoInput,
  Priority,
  Todo,
  UpdateTodoInput,
} from "@/lib/types";

type TodoRow = {
  id: string;
  title: string;
  completed: number;
  priority: Priority;
  due_date: string | null;
  recurrence_pattern: Todo["recurrencePattern"];
  created_at: string;
  updated_at: string;
};

function mapRow(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    priority: row.priority,
    dueDate: row.due_date,
    recurrencePattern: row.recurrence_pattern,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function prioritySortValue(priority: Priority): number {
  if (priority === "high") {
    return 3;
  }

  if (priority === "medium") {
    return 2;
  }

  return 1;
}

export function listTodos(priority?: Priority): Todo[] {
  const whereClause = priority ? "WHERE priority = ?" : "";
  const rows = db
    .prepare(`SELECT * FROM todos ${whereClause}`)
    .all(...(priority ? [priority] : [])) as TodoRow[];

  return rows
    .map(mapRow)
    .sort((a, b) => {
      const priorityDifference =
        prioritySortValue(b.priority) - prioritySortValue(a.priority);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return a.createdAt.localeCompare(b.createdAt) * -1;
    });
}

export function getTodoById(id: string): Todo | null {
  const row = db.prepare("SELECT * FROM todos WHERE id = ?").get(id) as
    | TodoRow
    | undefined;

  return row ? mapRow(row) : null;
}

export function createTodo(input: CreateTodoInput): Todo {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO todos (
      id, title, completed, priority, due_date, recurrence_pattern, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.title,
    0,
    input.priority ?? "medium",
    input.dueDate ?? null,
    input.recurrencePattern ?? null,
    now,
    now
  );

  const created = getTodoById(id);

  if (!created) {
    throw new Error("Failed to create todo");
  }

  return created;
}

export function updateTodo(id: string, input: UpdateTodoInput): Todo | null {
  const existing = getTodoById(id);

  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();

  db.prepare(
    `UPDATE todos
     SET title = ?,
         completed = ?,
         priority = ?,
         due_date = ?,
         recurrence_pattern = ?,
         updated_at = ?
     WHERE id = ?`
  ).run(
    input.title ?? existing.title,
    input.completed === undefined ? Number(existing.completed) : Number(input.completed),
    input.priority ?? existing.priority,
    input.dueDate === undefined ? existing.dueDate : input.dueDate,
    input.recurrencePattern === undefined
      ? existing.recurrencePattern
      : input.recurrencePattern,
    now,
    id
  );

  return getTodoById(id);
}

export function deleteTodo(id: string): boolean {
  const result = db.prepare("DELETE FROM todos WHERE id = ?").run(id);
  return result.changes > 0;
}

export function toggleTodoCompletion(id: string): { current: Todo; spawned: Todo | null } | null {
  const runToggle = db.transaction((todoId: string) => {
    const existing = getTodoById(todoId);

    if (!existing) {
      return null;
    }

    const nextCompletedState = !existing.completed;
    const now = new Date().toISOString();

    db.prepare("UPDATE todos SET completed = ?, updated_at = ? WHERE id = ?").run(
      Number(nextCompletedState),
      now,
      todoId
    );

    const updated = getTodoById(todoId);

    if (!updated) {
      return null;
    }

    if (!nextCompletedState || !updated.recurrencePattern || !updated.dueDate) {
      return { current: updated, spawned: null };
    }

    const nextDueDate = calculateNextDueDate(updated.dueDate, updated.recurrencePattern);

    const spawned = createTodo({
      title: updated.title,
      priority: updated.priority,
      dueDate: nextDueDate,
      recurrencePattern: updated.recurrencePattern,
    });

    return { current: updated, spawned };
  });

  return runToggle(id);
}
