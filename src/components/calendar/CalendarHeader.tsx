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
    <header className="rounded-[2rem] border border-cyan-400/15 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/25 p-7 lg:p-9">
      <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
            Task calendar
          </p>
          <h1 className="mt-3 text-4xl font-black text-white">{monthLabel}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            See what is due today, inspect any date, and look ahead without
            creating another task system.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToday}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
          >
            <FaCalendarDay />
            Today
          </button>

          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            <button
              type="button"
              onClick={onPreviousMonth}
              aria-label="Previous month"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <FaChevronLeft />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="Next month"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <FaChevronRight />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenTasks}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            <FaListCheck />
            Open Tasks
          </button>
        </div>
      </div>
    </header>
  );
}
