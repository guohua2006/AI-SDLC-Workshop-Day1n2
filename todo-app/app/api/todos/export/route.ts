import { getAuthUserFromRequest } from "@/lib/auth";
import { buildTodoExport } from "@/lib/todos-repo";
import { NextResponse } from "next/server";

export function GET(request: Request) {
  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = buildTodoExport(authUser.id);
  return NextResponse.json({ data: payload });
}
