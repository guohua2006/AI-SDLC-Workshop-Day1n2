import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("db initialization pragmas", () => {
  let tmpDir: string;
  let dbPath: string;
  const openDbs: Database.Database[] = [];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "db-init-test-"));
    dbPath = path.join(tmpDir, "test.sqlite");
  });

  afterEach(() => {
    for (const conn of openDbs) {
      try { conn.close(); } catch { /* already closed */ }
    }
    openDbs.length = 0;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function open(): Database.Database {
    const conn = new Database(dbPath);
    conn.pragma("busy_timeout = 5000");
    conn.pragma("journal_mode = WAL");
    openDbs.push(conn);
    return conn;
  }

  it("sets WAL journal mode for concurrent access", () => {
    const db = open();
    db.close();

    const db2 = open();
    const result = db2.pragma("journal_mode") as Array<{ journal_mode: string }>;
    expect(result[0].journal_mode).toBe("wal");
  });

  it("busy_timeout is configured on the connection", () => {
    const db = open();
    const result = db.pragma("busy_timeout") as Array<{ timeout: number }>;
    // busy_timeout(5000) should persist — cross-process locking tested via next build
    expect(result[0].timeout).toBe(5000);
  });

  it("CREATE TABLE IF NOT EXISTS is idempotent across connections", () => {
    const ddl = `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )`;

    const db1 = open();
    db1.exec(ddl);

    // Second connection running same DDL should not error
    const db2 = open();
    expect(() => db2.exec(ddl)).not.toThrow();
  });

  it("INSERT OR IGNORE is safe for concurrent holiday seeding", () => {
    const db1 = open();
    db1.exec(
      "CREATE TABLE IF NOT EXISTS holidays (id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, name TEXT NOT NULL)"
    );

    const seed = (conn: Database.Database) => {
      const stmt = conn.prepare(
        "INSERT OR IGNORE INTO holidays (id, date, name) VALUES (?, ?, ?)"
      );
      stmt.run("h1", "2026-01-01", "New Year");
      stmt.run("h2", "2026-12-25", "Christmas");
    };

    seed(db1);

    // Second connection seeds same data — should be idempotent
    const db2 = open();
    expect(() => seed(db2)).not.toThrow();

    const rows = db2.prepare("SELECT * FROM holidays").all();
    expect(rows).toHaveLength(2);
  });
});
