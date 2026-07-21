import {
  FaCheckCircle,
  FaChevronRight,
  FaFlag,
  FaRegCircle,
  FaTrash,
} from "react-icons/fa";

import Card from "../ui/Card";
import Button from "../ui/Button";
import type { Task } from "../../shared/types";

interface TaskCardProps {
  task: Task;
  toggleTask: (id: number) => void;
  deleteTask: (id: number) => void;
}

export default function TaskCard({
  task,
  toggleTask,
  deleteTask,
}: TaskCardProps) {
  return (
    <Card className="group p-7 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div
          onClick={() => toggleTask(task.id)}
          className="flex cursor-pointer gap-5"
        >
          <div className="mt-1 text-2xl">
            {task.completed ? (
              <FaCheckCircle className="text-green-400" />
            ) : (
              <FaRegCircle className="text-slate-500 transition-colors group-hover:text-cyan-400" />
            )}
          </div>

          <div>
            <h2
              className={`text-2xl font-bold transition ${
                task.completed
                  ? "line-through text-slate-500"
                  : "text-white"
              }`}
            >
              {task.title}
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-cyan-500/10 px-4 py-1 text-xs uppercase tracking-[0.25em] text-cyan-300">
                Personal Mission
              </span>

              <span className="flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-1 text-xs uppercase tracking-[0.25em] text-red-300">
                <FaFlag />
                High Priority
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="danger"
          onClick={() => deleteTask(task.id)}
          className="rounded-2xl p-4"
        >
          <FaTrash />
        </Button>
      </div>

      <div className="mt-7 flex items-center justify-between border-t border-slate-800 pt-5">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <FaChevronRight />

          {task.completed
            ? "Mission Completed"
            : "Ready to Execute"}
        </div>

        <Button
          variant="secondary"
          onClick={() => toggleTask(task.id)}
          className="px-5 py-2 text-sm"
        >
          {task.completed ? "Completed" : "Complete"}
        </Button>
      </div>
    </Card>
  );
}