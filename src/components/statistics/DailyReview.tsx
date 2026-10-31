import Card from "../ui/Card";

interface DailyReviewProps {
  completedTasks: number;
  pendingTasks: number;
  xpEarned: number;
}

export default function DailyReview({
  completedTasks,
  pendingTasks,
  xpEarned,
}: DailyReviewProps) {
  const message =
    pendingTasks === 0
      ? "Outstanding! Every mission for today has been completed."
      : pendingTasks <= 3
      ? "You're almost done. Finish the remaining missions to complete the day."
      : "Focus on your highest-priority mission first and build momentum.";

  return (
    <Card className="border-lifeos-accent/20 bg-lifeos-accent/5">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm uppercase tracking-[0.12em] text-lifeos-accent">
            Daily Review
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Today's Performance
          </h2>
        </div>

        <div className="text-5xl">
          📅
        </div>

      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">

        <div className="rounded-2xl bg-lifeos-surface p-5">

          <p className="text-sm uppercase tracking-[0.12em] text-lifeos-text-secondary">
            Completed
          </p>

          <h3 className="mt-3 text-4xl font-bold text-lifeos-success">
            {completedTasks}
          </h3>

          <p className="mt-2 text-lifeos-muted">
            Missions Finished
          </p>

        </div>

        <div className="rounded-2xl bg-lifeos-surface p-5">

          <p className="text-sm uppercase tracking-[0.12em] text-lifeos-text-secondary">
            Remaining
          </p>

          <h3 className="mt-3 text-4xl font-bold text-lifeos-warning">
            {pendingTasks}
          </h3>

          <p className="mt-2 text-lifeos-muted">
            Missions Left
          </p>

        </div>

        <div className="rounded-2xl bg-lifeos-surface p-5">

          <p className="text-sm uppercase tracking-[0.12em] text-lifeos-text-secondary">
            XP Earned
          </p>

          <h3 className="mt-3 text-4xl font-bold text-lifeos-accent">
            +{xpEarned}
          </h3>

          <p className="mt-2 text-lifeos-muted">
            Experience Today
          </p>

        </div>

      </div>

      <div className="mt-8 rounded-2xl border border-lifeos-border bg-lifeos-surface p-6">

        <p className="text-sm uppercase tracking-[0.12em] text-lifeos-accent">
          🤖 ATLAS Daily Insight
        </p>

        <p className="mt-4 leading-8 text-lifeos-text-secondary">
          {message}
        </p>

      </div>

    </Card>
  );
}