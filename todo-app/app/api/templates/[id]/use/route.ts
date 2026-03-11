import { getAuthUserFromRequest } from "@/lib/auth";
import { checkRateLimit, getRequestIp } from "@/lib/auth-rate-limit";
import { instantiateTemplate } from "@/lib/templates-repo";
import { NextResponse } from "next/server";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getRequestIp(request);
  const rate = checkRateLimit(`template-use:${clientIp}`, 30, 60_000);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const { id } = await params;
  const todo = instantiateTemplate(authUser.id, id);

  if (!todo) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ data: todo }, { status: 201 });
}
