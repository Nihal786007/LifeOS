import type {
  DailyBriefing,
} from "../../atlas/types";

interface AtlasBriefingProps {
  briefing: DailyBriefing;
}

export default function AtlasBriefing({
  briefing,
}: AtlasBriefingProps) {
  return (
    <div className="rounded-3xl border border-lifeos-accent/20 bg-lifeos-surface p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-lifeos-accent">
          Daily Intelligence
        </h2>

        <span className="rounded-full bg-lifeos-accent/10 px-3 py-1 text-xs uppercase tracking-widest text-lifeos-accent">
          ATLAS
        </span>
      </div>

      <p className="mt-5 leading-7 text-lifeos-text-secondary">
        {briefing.summary}
      </p>

      <div className="my-6 h-px bg-lifeos-hover" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-lifeos-elevated p-4">
          <p className="text-xs uppercase tracking-wider text-lifeos-text-secondary">
            Focus Score
          </p>

          <p className="mt-2 text-3xl font-bold text-lifeos-accent">
            {briefing.focusScore}%
          </p>
        </div>

        <div className="rounded-xl bg-lifeos-elevated p-4">
          <p className="text-xs uppercase tracking-wider text-lifeos-text-secondary">
            Due Today
          </p>

          <p className="mt-2 text-3xl font-bold text-lifeos-warning">
            {briefing.dueTodayTasks}
          </p>
        </div>

        <div className="rounded-xl bg-lifeos-elevated p-4">
          <p className="text-xs uppercase tracking-wider text-lifeos-text-secondary">
            Overdue
          </p>

          <p className="mt-2 text-3xl font-bold text-lifeos-danger">
            {briefing.overdueTasks}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-lifeos-accent/20 bg-lifeos-accent/5 p-5">
        <p className="text-xs uppercase tracking-widest text-lifeos-accent">
          Primary Objective
        </p>

        <h3 className="mt-2 text-lg font-semibold">
          {briefing.recommendedMission}
        </h3>

        <p className="mt-3 text-lifeos-text-secondary">
          {briefing.recommendation}
        </p>
      </div>
    </div>
  );
}