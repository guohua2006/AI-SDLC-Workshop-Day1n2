import { getAuthUserFromCookies } from "@/lib/auth";
import { listHolidaysForMonth } from "@/lib/holidays-repo";
import { listTodos } from "@/lib/todos-repo";
import { redirect } from "next/navigation";

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage() {
  const authUser = await getAuthUserFromCookies();
  if (!authUser) {
    redirect("/login");
  }

  const now = new Date();
  const month = monthKey(now);
  const todos = listTodos(authUser.id).filter((todo) => todo.dueDate?.startsWith(month));
  const holidays = listHolidaysForMonth(month);

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <main className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Calendar View ({month})</h1>
        <p className="mt-2 text-sm text-slate-600">Holidays and due todos for this month.</p>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">Holidays</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {holidays.map((holiday) => (
              <li key={holiday.date} className="rounded border border-slate-200 px-3 py-2">
                {holiday.date} - {holiday.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">Todos with due dates</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {todos.map((todo) => (
              <li key={todo.id} className="rounded border border-slate-200 px-3 py-2">
                {todo.dueDate?.slice(0, 10)} - {todo.title}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
