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
  externalEventCount: number;
  onClick: () => void;
}

const STATUS_STYLES: Readonly<Record<CalendarTaskStatus, string>> = {
  none: "",
  active: "border-lifeos-accent/20 bg-lifeos-accent/10 text-lifeos-accent",
  overdue: "border-lifeos-danger/20 bg-lifeos-danger/10 text-lifeos-danger",
  mixed: "border-lifeos-warning/20 bg-lifeos-warning/10 text-lifeos-warning",
  completed: "border-lifeos-success/20 bg-lifeos-success/10 text-lifeos-success",
};

export default function DayCell({
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  taskCount,
  taskStatus,
  externalEventCount,
  onClick,
}: DayCellProps) {
  const taskLabel = taskCount === 1 ? "1 task" : `${taskCount} tasks`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`${day}, ${taskCount > 0 ? taskLabel : "no tasks"}, ${externalEventCount} Google ${externalEventCount === 1 ? "event" : "events"}${
        isToday ? ", today" : ""
      }`}
      className={`
        group relative min-h-14 min-w-0 rounded-lg border p-1.5 text-left transition
        sm:min-h-24 sm:rounded-xl sm:p-3
        ${
          isCurrentMonth
            ? "border-lifeos-border bg-lifeos-surface/80"
            : "border-lifeos-border bg-lifeos-app/45 text-lifeos-muted"
        }
        ${
          isSelected
            ? "border-lifeos-accent bg-lifeos-accent/10 shadow-[0_0_0_1px_rgba(103,232,249,0.18)]"
            : "hover:border-lifeos-border hover:bg-lifeos-surface"
        }
      `}
    >
      <div className="flex items-start justify-center sm:justify-between sm:gap-1">
        <span
          className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold sm:h-auto sm:min-w-0 sm:justify-start sm:rounded-none sm:p-0 sm:text-base ${
            isSelected
              ? "bg-lifeos-accent text-lifeos-accent-foreground sm:bg-transparent sm:text-lifeos-accent"
              : isCurrentMonth
                ? "text-lifeos-text"
                : "text-lifeos-muted"
          }`}
        >
          {day}
        </span>

        {isToday && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-lifeos-accent sm:static sm:h-auto sm:w-auto sm:rounded-md sm:px-1.5 sm:py-0.5 sm:text-[11px] sm:font-bold sm:uppercase sm:tracking-wide sm:text-lifeos-accent-foreground">
            <span className="sr-only sm:not-sr-only">Today</span>
          </span>
        )}
      </div>

      {taskCount > 0 && (
        <span
          className={`absolute bottom-1.5 left-1/2 inline-flex -translate-x-1/2 items-center rounded-full border px-1.5 py-0.5 text-[11px] font-semibold sm:bottom-3 sm:left-3 sm:translate-x-0 sm:rounded-md ${
            STATUS_STYLES[taskStatus]
          }`}
        >
          <span className="sm:hidden">{taskCount}</span>
          <span className="hidden sm:inline">{taskLabel}</span>
        </span>
      )}
      {externalEventCount > 0 && <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-lifeos-accent sm:bottom-3 sm:right-3" aria-hidden="true" />}
    </button>
  );
}
