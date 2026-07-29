import type { DailyBriefing } from "../../atlas/types";

interface AtlasBriefingProps {
  briefing: DailyBriefing;
}

export default function AtlasBriefing({
  briefing,
}: AtlasBriefingProps) {
  return (
    <div className="rounded-3xl border border-cyan-500/20 bg-slate-900 p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-cyan-400">
          🧠 Daily Intelligence
        </h2>

        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-widest text-cyan-300">
          ATLAS
        </span>
      </div>

      <p className="mt-5 text-slate-300 leading-7">
        {briefing.summary}
      </p>

      <div className="my-6 h-px bg-slate-700" />

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Focus Score
          </p>

          <p className="mt-2 text-3xl font-bold text-cyan-400">
            {briefing.focusScore}%
          </p>
        </div>

        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Potential XP
          </p>

          <p className="mt-2 text-3xl font-bold text-yellow-400">
            {briefing.potentialXP}
          </p>
        </div>

        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Due Today
          </p>

          <p className="mt-2 text-3xl font-bold text-orange-400">
            {briefing.dueTodayTasks}
          </p>
        </div>

        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Overdue
          </p>

          <p className="mt-2 text-3xl font-bold text-red-400">
            {briefing.overdueTasks}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
        <p className="text-xs uppercase tracking-widest text-cyan-300">
          Primary Objective
        </p>

        <h3 className="mt-2 text-lg font-semibold">
          {briefing.recommendedMission}
        </h3>

        <p className="mt-3 text-slate-300">
          💡 {briefing.recommendation}
        </p>
      </div>
    </div>
  );
}