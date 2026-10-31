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
    <section className="rounded-3xl border border-lifeos-border bg-lifeos-surface p-8 shadow-xl">
      <p className="text-xs uppercase tracking-[0.12em] text-lifeos-accent">
        Today's Performance
      </p>

      <div className="mt-10 grid grid-cols-1 gap-10 items-center lg:grid-cols-4">
        <div className="text-center">
          <h2 className="text-5xl font-bold">{analysis.totalTasks}</h2>

          <p className="mt-3 text-sm uppercase tracking-widest text-lifeos-muted">
            Tasks
          </p>
        </div>

        <div className="text-center">
          <h2 className="text-5xl font-bold text-lifeos-success">
            {analysis.completedTasks}
          </h2>

          <p className="mt-3 text-sm uppercase tracking-widest text-lifeos-muted">
            Completed
          </p>
        </div>

        <div className="flex justify-center">
          <ProgressRing value={analysis.completionRate} />
        </div>

        <div className="text-center">
          <h2 className="text-5xl font-bold text-lifeos-warning">
            {analysis.pendingTasks}
          </h2>

          <p className="mt-3 text-sm uppercase tracking-widest text-lifeos-muted">
            Remaining
          </p>
        </div>
      </div>
    </section>
  );
}