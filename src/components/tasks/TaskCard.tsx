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
  const priorityStyles = {
    low: {
      label: "Low Priority",
      bg: "bg-green-500/10",
      text: "text-green-300",
      xp: 5,
    },
    medium: {
      label: "Medium Priority",
      bg: "bg-yellow-500/10",
      text: "text-yellow-300",
      xp: 10,
    },
    high: {
      label: "High Priority",
      bg: "bg-red-500/10",
      text: "text-red-300",
      xp: 20,
    },
  } as const;

  const priority = priorityStyles[task.priority];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = task.dueDate
    ? new Date(task.dueDate)
    : null;

  if (due) {
    due.setHours(0, 0, 0, 0);
  }

  const isOverdue =
    !!due &&
    !task.completed &&
    due < today;

  function getDueStatus() {
    if (!due) return "No Due Date";

    const diff = Math.floor(
      (due.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (task.completed) {
      return "Mission Completed";
    }

    if (diff === 0) {
      return "📅 Due Today";
    }

    if (diff === 1) {
      return "📅 Tomorrow";
    }

    if (diff > 1) {
      return `📅 In ${diff} Days`;
    }

    return `⚠️ ${Math.abs(diff)} Day${
      Math.abs(diff) > 1 ? "s" : ""
    } Overdue`;
  }

  function formatDueDate() {
    if (!due) return "";

    return due.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <Card
      className={`group transition-all duration-300 hover:-translate-y-1 ${
        isOverdue
          ? "border-2 border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20"
          : ""
      }`}
    >

    
          <div className="flex items-start justify-between gap-6">
        <div
          onClick={() => toggleTask(task.id)}
          className="flex flex-1 cursor-pointer gap-5"
        >
          <div className="mt-1 text-2xl">
            {task.completed ? (
              <FaCheckCircle className="text-green-400" />
            ) : (
              <FaRegCircle className="text-slate-500 transition-colors group-hover:text-cyan-400" />
            )}
          </div>

          <div className="flex-1">
            <h2
              className={`text-2xl font-bold transition-colors ${
                task.completed
                  ? "text-slate-500 line-through"
                  : "text-white"
              }`}
            >
              {task.title}
            </h2>

            {task.description && (
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {task.description}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">

             
              <span
                className={`flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${priority.bg} ${priority.text}`}
              >
                <FaFlag />
                {priority.label}
              </span>

              <span className="rounded-full bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-purple-300">
                ⭐ {task.xp} XP
              </span>

              {isOverdue && (
                <span className="rounded-full bg-red-600 px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-white animate-pulse">
                  OVERDUE
                </span>
              )}

              {task.completed && (
                <span className="rounded-full bg-green-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-green-300">
                  COMPLETED
                </span>
              )}

            </div>
          </div>
        </div>

        <Button
          variant="danger"
          onClick={() => deleteTask(task.id)}
          className="rounded-xl p-4 transition-transform hover:scale-105"
        >
          <FaTrash />
        </Button>
      </div>
            <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5">

        <div className="flex items-center gap-3 text-sm text-slate-400">
          <FaChevronRight className="text-cyan-400" />

          <span>
            {getDueStatus()}

            {task.dueDate && (
              <span className="ml-2 text-slate-500">
                • {formatDueDate()}
              </span>
            )}
          </span>
        </div>

        <Button
          variant="secondary"
          onClick={() => toggleTask(task.id)}
          className={`px-5 py-2 text-sm transition-all ${
            task.completed
              ? "bg-green-600 hover:bg-green-700"
              : ""
          }`}
        >
          {task.completed
            ? "Completed"
            : "Complete"}
        </Button>

      </div>

    </Card>
  );
}