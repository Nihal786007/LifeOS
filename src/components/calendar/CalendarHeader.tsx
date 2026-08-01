interface CalendarHeaderProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export default function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
}: CalendarHeaderProps) {
  const month = currentDate.toLocaleString("default", {
    month: "long",
  });

  const year = currentDate.getFullYear();

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 xl:flex-row xl:items-center xl:justify-between">

      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
          Mission Timeline
        </p>

        <h1 className="mt-2 text-5xl font-black">
          {month} {year}
        </h1>

        <p className="mt-3 text-slate-400">
          Plan missions, review progress, and let ATLAS guide your schedule.
        </p>
      </div>

      <div className="flex items-center gap-4">

        <button
          onClick={onPreviousMonth}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 transition hover:border-cyan-500 hover:text-cyan-400"
        >
          ←
        </button>

        <button
          onClick={onNextMonth}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 transition hover:border-cyan-500 hover:text-cyan-400"
        >
          →
        </button>

      </div>

    </div>
  );
}