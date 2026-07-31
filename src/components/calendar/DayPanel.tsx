interface DayPanelProps {
  selectedDate: Date;
}

export default function DayPanel({
  selectedDate,
}: DayPanelProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-2xl font-bold">
        {selectedDate.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </h2>

      <p className="mt-4 text-slate-400">
        No activities yet.
      </p>
    </div>
  );
}