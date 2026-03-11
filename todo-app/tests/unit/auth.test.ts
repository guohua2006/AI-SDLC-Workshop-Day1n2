import { afterEach, describe, expect, test, vi } from "vitest";

const originalNodeEnv = process.env.NODE_ENV;
const originalSessionSecret = process.env.SESSION_SECRET;
const originalSessionKey = process.env.SESSION_KEY;

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalSessionSecret === undefined) {
    delete process.env.SESSION_SECRET;
  } else {
    process.env.SESSION_SECRET = originalSessionSecret;
  }

  if (originalSessionKey === undefined) {
    delete process.env.SESSION_KEY;
  } else {
    process.env.SESSION_KEY = originalSessionKey;
  }

  vi.resetModules();
});

describe("auth sessions", () => {
  test("session cookies remain valid across module reloads in development", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.SESSION_SECRET;

    vi.resetModules();
    const authModule1 = await import("@/lib/auth");
    const username = `reload_${Date.now()}`;
    const user = authModule1.createUser(username, "secret12");
    const token = authModule1.createSessionForUser(user.id);

    vi.resetModules();
    const authModule2 = await import("@/lib/auth");
    const request = new Request("http://localhost", {
      headers: {
        cookie: `${authModule2.SESSION_COOKIE_NAME}=${token}`,
      },
    });

    expect(authModule2.getAuthUserFromRequest(request)).toEqual({
      id: user.id,
      username: user.username,
    });
  });

  test("requires SESSION_SECRET outside local development", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    delete process.env.SESSION_KEY;

    vi.resetModules();
    const authModule = await import("@/lib/auth");
    const user = authModule.createUser(`prod_${Date.now()}`, "secret12");

    expect(() => authModule.createSessionForUser(user.id)).toThrow(
      "SESSION_SECRET environment variable is required outside local development"
    );
  });

  test("accepts SESSION_KEY outside local development", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    process.env.SESSION_KEY = "test-session-key-for-ci";

    vi.resetModules();
    const authModule = await import("@/lib/auth");
    const username = `key_${Date.now()}`;
    const user = authModule.createUser(username, "secret12");
    const token = authModule.createSessionForUser(user.id);

    const request = new Request("http://localhost", {
      headers: {
        cookie: `${authModule.SESSION_COOKIE_NAME}=${token}`,
      },
    });

    expect(authModule.getAuthUserFromRequest(request)).toEqual({
      id: user.id,
      username: user.username,
    });
  });
});