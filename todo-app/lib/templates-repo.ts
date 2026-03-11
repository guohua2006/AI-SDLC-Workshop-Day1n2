import db from "@/lib/db";
import { createSubtask, createTodo, getTodoById } from "@/lib/todos-repo";
import type { CreateTemplateInput, Template } from "@/lib/types";

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  payload_json: string;
  created_at: string;
  updated_at: string;
};

function mapTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    payload: JSON.parse(row.payload_json) as Template["payload"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listTemplates(userId: string): Template[] {
  const rows = db
    .prepare(
      "SELECT id, name, description, category, payload_json, created_at, updated_at FROM templates WHERE user_id = ? ORDER BY updated_at DESC"
    )
    .all(userId) as TemplateRow[];

  return rows.map(mapTemplate);
}

export function createTemplate(userId: string, input: CreateTemplateInput): Template {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO templates (id, user_id, name, description, category, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    input.name,
    input.description ?? null,
    input.category ?? null,
    JSON.stringify(input.payload),
    now,
    now
  );

  const row = db
    .prepare(
      "SELECT id, name, description, category, payload_json, created_at, updated_at FROM templates WHERE id = ?"
    )
    .get(id) as TemplateRow | undefined;

  if (!row) {
    throw new Error("Failed to create template");
  }

  return mapTemplate(row);
}

export function updateTemplate(
  userId: string,
  id: string,
  input: CreateTemplateInput
): Template | null {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE templates
       SET name = ?, description = ?, category = ?, payload_json = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`
    )
    .run(
      input.name,
      input.description ?? null,
      input.category ?? null,
      JSON.stringify(input.payload),
      now,
      userId,
      id
    );

  if (result.changes === 0) {
    return null;
  }

  const row = db
    .prepare(
      "SELECT id, name, description, category, payload_json, created_at, updated_at FROM templates WHERE id = ?"
    )
    .get(id) as TemplateRow | undefined;

  return row ? mapTemplate(row) : null;
}

export function deleteTemplate(userId: string, id: string): boolean {
  const result = db.prepare("DELETE FROM templates WHERE user_id = ? AND id = ?").run(userId, id);
  return result.changes > 0;
}

export function instantiateTemplate(userId: string, id: string) {
  const row = db
    .prepare(
      "SELECT id, name, description, category, payload_json, created_at, updated_at FROM templates WHERE user_id = ? AND id = ?"
    )
    .get(userId, id) as TemplateRow | undefined;

  if (!row) {
    return null;
  }

  const template = mapTemplate(row);
  const createdTodo = createTodo(userId, {
    title: template.payload.title,
    priority: template.payload.priority,
    dueDate: null,
    recurrencePattern: template.payload.recurrencePattern,
    reminderMinutes: template.payload.reminderMinutes,
    tagIds: template.payload.tagIds,
  });

  for (const title of template.payload.subtasks) {
    createSubtask(userId, createdTodo.id, title);
  }

  return getTodoById(userId, createdTodo.id);
}
