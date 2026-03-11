"use client";

import {
  fromDatetimeLocalToIso,
  getDueStatusLabel,
  toDatetimeLocalFromIso,
  toSingaporeLabel,
} from "@/lib/timezone";
import type { Priority, RecurrencePattern, Todo } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type SingleTodoResponse = {
  data: Todo;
};

type ToggleResponse = {
  data: {
    current: Todo;
    spawned: Todo | null;
  };
};

type TodoAppProps = {
  initialTodos: Todo[];
  username: string;
};

type EditDraft = {
  title: string;
  priority: Priority;
  dueDateInput: string;
  recurrencePattern: RecurrencePattern | "none";
};

export function TodoApp({ initialTodos, username }: TodoAppProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDateInput, setDueDateInput] = useState("");
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | "none">("none");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowTs(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  async function createTodo() {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    const payload = {
      title: trimmedTitle,
      priority,
      dueDate: fromDatetimeLocalToIso(dueDateInput || null),
      recurrencePattern: recurrencePattern === "none" ? null : recurrencePattern,
    };

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create todo.");
        return;
      }

      const body = (await response.json()) as SingleTodoResponse;
      setTodos((current) => [body.data, ...current]);
      setTitle("");
      setPriority("medium");
      setDueDateInput("");
      setRecurrencePattern("none");
      setError(null);
    } catch {
      setError("Network error. Please try again.");
    }
  }

  async function toggleComplete(id: string) {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        setError("Failed to update todo completion.");
        return;
      }

      const body = (await response.json()) as ToggleResponse;

      setTodos((current) => {
        const replaced = current.map((item) =>
          item.id === body.data.current.id ? body.data.current : item
        );

        if (!body.data.spawned) {
          return replaced;
        }

        return [body.data.spawned, ...replaced];
      });
    } catch {
      setError("Network error. Please try again.");
    }
  }

  async function deleteOne(id: string) {
    if (!window.confirm("Delete this todo?")) {
      return;
    }

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError("Failed to delete todo.");
        return;
      }

      setTodos((current) => current.filter((todo) => todo.id !== id));
    } catch {
      setError("Network error. Please try again.");
    }
  }

  function startEditing(todo: Todo) {
    setEditingId(todo.id);
    setEditDraft({
      title: todo.title,
      priority: todo.priority,
      dueDateInput: toDatetimeLocalFromIso(todo.dueDate),
      recurrencePattern: todo.recurrencePattern ?? "none",
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit(id: string) {
    if (!editDraft) {
      return;
    }

    const payload = {
      title: editDraft.title.trim(),
      priority: editDraft.priority,
      dueDate: fromDatetimeLocalToIso(editDraft.dueDateInput || null),
      recurrencePattern:
        editDraft.recurrencePattern === "none" ? null : editDraft.recurrencePattern,
    };

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update todo.");
        return;
      }

      const body = (await response.json()) as SingleTodoResponse;
      setTodos((current) =>
        current.map((item) => (item.id === id ? body.data : item))
      );

      setEditingId(null);
      setEditDraft(null);
      setError(null);
    } catch {
      setError("Network error. Please try again.");
    }
  }

  const sortedTodos = useMemo(() => {
    const rank = {
      high: 3,
      medium: 2,
      low: 1,
    } as const;

    return [...todos].sort((a, b) => {
      const byPriority = rank[b.priority] - rank[a.priority];
      if (byPriority !== 0) {
        return byPriority;
      }

      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [todos]);

  const visibleTodos = useMemo(() => {
    if (priorityFilter === "all") {
      return sortedTodos;
    }

    return sortedTodos.filter((todo) => todo.priority === priorityFilter);
  }, [priorityFilter, sortedTodos]);

  const overdueTodos = visibleTodos.filter(
    (todo) => !todo.completed && !!todo.dueDate && new Date(todo.dueDate).getTime() < nowTs
  );
  const activeTodos = visibleTodos.filter(
    (todo) => !todo.completed && (!todo.dueDate || new Date(todo.dueDate).getTime() >= nowTs)
  );
  const completedTodos = visibleTodos.filter((todo) => todo.completed);

  function renderTodoList(items: Todo[], sectionName: string) {
    if (items.length === 0) {
      return null;
    }

    return (
      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
          {sectionName} ({items.length})
        </h2>
        <ul className="space-y-3">
          {items.map((todo) => {
            const isEditing = editingId === todo.id && editDraft;

            return (
              <li
                key={todo.id}
                className={`rounded-lg border p-4 ${
                  sectionName === "Overdue"
                    ? "border-red-200 bg-red-50"
                    : "border-slate-200"
                }`}
              >
                {isEditing ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      value={editDraft.title}
                      onChange={(event) =>
                        setEditDraft((current) =>
                          current ? { ...current, title: event.target.value } : current
                        )
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                    <select
                      value={editDraft.priority}
                      onChange={(event) =>
                        setEditDraft((current) =>
                          current
                            ? { ...current, priority: event.target.value as Priority }
                            : current
                        )
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                    >
                      <option value="high">High priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="low">Low priority</option>
                    </select>
                    <input
                      type="datetime-local"
                      value={editDraft.dueDateInput}
                      onChange={(event) =>
                        setEditDraft((current) =>
                          current ? { ...current, dueDateInput: event.target.value } : current
                        )
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                    <select
                      value={editDraft.recurrencePattern}
                      onChange={(event) =>
                        setEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                recurrencePattern: event.target.value as RecurrencePattern | "none",
                              }
                            : current
                        )
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                    >
                      <option value="none">No repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <div className="flex gap-2 md:col-span-2">
                      <button
                        type="button"
                        onClick={() => void saveEdit(todo.id)}
                        className="rounded-md bg-emerald-600 px-3 py-1 text-sm text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded-md bg-slate-300 px-3 py-1 text-sm text-slate-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => void toggleComplete(todo.id)}
                        className="mt-1"
                      />
                      <div>
                        <p
                          className={`font-medium ${
                            todo.completed ? "line-through text-slate-500" : ""
                          }`}
                        >
                          {todo.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {getDueStatusLabel(todo.dueDate)}
                        </p>
                        {todo.dueDate ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {toSingaporeLabel(todo.dueDate)}
                          </p>
                        ) : null}
                      </div>
                    </label>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          todo.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : todo.priority === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {todo.priority}
                      </span>

                      {todo.recurrencePattern ? (
                        <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                          {`🔄 ${todo.recurrencePattern}`}
                        </span>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => startEditing(todo)}
                        className="rounded-md bg-slate-700 px-2 py-1 text-xs text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteOne(todo.id)}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      setError("Failed to logout. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <main className="mx-auto w-full max-w-4xl rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Todo Core Features</h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as @{username}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm"
          >
            Logout
          </button>
        </div>

        <section className="mt-6 grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to be done?"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />

          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>

          <input
            type="datetime-local"
            value={dueDateInput}
            onChange={(event) => setDueDateInput(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />

          <select
            value={recurrencePattern}
            onChange={(event) =>
              setRecurrencePattern(event.target.value as RecurrencePattern | "none")
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          <button
            type="button"
            onClick={createTodo}
            className="md:col-span-2 rounded-md bg-slate-900 px-4 py-2 font-semibold text-white"
          >
            Add todo
          </button>
        </section>

        <section className="mt-4 flex gap-2">
          {(["all", "high", "medium", "low"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPriorityFilter(value)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                priorityFilter === value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {value}
            </button>
          ))}
        </section>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {renderTodoList(overdueTodos, "Overdue")}
        {renderTodoList(activeTodos, "Active")}
        {renderTodoList(completedTodos, "Completed")}
      </main>
    </div>
  );
}
