import { TodoApp } from "@/app/TodoApp";
import { listTodos } from "@/lib/todos-repo";

export default function Home() {
  const initialTodos = listTodos();
  return <TodoApp initialTodos={initialTodos} />;
}
