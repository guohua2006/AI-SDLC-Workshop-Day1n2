import {
  authenticateUser,
  createSessionForUser,
  deleteAllSessionsForUser,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { checkRateLimit, getRequestIp } from "@/lib/auth-rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(6).max(128),
});

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limiter = checkRateLimit(`login:${ip}`, 10, 60_000);

  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limiter.retryAfterSeconds) },
      }
    );
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const user = authenticateUser(parsed.data.username, parsed.data.password);

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    deleteAllSessionsForUser(user.id);
    const token = createSessionForUser(user.id);
    const response = NextResponse.json({ data: user });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
