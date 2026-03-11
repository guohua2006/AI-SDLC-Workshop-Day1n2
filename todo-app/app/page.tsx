import { TodoApp } from "@/app/TodoApp";
import { getAuthUserFromCookies } from "@/lib/auth";
import { listTodos } from "@/lib/todos-repo";
import { redirect } from "next/navigation";

export default async function Home() {
  const authUser = await getAuthUserFromCookies();

  if (!authUser) {
    redirect("/login");
  }

  const initialTodos = listTodos(authUser.id);
  return <TodoApp initialTodos={initialTodos} username={authUser.username} />;
}
