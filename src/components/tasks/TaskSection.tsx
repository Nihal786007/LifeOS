import TaskCard from "./TaskCard";
import type { Task } from "../../shared/types";

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  toggleTask: (id: number) => void;
  deleteTask: (id: number) => void;
}

export default function TaskSection({
  title,
  tasks,
  toggleTask,
  deleteTask,
}: TaskSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-bold text-white">
        {title}
      </h2>

      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          toggleTask={toggleTask}
          deleteTask={deleteTask}
        />
      ))}
    </section>
  );
}