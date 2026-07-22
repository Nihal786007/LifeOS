import type { AtlasResult } from "../../atlas/types";
import ProgressRing from "./ProgressRing";

interface PerformanceOverviewProps {
  atlas: AtlasResult;
}

export default function PerformanceOverview({
  atlas,
}: PerformanceOverviewProps) {
  const analysis = atlas.analysis;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">

      <p className="text-xs uppercase tracking-[0.4em] text-cyan-400">
        Today's Performance
      </p>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-4 items-center">

        {/* Total Tasks */}
        <div className="text-center">

          <h2 className="text-5xl font-black">
            {analysis.totalTasks}
          </h2>

          <p className="mt-3 text-sm uppercase tracking-widest text-slate-500">
            Tasks
          </p>

        </div>

        {/* Completed */}
        <div className="text-center">

          <h2 className="text-5xl font-black text-green-400">
            {analysis.completedTasks}
          </h2>

          <p className="mt-3 text-sm uppercase tracking-widest text-slate-500">
            Completed
          </p>

        </div>

        {/* Progress */}
        <div className="flex justify-center">

          <ProgressRing
            value={analysis.completionRate}
          />

        </div>

        {/* Remaining */}
        <div className="text-center">

          <h2 className="text-5xl font-black text-orange-400">
            {analysis.pendingTasks}
          </h2>

          <p className="mt-3 text-sm uppercase tracking-widest text-slate-500">
            Remaining
          </p>

        </div>

      </div>

    </section>
  );
}