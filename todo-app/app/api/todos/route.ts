import {
  createTodo,
  listTodos,
} from "@/lib/todos-repo";
import type { Priority } from "@/lib/types";
import { createTodoSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPriority = searchParams.get("priority");

  if (rawPriority && !["high", "medium", "low"].includes(rawPriority)) {
    return NextResponse.json({ error: "Invalid priority filter" }, { status: 400 });
  }

  const priority = rawPriority as Priority | null;
  const todos = listTodos(priority ?? undefined);
  return NextResponse.json({ data: todos });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createTodoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const created = createTodo(parsed.data);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
