import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "todo.sqlite");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("busy_timeout = 5000");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL CHECK(priority IN ('high', 'medium', 'low')),
    due_date TEXT,
    recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (todo_id, tag_id),
    FOREIGN KEY(todo_id) REFERENCES todos(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    todo_id TEXT NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(todo_id) REFERENCES todos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'SG',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
  CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
  CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);
  CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);
  CREATE INDEX IF NOT EXISTS idx_subtasks_user_id ON subtasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
  CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
`);

const todosColumns = db
  .prepare("PRAGMA table_info(todos)")
  .all() as Array<{ name: string }>;

if (!todosColumns.some((column) => column.name === "user_id")) {
  db.exec("ALTER TABLE todos ADD COLUMN user_id TEXT");
}

if (!todosColumns.some((column) => column.name === "reminder_minutes")) {
  db.exec("ALTER TABLE todos ADD COLUMN reminder_minutes INTEGER");
}

if (!todosColumns.some((column) => column.name === "last_notification_sent")) {
  db.exec("ALTER TABLE todos ADD COLUMN last_notification_sent TEXT");
}

db.exec("CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id)");

const seedHolidays = db.transaction(() => {
  const holidayRows = [
    ["2026-01-01", "New Year's Day"],
    ["2026-02-17", "Chinese New Year"],
    ["2026-02-18", "Chinese New Year Holiday"],
    ["2026-03-20", "Hari Raya Puasa"],
    ["2026-05-01", "Labour Day"],
    ["2026-05-27", "Vesak Day"],
    ["2026-08-09", "National Day"],
    ["2026-11-10", "Deepavali"],
    ["2026-12-25", "Christmas Day"],
  ] as const;

  const insertHoliday = db.prepare(
    "INSERT OR IGNORE INTO holidays (id, date, name, country_code, created_at) VALUES (?, ?, ?, 'SG', ?)"
  );

  const now = new Date().toISOString();
  for (const [date, name] of holidayRows) {
    insertHoliday.run(`sg-${date}`, date, name, now);
  }
});

seedHolidays();

export default db;
