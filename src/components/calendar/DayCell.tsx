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
        group relative min-h-14 min-w-0 rounded-lg border p-1.5 text-left transition
        sm:min-h-24 sm:rounded-xl sm:p-3
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
      <div className="flex items-start justify-center sm:justify-between sm:gap-1">
        <span
          className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold sm:h-auto sm:min-w-0 sm:justify-start sm:rounded-none sm:p-0 sm:text-base ${
            isSelected
              ? "bg-cyan-300 text-slate-950 sm:bg-transparent sm:text-cyan-200"
              : isCurrentMonth
                ? "text-slate-200"
                : "text-slate-700"
          }`}
        >
          {day}
        </span>

        {isToday && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-300 sm:static sm:h-auto sm:w-auto sm:rounded-md sm:px-1.5 sm:py-0.5 sm:text-[9px] sm:font-black sm:uppercase sm:tracking-wide sm:text-slate-950">
            <span className="sr-only sm:not-sr-only">Today</span>
          </span>
        )}
      </div>

      {taskCount > 0 && (
        <span
          className={`absolute bottom-1.5 left-1/2 inline-flex -translate-x-1/2 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold sm:bottom-3 sm:left-3 sm:translate-x-0 sm:rounded-md ${
            STATUS_STYLES[taskStatus]
          }`}
        >
          <span className="sm:hidden">{taskCount}</span>
          <span className="hidden sm:inline">{taskLabel}</span>
        </span>
      )}
    </button>
  );
}
