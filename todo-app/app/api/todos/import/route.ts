import { getAuthUserFromRequest } from "@/lib/auth";
import { checkRateLimit, getRequestIp } from "@/lib/auth-rate-limit";
import { createTag, listTags } from "@/lib/tags-repo";
import { createSubtask, createTodo, updateSubtask, updateTodo } from "@/lib/todos-repo";
import { importTodosSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getRequestIp(request);
  const rate = checkRateLimit(`todos-import:${clientIp}`, 5, 60_000);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many import requests" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const parsed = importTodosSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid import payload" },
        { status: 400 }
      );
    }

    const currentTags = listTags(authUser.id);
    const tagMap = new Map(currentTags.map((tag) => [tag.name.toLowerCase(), tag.id]));

    let imported = 0;

    for (const incoming of parsed.data.todos) {
      const tagIds: string[] = [];

      for (const tag of incoming.tags) {
        const key = tag.name.toLowerCase();
        let tagId = tagMap.get(key);

        if (!tagId) {
          const created = createTag(authUser.id, {
            name: tag.name,
            color: tag.color,
          });
          tagId = created.id;
          tagMap.set(key, created.id);
        }

        tagIds.push(tagId);
      }

      const todo = createTodo(authUser.id, {
        title: incoming.title,
        priority: incoming.priority,
        dueDate: incoming.dueDate,
        recurrencePattern: incoming.recurrencePattern,
        reminderMinutes: incoming.reminderMinutes,
        tagIds,
      });

      if (incoming.completed) {
        updateTodo(authUser.id, todo.id, { completed: true });
      }

      for (const subtask of incoming.subtasks) {
        const createdSubtask = createSubtask(authUser.id, todo.id, subtask.title);
        if (createdSubtask && subtask.completed) {
          updateSubtask(authUser.id, createdSubtask.id, { completed: true });
        }
      }

      imported += 1;
    }

    return NextResponse.json({ data: { imported } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
