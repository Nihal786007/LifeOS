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
    <Card className="border-purple-500/20 bg-purple-500/5">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm uppercase tracking-[0.3em] text-purple-400">
            Weekly Review
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Weekly Performance
          </h2>

        </div>

        <div className="text-5xl">
          📈
        </div>

      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">

        <div className="rounded-2xl bg-slate-900 p-5">

          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
            Missions
          </p>

          <h3 className="mt-3 text-4xl font-black text-green-400">
            {completedTasks}
          </h3>

        </div>

        <div className="rounded-2xl bg-slate-900 p-5">

          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
            Completion
          </p>

          <h3 className="mt-3 text-4xl font-black text-cyan-400">
            {completionRate}%
          </h3>

        </div>

        <div className="rounded-2xl bg-slate-900 p-5">

          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
            XP Earned
          </p>

          <h3 className="mt-3 text-4xl font-black text-yellow-400">
            +{xpEarned}
          </h3>

        </div>

      </div>

      <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-6">

        <p className="text-sm uppercase tracking-[0.25em] text-purple-400">
          🤖 ATLAS Weekly Insight
        </p>

        <p className="mt-4 leading-8 text-slate-300">
          {message}
        </p>

      </div>

    </Card>
  );
}