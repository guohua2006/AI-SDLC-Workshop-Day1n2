import { getAuthUserFromRequest } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = getAuthUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ data: user });
}
