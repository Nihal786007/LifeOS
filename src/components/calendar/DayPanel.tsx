import type { Task } from "../../shared/types";

import ActivityCard from "../timeline/ActivityCard";

interface DayPanelProps {
  selectedDate: Date;
  tasks: Task[];
}

export default function DayPanel({
  selectedDate,
  tasks,
}: DayPanelProps) {
  const weekday = selectedDate.toLocaleDateString(undefined, {
    weekday: "long",
  });

  const fullDate = selectedDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

      {/* Header */}

      <div className="border-b border-slate-800 pb-5">

        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">
          Selected Day
        </p>

        <h2 className="mt-2 text-3xl font-black">
          {weekday}
        </h2>

        <p className="mt-1 text-slate-400">
          {fullDate}
        </p>

      </div>

      {/* Mission Count */}

      <div className="mt-6 flex items-center justify-between">

        <h3 className="text-lg font-bold">
          Missions
        </h3>

        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-300">
          {tasks.length}
        </span>

      </div>

      {/* Content */}

      <div className="mt-6 space-y-4">

        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">

            <div className="text-5xl">
              🌤️
            </div>

            <h3 className="mt-5 text-xl font-bold">
              Free Day
            </h3>

            <p className="mt-3 leading-7 text-slate-400">
              Nothing is scheduled for this day.
              Enjoy the extra time or create a new mission.
            </p>

          </div>
        ) : (
          tasks.map((task) => (
            <ActivityCard
              key={task.id}
              task={task}
            />
          ))
        )}

      </div>

    </aside>
  );
}