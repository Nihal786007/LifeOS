import type {
  Task,
} from "../../shared/types";

import ActivityBadge from "./ActivityBadge";

interface ActivityCardProps {
  task: Task;
}

const priorityColors = {
  low: "bg-slate-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

export default function ActivityCard({
  task,
}: ActivityCardProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition-all duration-300 hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-500/10">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl">
            📋
          </div>

          <div>
            <h3 className="text-xl font-bold">
              {task.title}
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Due:{" "}
              {task.dueDate ??
                "No due date"}
            </p>
          </div>
        </div>
      </div>

      {task.description && (
        <p className="mt-5 leading-7 text-slate-300">
          {task.description}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              priorityColors[
                task.priority
              ]
            }`}
          />

          <span className="text-sm uppercase tracking-[0.25em] text-slate-500">
            {task.priority}
          </span>
        </div>

        <ActivityBadge
          status={
            task.completed
              ? "completed"
              : "planned"
          }
        />
      </div>
    </div>
  );
}