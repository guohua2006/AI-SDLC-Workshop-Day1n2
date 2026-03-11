import { getAuthUserFromRequest } from "@/lib/auth";
import { checkDueNotifications } from "@/lib/todos-repo";
import { reminderCheckSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

export function POST(request: Request) {
  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = reminderCheckSchema.safeParse({
    now: searchParams.get("now") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const now = parsed.data.now ?? new Date().toISOString();
  const due = checkDueNotifications(authUser.id, now);
  return NextResponse.json({ data: due });
}
