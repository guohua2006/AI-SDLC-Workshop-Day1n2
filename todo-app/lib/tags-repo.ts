import db from "@/lib/db";
import type { CreateTagInput, Tag } from "@/lib/types";

type TagRow = {
  id: string;
  name: string;
  color: string;
};

function mapTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  };
}

export function listTags(userId: string): Tag[] {
  const rows = db
    .prepare("SELECT id, name, color FROM tags WHERE user_id = ? ORDER BY name ASC")
    .all(userId) as TagRow[];

  return rows.map(mapTag);
}

export function createTag(userId: string, input: CreateTagInput): Tag {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare("INSERT INTO tags (id, user_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, userId, input.name, input.color, now);

  const row = db
    .prepare("SELECT id, name, color FROM tags WHERE id = ?")
    .get(id) as TagRow | undefined;

  if (!row) {
    throw new Error("Failed to create tag");
  }

  return mapTag(row);
}

export function updateTag(userId: string, id: string, input: CreateTagInput): Tag | null {
  const result = db
    .prepare("UPDATE tags SET name = ?, color = ? WHERE user_id = ? AND id = ?")
    .run(input.name, input.color, userId, id);

  if (result.changes === 0) {
    return null;
  }

  const row = db
    .prepare("SELECT id, name, color FROM tags WHERE id = ?")
    .get(id) as TagRow | undefined;

  return row ? mapTag(row) : null;
}

export function deleteTag(userId: string, id: string): boolean {
  const result = db.prepare("DELETE FROM tags WHERE user_id = ? AND id = ?").run(userId, id);
  return result.changes > 0;
}
