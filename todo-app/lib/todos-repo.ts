import db from "@/lib/db";
import { calculateNextDueDate } from "@/lib/recurrence";
import type {
  CreateTodoInput,
  Priority,
  Subtask,
  Tag,
  Todo,
  TodoExportPayload,
  UpdateTodoInput,
} from "@/lib/types";

type TodoRow = {
  id: string;
  user_id: string;
  title: string;
  completed: number;
  priority: Priority;
  due_date: string | null;
  recurrence_pattern: Todo["recurrencePattern"];
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
};

type SearchFilters = {
  q?: string;
  priority?: Priority;
  completed?: boolean;
  tagId?: string;
};

type SubtaskRow = {
  id: string;
  todo_id: string;
  title: string;
  completed: number;
  created_at: string;
  updated_at: string;
};

type TagRow = {
  id: string;
  name: string;
  color: string;
};

function mapRow(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    priority: row.priority,
    dueDate: row.due_date,
    recurrencePattern: row.recurrence_pattern,
    reminderMinutes: row.reminder_minutes,
    lastNotificationSent: row.last_notification_sent,
    tags: [],
    subtasks: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    todoId: row.todo_id,
    title: row.title,
    completed: Boolean(row.completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  };
}

function hydrateTodoRelations(userId: string, todos: Todo[]): Todo[] {
  if (todos.length === 0) {
    return todos;
  }

  const todoIds = todos.map((todo) => todo.id);
  const placeholders = todoIds.map(() => "?").join(",");

  const tagRows = db
    .prepare(
      `SELECT tt.todo_id as todo_id, t.id as id, t.name as name, t.color as color
       FROM todo_tags tt
       JOIN tags t ON tt.tag_id = t.id
       WHERE t.user_id = ? AND tt.todo_id IN (${placeholders})`
    )
    .all(userId, ...todoIds) as Array<TagRow & { todo_id: string }>;

  const subtaskRows = db
    .prepare(
      `SELECT id, todo_id, title, completed, created_at, updated_at
       FROM subtasks
       WHERE user_id = ? AND todo_id IN (${placeholders})
       ORDER BY created_at ASC`
    )
    .all(userId, ...todoIds) as SubtaskRow[];

  const tagsByTodo = new Map<string, Tag[]>();
  for (const row of tagRows) {
    const current = tagsByTodo.get(row.todo_id) ?? [];
    current.push(mapTag(row));
    tagsByTodo.set(row.todo_id, current);
  }

  const subtasksByTodo = new Map<string, Subtask[]>();
  for (const row of subtaskRows) {
    const current = subtasksByTodo.get(row.todo_id) ?? [];
    current.push(mapSubtask(row));
    subtasksByTodo.set(row.todo_id, current);
  }

  return todos.map((todo) => ({
    ...todo,
    tags: tagsByTodo.get(todo.id) ?? [],
    subtasks: subtasksByTodo.get(todo.id) ?? [],
  }));
}

function replaceTodoTags(userId: string, todoId: string, tagIds: string[]): void {
  db.prepare("DELETE FROM todo_tags WHERE todo_id = ?").run(todoId);

  if (tagIds.length === 0) {
    return;
  }

  const insertTagRef = db.prepare(
    "INSERT OR IGNORE INTO todo_tags (todo_id, tag_id, created_at) VALUES (?, ?, ?)"
  );
  const now = new Date().toISOString();

  for (const tagId of tagIds) {
    const exists = db
      .prepare("SELECT id FROM tags WHERE user_id = ? AND id = ?")
      .get(userId, tagId) as { id: string } | undefined;

    if (exists) {
      insertTagRef.run(todoId, tagId, now);
    }
  }
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

export function listTodos(userId: string, priority?: Priority): Todo[] {
  const whereClause = priority
    ? "WHERE user_id = ? AND priority = ?"
    : "WHERE user_id = ?";
  const rows = db
    .prepare(`SELECT * FROM todos ${whereClause}`)
    .all(...(priority ? [userId, priority] : [userId])) as TodoRow[];

  const sortedTodos = rows
    .map(mapRow)
    .sort((a, b) => {
      const priorityDifference =
        prioritySortValue(b.priority) - prioritySortValue(a.priority);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return a.createdAt.localeCompare(b.createdAt) * -1;
    });

  return hydrateTodoRelations(userId, sortedTodos);
}

export function searchTodos(userId: string, filters: SearchFilters): Todo[] {
  const clauses = ["todos.user_id = ?"];
  const values: Array<string | number> = [userId];

  if (filters.priority) {
    clauses.push("todos.priority = ?");
    values.push(filters.priority);
  }

  if (filters.completed !== undefined) {
    clauses.push("todos.completed = ?");
    values.push(Number(filters.completed));
  }

  if (filters.q) {
    clauses.push("LOWER(todos.title) LIKE ?");
    values.push(`%${filters.q.toLowerCase()}%`);
  }

  if (filters.tagId) {
    clauses.push("EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = todos.id AND tt.tag_id = ?)");
    values.push(filters.tagId);
  }

  const rows = db
    .prepare(`SELECT todos.* FROM todos WHERE ${clauses.join(" AND ")}`)
    .all(...values) as TodoRow[];

  const sortedTodos = rows
    .map(mapRow)
    .sort((a, b) => {
      const priorityDifference =
        prioritySortValue(b.priority) - prioritySortValue(a.priority);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return a.createdAt.localeCompare(b.createdAt) * -1;
    });

  return hydrateTodoRelations(userId, sortedTodos);
}

export function getTodoById(userId: string, id: string): Todo | null {
  const row = db.prepare("SELECT * FROM todos WHERE user_id = ? AND id = ?").get(userId, id) as
    | TodoRow
    | undefined;

  if (!row) {
    return null;
  }

  const [hydrated] = hydrateTodoRelations(userId, [mapRow(row)]);
  return hydrated ?? null;
}

export function createTodo(userId: string, input: CreateTodoInput): Todo {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO todos (
      id, user_id, title, completed, priority, due_date, recurrence_pattern, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    input.title,
    0,
    input.priority ?? "medium",
    input.dueDate ?? null,
    input.recurrencePattern ?? null,
    now,
    now
  );

  db.prepare("UPDATE todos SET reminder_minutes = ?, last_notification_sent = ? WHERE id = ?").run(
    input.reminderMinutes ?? null,
    null,
    id
  );

  replaceTodoTags(userId, id, input.tagIds ?? []);

  const created = getTodoById(userId, id);

  if (!created) {
    throw new Error("Failed to create todo");
  }

  return created;
}

export function updateTodo(userId: string, id: string, input: UpdateTodoInput): Todo | null {
  const existing = getTodoById(userId, id);

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
         reminder_minutes = ?,
         updated_at = ?
      WHERE user_id = ? AND id = ?`
  ).run(
    input.title ?? existing.title,
    input.completed === undefined ? Number(existing.completed) : Number(input.completed),
    input.priority ?? existing.priority,
    input.dueDate === undefined ? existing.dueDate : input.dueDate,
    input.recurrencePattern === undefined
      ? existing.recurrencePattern
      : input.recurrencePattern,
    input.reminderMinutes === undefined ? existing.reminderMinutes : input.reminderMinutes,
    now,
    userId,
    id
  );

  if (input.tagIds !== undefined) {
    replaceTodoTags(userId, id, input.tagIds);
  }

  return getTodoById(userId, id);
}

export function deleteTodo(userId: string, id: string): boolean {
  const result = db.prepare("DELETE FROM todos WHERE user_id = ? AND id = ?").run(userId, id);
  return result.changes > 0;
}

export function toggleTodoCompletion(userId: string, id: string): { current: Todo; spawned: Todo | null } | null {
  const runToggle = db.transaction((ownerId: string, todoId: string) => {
    const existing = getTodoById(ownerId, todoId);

    if (!existing) {
      return null;
    }

    const nextCompletedState = !existing.completed;
    const now = new Date().toISOString();

    db.prepare("UPDATE todos SET completed = ?, updated_at = ? WHERE user_id = ? AND id = ?").run(
      Number(nextCompletedState),
      now,
      ownerId,
      todoId
    );

    const updated = getTodoById(ownerId, todoId);

    if (!updated) {
      return null;
    }

    if (!nextCompletedState || !updated.recurrencePattern || !updated.dueDate) {
      return { current: updated, spawned: null };
    }

    const nextDueDate = calculateNextDueDate(updated.dueDate, updated.recurrencePattern);

    const spawned = createTodo(ownerId, {
      title: updated.title,
      priority: updated.priority,
      dueDate: nextDueDate,
      recurrencePattern: updated.recurrencePattern,
      reminderMinutes: updated.reminderMinutes,
      tagIds: updated.tags.map((tag) => tag.id),
    });

    return { current: updated, spawned };
  });

  return runToggle(userId, id);
}

export function checkDueNotifications(userId: string, nowIso: string): Todo[] {
  const runCheck = db.transaction((ownerId: string, ts: string) => {
    const rows = db
      .prepare(
        `SELECT * FROM todos
         WHERE user_id = ?
           AND completed = 0
           AND due_date IS NOT NULL
           AND reminder_minutes IS NOT NULL
           AND datetime(due_date, '-' || reminder_minutes || ' minutes') <= datetime(?)
           AND (last_notification_sent IS NULL OR last_notification_sent < datetime(due_date, '-' || reminder_minutes || ' minutes'))`
      )
      .all(ownerId, ts) as TodoRow[];

    if (rows.length === 0) {
      return [] as Todo[];
    }

    const markSent = db.prepare("UPDATE todos SET last_notification_sent = ? WHERE id = ?");
    for (const row of rows) {
      markSent.run(ts, row.id);
    }

    return hydrateTodoRelations(ownerId, rows.map(mapRow));
  });

  return runCheck(userId, nowIso);
}

export function createSubtask(userId: string, todoId: string, title: string): Subtask | null {
  const parent = getTodoById(userId, todoId);
  if (!parent) {
    return null;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO subtasks (id, user_id, todo_id, title, completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`
  ).run(id, userId, todoId, title, now, now);

  const created = db
    .prepare("SELECT id, todo_id, title, completed, created_at, updated_at FROM subtasks WHERE id = ?")
    .get(id) as SubtaskRow | undefined;

  return created ? mapSubtask(created) : null;
}

export function updateSubtask(
  userId: string,
  subtaskId: string,
  input: { title?: string; completed?: boolean }
): Subtask | null {
  const existing = db
    .prepare("SELECT id, todo_id, title, completed, created_at, updated_at FROM subtasks WHERE user_id = ? AND id = ?")
    .get(userId, subtaskId) as SubtaskRow | undefined;

  if (!existing) {
    return null;
  }

  db.prepare(
    `UPDATE subtasks
     SET title = ?, completed = ?, updated_at = ?
     WHERE user_id = ? AND id = ?`
  ).run(
    input.title ?? existing.title,
    input.completed === undefined ? existing.completed : Number(input.completed),
    new Date().toISOString(),
    userId,
    subtaskId
  );

  const updated = db
    .prepare("SELECT id, todo_id, title, completed, created_at, updated_at FROM subtasks WHERE user_id = ? AND id = ?")
    .get(userId, subtaskId) as SubtaskRow | undefined;

  return updated ? mapSubtask(updated) : null;
}

export function deleteSubtask(userId: string, subtaskId: string): boolean {
  const result = db.prepare("DELETE FROM subtasks WHERE user_id = ? AND id = ?").run(userId, subtaskId);
  return result.changes > 0;
}

export function buildTodoExport(userId: string): TodoExportPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    todos: listTodos(userId),
  };
}
