import db from "@/lib/db";
import { cookies } from "next/headers";
import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "todo_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEV_SESSION_SECRET = crypto.randomBytes(32).toString("hex");

export type AuthUser = {
  id: string;
  username: string;
};

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
};

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function hashSessionToken(token: string): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }

  return crypto
    .createHmac("sha256", secret ?? DEV_SESSION_SECRET)
    .update(token)
    .digest("hex");
}

function cleanupExpiredSessions(): void {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
}

export function createUser(username: string, password: string): AuthUser {
  const normalizedUsername = normalizeUsername(username);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare("INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)")
    .run(id, normalizedUsername, hashPassword(password), now);

  return { id, username: normalizedUsername };
}

export function authenticateUser(username: string, password: string): AuthUser | null {
  const normalizedUsername = normalizeUsername(username);

  const user = db
    .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
    .get(normalizedUsername) as UserRow | undefined;

  if (!user) {
    return null;
  }

  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }

  return { id: user.id, username: user.username };
}

export function createSessionForUser(userId: string): string {
  cleanupExpiredSessions();

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  db.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(tokenHash, userId, expiresAt.toISOString(), now.toISOString());

  return token;
}

export function deleteSession(token: string): void {
  const tokenHash = hashSessionToken(token);
  db.prepare("DELETE FROM sessions WHERE token = ?").run(tokenHash);
}

export function deleteAllSessionsForUser(userId: string): void {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

function getUserByToken(token: string): AuthUser | null {
  const tokenHash = hashSessionToken(token);

  const row = db
    .prepare(
      `SELECT users.id as id, users.username as username, sessions.expires_at as expires_at
       FROM sessions
       JOIN users ON sessions.user_id = users.id
       WHERE sessions.token = ?`
    )
    .get(tokenHash) as
    | {
        id: string;
        username: string;
        expires_at: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  const expiryTime = new Date(row.expires_at).getTime();
  if (expiryTime <= Date.now()) {
    deleteSession(token);
    return null;
  }

  return { id: row.id, username: row.username };
}

export function getSessionTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const pairs = cookieHeader.split(";").map((item) => item.trim());
  for (const pair of pairs) {
    const [name, ...rest] = pair.split("=");
    if (name === SESSION_COOKIE_NAME) {
      return rest.join("=") || null;
    }
  }

  return null;
}

export function getAuthUserFromRequest(request: Request): AuthUser | null {
  const token = getSessionTokenFromCookieHeader(request.headers.get("cookie"));

  if (!token) {
    return null;
  }

  return getUserByToken(token);
}

export async function getAuthUserFromCookies(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getUserByToken(token);
}
