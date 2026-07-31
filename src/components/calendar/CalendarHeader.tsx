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
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-black">
          Life Timeline
        </h1>

        <p className="mt-2 text-slate-400">
          Powered by ATLAS
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onPreviousMonth}
          className="rounded-xl border border-slate-700 px-4 py-2 hover:border-cyan-500"
        >
          ←
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold">
            {month} {year}
          </h2>
        </div>

        <button
          onClick={onNextMonth}
          className="rounded-xl border border-slate-700 px-4 py-2 hover:border-cyan-500"
        >
          →
        </button>
      </div>
    </div>
  );
}