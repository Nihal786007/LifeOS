interface DayCellProps {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export default function DayCell({
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  onClick,
}: DayCellProps) {
  return (
    <button
      onClick={onClick}
      className={`
        h-28 rounded-2xl border p-4 text-left transition

        ${
          isCurrentMonth
            ? "border-slate-800 bg-slate-900"
            : "border-slate-900 bg-slate-950 text-slate-500"
        }

        ${
          isToday
            ? "ring-2 ring-cyan-400"
            : ""
        }

        ${
          isSelected
            ? "border-cyan-400 bg-cyan-500/10"
            : ""
        }

        hover:border-cyan-500
      `}
    >
      <p className="font-bold">{day}</p>
    </button>
  );
}