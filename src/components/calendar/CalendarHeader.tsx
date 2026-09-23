import {
  FaCalendarDay,
  FaChevronLeft,
  FaChevronRight,
  FaListCheck,
} from "react-icons/fa6";

interface CalendarHeaderProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onOpenTasks: () => void;
}

export default function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onOpenTasks,
}: CalendarHeaderProps) {
  const monthLabel = currentDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <header className="lifeos-page-header">
      <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="lifeos-page-eyebrow">
            Task calendar
          </p>
          <h1 className="lifeos-page-title">{monthLabel}</h1>
          <p className="lifeos-page-description">
            See what is due today, inspect any date, and look ahead without
            creating another task system.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToday}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-lifeos-border bg-lifeos-elevated px-4 py-2.5 text-sm font-semibold text-lifeos-text transition hover:bg-lifeos-hover focus-visible:outline-2 focus-visible:outline-lifeos-focus"
          >
            <FaCalendarDay />
            Today
          </button>

          <div className="flex items-center rounded-xl border border-lifeos-border bg-lifeos-surface p-1">
            <button
              type="button"
              onClick={onPreviousMonth}
              aria-label="Previous month"
              className="lifeos-icon-button !min-h-9 !min-w-9 !border-0"
            >
              <FaChevronLeft />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="Next month"
              className="lifeos-icon-button !min-h-9 !min-w-9 !border-0"
            >
              <FaChevronRight />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenTasks}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-lifeos-accent px-4 py-2.5 text-sm font-bold text-lifeos-accent-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-lifeos-focus"
          >
            <FaListCheck />
            Open Tasks
          </button>
        </div>
      </div>
    </header>
  );
}
