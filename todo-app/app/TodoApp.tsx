"use client";

import {
  fromDatetimeLocalToIso,
  getDueStatusLabel,
  toSingaporeLabel,
} from "@/lib/timezone";
import type { Priority, RecurrencePattern, Tag, Template, Todo } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type TodoAppProps = {
  initialTodos: Todo[];
  username: string;
};

export function TodoApp({ initialTodos, username }: TodoAppProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [notifications, setNotifications] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDateInput, setDueDateInput] = useState("");
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | "none">("none");
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [searchText, setSearchText] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#2563eb");
  const [newSubtaskTitleByTodoId, setNewSubtaskTitleByTodoId] = useState<Record<string, string>>({});

  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  async function refreshTodos() {
    const params = new URLSearchParams();
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (searchText.trim()) params.set("q", searchText.trim());
    if (tagFilter !== "all") params.set("tagId", tagFilter);

    try {
      const response = await fetch(`/api/todos${params.toString() ? `?${params.toString()}` : ""}`);
      if (!response.ok) return;
      const body = (await response.json()) as { data: Todo[] };
      setTodos(body.data);
    } catch {
      setError("Failed to load todos.");
    }
  }

  async function refreshTags() {
    try {
      const response = await fetch("/api/tags");
      if (!response.ok) return;
      const body = (await response.json()) as { data: Tag[] };
      setTags(body.data);
    } catch {
      setError("Failed to load tags.");
    }
  }

  async function refreshTemplates() {
    try {
      const response = await fetch("/api/templates");
      if (!response.ok) return;
      const body = (await response.json()) as { data: Template[] };
      setTemplates(body.data);
    } catch {
      setError("Failed to load templates.");
    }
  }

  async function checkNotifications() {
    try {
      const response = await fetch("/api/notifications/check", { method: "POST" });
      if (!response.ok) return;
      const body = (await response.json()) as { data: Todo[] };
      if (body.data.length > 0) {
        setNotifications(body.data);
      }
    } catch {
      setError("Failed to check notifications.");
    }
  }

  useEffect(() => {
    void refreshTags();
    void refreshTemplates();
  }, []);

  useEffect(() => {
    void refreshTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, priorityFilter, tagFilter]);
  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void checkNotifications();
    }, 30_000);
    void checkNotifications();
    return () => window.clearInterval(timer);
  }, []);

  async function createTodo() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          priority,
          dueDate: fromDatetimeLocalToIso(dueDateInput || null),
          recurrencePattern: recurrencePattern === "none" ? null : recurrencePattern,
          reminderMinutes,
          tagIds: selectedTagIds,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create todo.");
        return;
      }

      setTitle("");
      setPriority("medium");
      setDueDateInput("");
      setRecurrencePattern("none");
      setReminderMinutes(null);
      setSelectedTagIds([]);
      await refreshTodos();
    } catch {
      setError("Network error.");
    }
  }

  async function toggleComplete(id: string) {
    try {
      const response = await fetch(`/api/todos/${id}`, { method: "PATCH" });
      if (!response.ok) {
        setError("Failed to update todo.");
        return;
      }
      await refreshTodos();
    } catch {
      setError("Network error.");
    }
  }

  async function deleteTodo(id: string) {
    if (!window.confirm("Delete this todo?")) return;
    try {
      await fetch(`/api/todos/${id}`, { method: "DELETE" });
      await refreshTodos();
    } catch {
      setError("Network error.");
    }
  }

  async function createTagAction() {
    if (!newTagName.trim()) return;
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create tag.");
        return;
      }
      setNewTagName("");
      await refreshTags();
    } catch {
      setError("Network error.");
    }
  }

  async function deleteTagAction(id: string) {
    try {
      await fetch(`/api/tags/${id}`, { method: "DELETE" });
      setSelectedTagIds((current) => current.filter((tagId) => tagId !== id));
      await refreshTags();
      await refreshTodos();
    } catch {
      setError("Network error.");
    }
  }

  async function addSubtask(todoId: string) {
    const value = (newSubtaskTitleByTodoId[todoId] ?? "").trim();
    if (!value) return;

    try {
      await fetch(`/api/todos/${todoId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: value }),
      });
      setNewSubtaskTitleByTodoId((current) => ({ ...current, [todoId]: "" }));
      await refreshTodos();
    } catch {
      setError("Network error.");
    }
  }

  async function toggleSubtask(subtaskId: string, completed: boolean) {
    try {
      await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      await refreshTodos();
    } catch {
      setError("Network error.");
    }
  }

  async function deleteSubtaskAction(subtaskId: string) {
    try {
      await fetch(`/api/subtasks/${subtaskId}`, { method: "DELETE" });
      await refreshTodos();
    } catch {
      setError("Network error.");
    }
  }

  async function saveTemplate(todo: Todo) {
    try {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${todo.title} template`,
          category: "General",
          payload: {
            title: todo.title,
            priority: todo.priority,
            recurrencePattern: todo.recurrencePattern,
            reminderMinutes: todo.reminderMinutes,
            tagIds: todo.tags.map((tag) => tag.id),
            subtasks: todo.subtasks.map((subtask) => subtask.title),
          },
        }),
      });
      await refreshTemplates();
    } catch {
      setError("Network error.");
    }
  }

  async function applyTemplate(templateId: string) {
    try {
      await fetch(`/api/templates/${templateId}/use`, { method: "POST" });
      await refreshTodos();
    } catch {
      setError("Network error.");
    }
  }

  async function deleteTemplateAction(templateId: string) {
    try {
      await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
      await refreshTemplates();
    } catch {
      setError("Network error.");
    }
  }

  async function exportTodos() {
    try {
      const response = await fetch("/api/todos/export");
      if (!response.ok) return;
      const body = (await response.json()) as { data: unknown };

      const blob = new Blob([JSON.stringify(body.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "todos-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed.");
    }
  }

  async function importTodosFromFile(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;
      const response = await fetch("/api/todos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Import failed.");
        return;
      }

      await refreshTodos();
      await refreshTags();
    } catch {
      setError("Import file is invalid.");
    }
  }

  const sortedTodos = useMemo(() => {
    const rank = { high: 3, medium: 2, low: 1 } as const;
    return [...todos].sort((a, b) => {
      const p = rank[b.priority] - rank[a.priority];
      if (p !== 0) return p;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [todos]);

  const overdueTodos = sortedTodos.filter(
    (todo) => !todo.completed && !!todo.dueDate && new Date(todo.dueDate).getTime() < nowTs
  );
  const activeTodos = sortedTodos.filter(
    (todo) => !todo.completed && (!todo.dueDate || new Date(todo.dueDate).getTime() >= nowTs)
  );
  const completedTodos = sortedTodos.filter((todo) => todo.completed);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <main className="mx-auto w-full max-w-5xl rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Todo Core Features</h1>
            <p className="mt-1 text-sm text-slate-600">Signed in as @{username}</p>
          </div>
          <button type="button" onClick={() => void logout()} className="rounded-md border border-slate-300 px-3 py-1 text-sm">
            Logout
          </button>
        </div>

        <section className="mt-6 grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full rounded-md border border-slate-300 px-3 py-2">
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
          <input type="datetime-local" value={dueDateInput} onChange={(e) => setDueDateInput(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <select value={recurrencePattern} onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern | "none")} className="w-full rounded-md border border-slate-300 px-3 py-2">
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select value={reminderMinutes === null ? "none" : String(reminderMinutes)} onChange={(e) => setReminderMinutes(e.target.value === "none" ? null : Number(e.target.value))} className="w-full rounded-md border border-slate-300 px-3 py-2">
            <option value="none">No reminder</option>
            <option value="15">15 minutes before</option>
            <option value="60">1 hour before</option>
            <option value="1440">1 day before</option>
          </select>
          <button type="button" onClick={() => void createTodo()} className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white">Add todo</button>

          <div className="md:col-span-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button key={tag.id} type="button" onClick={() => setSelectedTagIds((current) => current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id])} className={`rounded-full border px-3 py-1 text-xs ${selectedTagIds.includes(tag.id) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"}`}>
                {tag.name}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 flex flex-wrap gap-2">
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search" className="rounded-full border border-slate-300 px-3 py-1 text-sm" />
          {(["all", "high", "medium", "low"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setPriorityFilter(value)} className={`rounded-full px-3 py-1 text-sm font-medium ${priorityFilter === value ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"}`}>
              {value}
            </button>
          ))}
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="rounded-full border border-slate-300 px-3 py-1 text-sm">
            <option value="all">All tags</option>
            {tags.map((tag) => (<option key={tag.id} value={tag.id}>{tag.name}</option>))}
          </select>
          <a href="/calendar" className="rounded-full bg-indigo-600 px-3 py-1 text-sm text-white">Calendar</a>
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Tag Management</h2>
          <div className="mt-2 flex items-center gap-2">
            <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Tag name" className="rounded border border-slate-300 px-3 py-2 text-sm" />
            <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="h-9 w-12 rounded border border-slate-300" />
            <button type="button" onClick={() => void createTagAction()} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Add tag</button>
            <button type="button" onClick={() => void exportTodos()} className="rounded bg-emerald-600 px-3 py-2 text-sm text-white">Export</button>
            <label className="rounded bg-slate-200 px-3 py-2 text-sm">
              Import
              <input type="file" accept="application/json" className="hidden" onChange={(e) => void importTodosFromFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button key={tag.id} type="button" onClick={() => void deleteTagAction(tag.id)} style={{ backgroundColor: tag.color }} className="rounded px-2 py-1 text-xs text-white">
                {tag.name} (delete)
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Templates</h2>
          <div className="mt-2 space-y-2">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
                <span>{template.name}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void applyTemplate(template.id)} className="rounded bg-slate-900 px-2 py-1 text-xs text-white">Use</button>
                  <button type="button" onClick={() => void deleteTemplateAction(template.id)} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {notifications.length > 0 ? (
          <section className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Reminders due now</p>
            <ul className="mt-2 list-disc pl-5">
              {notifications.map((todo) => (<li key={todo.id}>{todo.title}</li>))}
            </ul>
          </section>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {[{ name: "Overdue", items: overdueTodos }, { name: "Active", items: activeTodos }, { name: "Completed", items: completedTodos }].map((section) => (
          <section key={section.name} className="mt-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{section.name} ({section.items.length})</h2>
            <ul className="space-y-3">
              {section.items.map((todo) => (
                <li key={todo.id} className={`rounded-lg border p-4 ${section.name === "Overdue" ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3">
                      <input type="checkbox" checked={todo.completed} onChange={() => void toggleComplete(todo.id)} className="mt-1" />
                      <div>
                        <p className={`font-medium ${todo.completed ? "line-through text-slate-500" : ""}`}>{todo.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{getDueStatusLabel(todo.dueDate)}</p>
                        {todo.dueDate ? <p className="mt-1 text-xs text-slate-500">{toSingaporeLabel(todo.dueDate)}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {todo.tags.map((tag) => (<span key={tag.id} className="rounded px-2 py-0.5 text-xs text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>))}
                        </div>
                        <div className="mt-3 space-y-1">
                          {todo.subtasks.map((subtask) => (
                            <div key={subtask.id} className="flex items-center gap-2 text-xs">
                              <input type="checkbox" checked={subtask.completed} onChange={() => void toggleSubtask(subtask.id, subtask.completed)} />
                              <span className={subtask.completed ? "line-through text-slate-500" : ""}>{subtask.title}</span>
                              <button type="button" onClick={() => void deleteSubtaskAction(subtask.id)} className="rounded bg-slate-200 px-2 py-0.5">Delete</button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input value={newSubtaskTitleByTodoId[todo.id] ?? ""} onChange={(e) => setNewSubtaskTitleByTodoId((current) => ({ ...current, [todo.id]: e.target.value }))} placeholder="Add subtask" className="w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                            <button type="button" onClick={() => void addSubtask(todo.id)} className="rounded bg-slate-200 px-2 py-1 text-xs">Add</button>
                          </div>
                        </div>
                      </div>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${todo.priority === "high" ? "bg-red-100 text-red-700" : todo.priority === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-700"}`}>{todo.priority}</span>
                      {todo.recurrencePattern ? <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">{`?? ${todo.recurrencePattern}`}</span> : null}
                      <button type="button" onClick={() => void saveTemplate(todo)} className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white">Save Template</button>
                      <button type="button" onClick={() => void deleteTodo(todo.id)} className="rounded-md bg-red-600 px-2 py-1 text-xs text-white">Delete</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
