import {
  createTodo,
  listTodos,
  searchTodos,
} from "@/lib/todos-repo";
import { getAuthUserFromRequest } from "@/lib/auth";
import type { Priority } from "@/lib/types";
import { createTodoSchema, searchTodosSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

export function GET(request: Request) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawPriority = searchParams.get("priority");
  const rawQuery = searchParams.get("q");
  const rawCompleted = searchParams.get("completed");
  const rawTagId = searchParams.get("tagId");

  if (rawPriority && !["high", "medium", "low"].includes(rawPriority)) {
    return NextResponse.json({ error: "Invalid priority filter" }, { status: 400 });
  }

  const parsedSearch = searchTodosSchema.safeParse({
    q: rawQuery ?? undefined,
    priority: rawPriority ?? undefined,
    completed: rawCompleted ?? undefined,
    tagId: rawTagId ?? undefined,
  });

  if (!parsedSearch.success) {
    return NextResponse.json(
      { error: parsedSearch.error.issues[0]?.message ?? "Invalid query parameters" },
      { status: 400 }
    );
  }

  const priority = rawPriority as Priority | null;
  const hasSearchFilters =
    !!parsedSearch.data.q ||
    parsedSearch.data.completed !== undefined ||
    !!parsedSearch.data.tagId;

  const todos = hasSearchFilters
    ? searchTodos(authUser.id, {
        q: parsedSearch.data.q,
        priority: parsedSearch.data.priority,
        completed:
          parsedSearch.data.completed === undefined
            ? undefined
            : parsedSearch.data.completed === "true",
        tagId: parsedSearch.data.tagId,
      })
    : listTodos(authUser.id, priority ?? undefined);

  return NextResponse.json({ data: todos });
}

export async function POST(request: Request) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createTodoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const created = createTodo(authUser.id, parsed.data);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
