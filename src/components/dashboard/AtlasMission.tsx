import type { SmartMission } from "../../atlas/types";

interface AtlasMissionProps {
  missions: SmartMission[];
}

export default function AtlasMission({
  missions,
}: AtlasMissionProps) {
  return (
    <div className="rounded-3xl border border-orange-500/30 bg-slate-900 p-6 shadow-lg">
      <h2 className="text-xl font-bold text-orange-400">
        🎯 Today's Missions
      </h2>

      <div className="mt-5 space-y-3">
        {missions.length === 0 ? (
          <p className="text-slate-400">
            No missions available.
          </p>
        ) : (
          missions.map((mission) => (
            <div
              key={mission.title}
              className="rounded-xl bg-slate-800 p-4"
            >
              <div className="flex justify-between">
                <span className="font-semibold">
                  {mission.title}
                </span>

                <span className="text-orange-400">
                  {mission.estimatedMinutes} min
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}