import type { AtlasResult } from "../../atlas/types";

interface AtlasPulseProps {
  atlas: AtlasResult;
}

export default function AtlasPulse({
  atlas,
}: AtlasPulseProps) {
  const productivity = atlas.analysis.completionRate;

  const focus =
    atlas.missions.length > 0
      ? atlas.missions[0].title
      : "No Active Mission";

  const missions = atlas.analysis.pendingTasks;

  const recommendation =
    atlas.recommendations.length > 0
      ? atlas.recommendations[0].description
      : "You're all caught up. Keep up the great work!";

  return (
    <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">

      <p className="text-xs uppercase tracking-[0.4em] text-cyan-400">
        Mission Pulse
      </p>

      <h2 className="mt-6 text-3xl font-bold">
        {productivity}%
      </h2>

      <p className="mt-2 text-slate-400">
        Overall Productivity
      </p>

      {/* Progress Bar */}
      <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">

        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-700"
          style={{
            width: `${productivity}%`,
          }}
        />

      </div>

      {/* Divider */}
      <div className="my-8 h-px bg-slate-800" />

      <div className="space-y-6">

        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Primary Focus
          </p>

          <h3 className="mt-2 text-xl font-semibold">
            {focus}
          </h3>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Active Missions
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {missions}
          </h3>
        </div>

      </div>

      {/* Recommendation */}

      <div className="mt-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">

        <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
          ATLAS Recommendation
        </p>

        <p className="mt-3 leading-7 text-slate-300">
          {recommendation}
        </p>

      </div>

    </aside>
  );
}