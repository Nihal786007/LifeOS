import Card from "../ui/Card";

interface WeeklyReviewProps {
  completedTasks: number;
  completionRate: number;
  xpEarned: number;
}

export default function WeeklyReview({
  completedTasks,
  completionRate,
  xpEarned,
}: WeeklyReviewProps) {
  const message =
    completionRate >= 80
      ? "Excellent consistency this week. Keep maintaining your momentum."
      : completionRate >= 50
      ? "A solid week overall. Completing a few more missions earlier in the day could improve your consistency."
      : "This week had room for improvement. Focus on completing one high-priority mission each day.";

  return (
    <Card className="border-lifeos-chart-secondary/20 bg-lifeos-chart-secondary/5">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm uppercase tracking-[0.12em] text-lifeos-chart-secondary">
            Weekly Review
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Weekly Performance
          </h2>

        </div>

        <div className="text-5xl">
          📈
        </div>

      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">

        <div className="rounded-2xl bg-lifeos-surface p-5">

          <p className="text-sm uppercase tracking-[0.12em] text-lifeos-text-secondary">
            Missions
          </p>

          <h3 className="mt-3 text-4xl font-bold text-lifeos-success">
            {completedTasks}
          </h3>

        </div>

        <div className="rounded-2xl bg-lifeos-surface p-5">

          <p className="text-sm uppercase tracking-[0.12em] text-lifeos-text-secondary">
            Completion
          </p>

          <h3 className="mt-3 text-4xl font-bold text-lifeos-accent">
            {completionRate}%
          </h3>

        </div>

        <div className="rounded-2xl bg-lifeos-surface p-5">

          <p className="text-sm uppercase tracking-[0.12em] text-lifeos-text-secondary">
            XP Earned
          </p>

          <h3 className="mt-3 text-4xl font-bold text-lifeos-warning">
            +{xpEarned}
          </h3>

        </div>

      </div>

      <div className="mt-8 rounded-2xl border border-lifeos-border bg-lifeos-surface p-6">

        <p className="text-sm uppercase tracking-[0.12em] text-lifeos-chart-secondary">
          🤖 ATLAS Weekly Insight
        </p>

        <p className="mt-4 leading-8 text-lifeos-text-secondary">
          {message}
        </p>

      </div>

    </Card>
  );
}