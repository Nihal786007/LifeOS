import type {
  Task,
} from "../../shared/types";

import UniversalTaskRow from "./UniversalTaskRow";

interface UniversalTaskTableProps {
  tasks: Task[];

  getPlanIcon?: (
    task: Task
  ) => "personal" | "goal" | "none";

  getWeeklyTargetTitle?: (
    task: Task
  ) => string | undefined;

  onToggle: (
    taskId: number
  ) => void;

  onDelete?: (
    taskId: number
  ) => void;

  emptyMessage?: string;
}

function getPlanSymbol(
  type:
    | "personal"
    | "goal"
    | "none"
) {
  switch (type) {
    case "goal":
      return "🎯";

    case "personal":
      return "👤";

    default:
      return "—";
  }
}

export default function UniversalTaskTable({
  tasks,

  getPlanIcon,

  getWeeklyTargetTitle,

  onToggle,

  onDelete,

  emptyMessage = "No tasks found.",
}: UniversalTaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

      {/* Desktop Header */}

      <div
        className="
          hidden
          min-h-10
          grid-cols-[44px_minmax(220px,1fr)_56px_140px_110px_110px_100px_44px]
          items-center
          border-b
          border-slate-700
          bg-slate-950/80
          px-3
          text-xs
          font-semibold
          uppercase
          tracking-wider
          text-slate-500
          md:grid
        "
      >
        <div />

        <div className="px-3">
          Task
        </div>

        <div className="text-center">
          Plan
        </div>

        <div className="px-3">
          Week
        </div>

        <div className="px-2">
          Priority
        </div>

        <div className="px-3">
          Due
        </div>

        <div className="px-3">
          Status
        </div>

        <div />
      </div>

      {/* Rows */}

      <div>
        {tasks.map(
          (task) => {
            const planType =
              getPlanIcon
                ? getPlanIcon(
                    task
                  )
                : "none";

            const planSymbol =
              getPlanSymbol(
                planType
              );

            const weeklyTargetTitle =
              getWeeklyTargetTitle
                ? getWeeklyTargetTitle(
                    task
                  )
                : undefined;

            return (
              <div
                key={
                  task.id
                }
                className="relative"
              >
                {/* Plan marker */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    left-[calc(44px+min(220px,100%))]
                    top-1/2
                    z-10
                    hidden
                    -translate-y-1/2
                    md:block
                  "
                  title={
                    planType ===
                    "goal"
                      ? "Life Goal Planner"
                      : planType ===
                          "personal"
                        ? "Personal Planner"
                        : "Standalone"
                  }
                >
                  <span className="text-sm">
                    {
                      planSymbol
                    }
                  </span>
                </div>

                <UniversalTaskRow
  task={
    task
  }
  planType={
    planType
  }
  weeklyTargetTitle={
    weeklyTargetTitle
  }
  onToggle={
    onToggle
  }
  onDelete={
    onDelete
  }
/>

                {/* Mobile metadata */}

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    border-b
                    border-slate-800
                    px-4
                    pb-2
                    text-xs
                    text-slate-500
                    md:hidden
                  "
                >
                  <span
                    title={
                      planType ===
                      "goal"
                        ? "Life Goal Planner"
                        : planType ===
                            "personal"
                          ? "Personal Planner"
                          : "Standalone"
                    }
                  >
                    {
                      planSymbol
                    }
                  </span>

                  {weeklyTargetTitle && (
                    <>
                      <span>
                        •
                      </span>

                      <span className="truncate">
                        {
                          weeklyTargetTitle
                        }
                      </span>
                    </>
                  )}

                  {task.dueDate && (
                    <>
                      <span>
                        •
                      </span>

                      <span>
                        {
                          task.dueDate
                        }
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}