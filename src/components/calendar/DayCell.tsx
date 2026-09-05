export type CalendarTaskStatus =
  | "none"
  | "active"
  | "overdue"
  | "mixed"
  | "completed";

interface DayCellProps {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  taskCount: number;
  taskStatus: CalendarTaskStatus;
  onClick: () => void;
}

const STATUS_STYLES: Readonly<Record<CalendarTaskStatus, string>> = {
  none: "",
  active: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  overdue: "border-red-400/20 bg-red-400/10 text-red-300",
  mixed: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  completed: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
};

export default function DayCell({
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  taskCount,
  taskStatus,
  onClick,
}: DayCellProps) {
  const taskLabel = taskCount === 1 ? "1 task" : `${taskCount} tasks`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`${day}, ${taskCount > 0 ? taskLabel : "no tasks"}${
        isToday ? ", today" : ""
      }`}
      className={`
        group relative min-h-20 rounded-xl border p-2.5 text-left transition
        sm:min-h-24 sm:p-3
        ${
          isCurrentMonth
            ? "border-slate-800 bg-slate-900/80"
            : "border-slate-900 bg-slate-950/45 text-slate-700"
        }
        ${
          isSelected
            ? "border-cyan-300 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(103,232,249,0.18)]"
            : "hover:border-slate-700 hover:bg-slate-900"
        }
      `}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`text-sm font-bold sm:text-base ${
            isSelected
              ? "text-cyan-200"
              : isCurrentMonth
                ? "text-slate-200"
                : "text-slate-700"
          }`}
        >
          {day}
        </span>

        {isToday && (
          <span className="rounded-md bg-cyan-300 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-950 sm:text-[9px]">
            Today
          </span>
        )}
      </div>

      {taskCount > 0 && (
        <span
          className={`absolute bottom-2.5 left-2.5 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold sm:bottom-3 sm:left-3 ${
            STATUS_STYLES[taskStatus]
          }`}
        >
          {taskLabel}
        </span>
      )}
    </button>
  );
}
