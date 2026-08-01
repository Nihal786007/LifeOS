interface DayCellProps {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasTasks: boolean;
  onClick: () => void;
}

export default function DayCell({
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  hasTasks,
  onClick,
}: DayCellProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group
        relative
        h-28
        rounded-2xl
        border
        p-4
        text-left
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-lg
        hover:shadow-cyan-500/10

        ${
          isCurrentMonth
            ? "border-slate-800 bg-slate-900"
            : "border-slate-900 bg-slate-950 text-slate-600"
        }

        ${
          isSelected
            ? "border-cyan-400 bg-cyan-500/15 shadow-lg shadow-cyan-500/20"
            : "hover:border-cyan-500"
        }
      `}
    >
      {/* Today Indicator */}
      {isToday && (
        <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
      )}

      {/* Task Indicator */}
      {hasTasks && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50" />
        </div>
      )}

      <p
        className={`
          text-lg
          font-bold
          transition-colors

          ${
            isSelected
              ? "text-cyan-300"
              : isCurrentMonth
              ? "text-white"
              : "text-slate-500"
          }
        `}
      >
        {day}
      </p>
    </button>
  );
}