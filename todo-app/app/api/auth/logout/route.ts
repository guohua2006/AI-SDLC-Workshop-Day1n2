import {
  deleteSession,
  getSessionTokenFromCookieHeader,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const token = getSessionTokenFromCookieHeader(request.headers.get("cookie"));

  if (token) {
    deleteSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  return response;
}
