import {
  deleteTodo,
  getTodoById,
  toggleTodoCompletion,
  updateTodo,
} from "@/lib/todos-repo";
import { getAuthUserFromRequest } from "@/lib/auth";
import { updateTodoSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

type Params = {
  params: Promise<{ id: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidTodoId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export async function GET(_: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(_);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isValidTodoId(id)) {
    return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
  }

  const todo = getTodoById(authUser.id, id);

  if (!todo) {
    return NextResponse.json({ error: "Todo not found" }, { status: 404 });
  }

  return NextResponse.json({ data: todo });
}

export async function PUT(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isValidTodoId(id)) {
    return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = updateTodoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const existing = getTodoById(authUser.id, id);

    if (!existing) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const mergedRecurrencePattern =
      parsed.data.recurrencePattern === undefined
        ? existing.recurrencePattern
        : parsed.data.recurrencePattern;

    const mergedDueDate =
      parsed.data.dueDate === undefined ? existing.dueDate : parsed.data.dueDate;

    if (mergedRecurrencePattern && !mergedDueDate) {
      return NextResponse.json(
        { error: "Recurring todos require a due date" },
        { status: 400 }
      );
    }

    const updated = updateTodo(authUser.id, id, parsed.data);

    if (!updated) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function PATCH(_: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(_);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isValidTodoId(id)) {
    return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
  }

  const result = toggleTodoCompletion(authUser.id, id);

  if (!result) {
    return NextResponse.json({ error: "Todo not found" }, { status: 404 });
  }

  return NextResponse.json({ data: result });
}

export async function DELETE(_: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(_);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isValidTodoId(id)) {
    return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
  }

  const deleted = deleteTodo(authUser.id, id);

  if (!deleted) {
    return NextResponse.json({ error: "Todo not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
