import type { SmartMission } from "../../atlas/types";

interface AtlasMissionProps {
  missions: SmartMission[];
}

export default function AtlasMission({
  missions,
}: AtlasMissionProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30";
    }
  };

  return (
    <div className="rounded-3xl border border-orange-500/30 bg-slate-900 p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-orange-400">
          🎯 Today's Missions
        </h2>

        <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-300">
          {missions.length} Active
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {missions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
            <p className="text-slate-400">
              No missions available.
            </p>
          </div>
        ) : (
          missions.map((mission) => (
            <div
              key={mission.title}
              className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 transition-all duration-300 hover:border-orange-500/40 hover:bg-slate-800 hover:shadow-lg hover:shadow-orange-500/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {mission.title}
                  </h3>

                  <p className="mt-3 text-sm text-slate-400">
                    {mission.reason}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityColor(
                    mission.priority
                  )}`}
                >
                  {mission.priority.toUpperCase()}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <div className="rounded-lg bg-slate-900 px-3 py-2 text-sm">
                  ⏱ {mission.estimatedMinutes} min
                </div>

                <div className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-yellow-400">
                  ⭐ {mission.xp} XP
                </div>

                {mission.completed && (
                  <div className="rounded-lg bg-green-500/20 px-3 py-2 text-sm text-green-400">
                    ✅ Completed
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}