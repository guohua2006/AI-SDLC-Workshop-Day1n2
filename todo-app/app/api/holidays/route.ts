import { getAuthUserFromRequest } from "@/lib/auth";
import { getRequestIp, checkRateLimit } from "@/lib/auth-rate-limit";
import { listHolidaysForMonth } from "@/lib/holidays-repo";
import { monthSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

export function GET(request: Request) {
  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getRequestIp(request);
  const rate = checkRateLimit(`holidays:${clientIp}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const month = new URL(request.url).searchParams.get("month");
  if (!month) {
    return NextResponse.json({ error: "month query parameter is required" }, { status: 400 });
  }

  const parsedMonth = monthSchema.safeParse(month);
  if (!parsedMonth.success) {
    return NextResponse.json({ error: "Invalid month format" }, { status: 400 });
  }

  const data = listHolidaysForMonth(parsedMonth.data);
  return NextResponse.json({ data });
}
