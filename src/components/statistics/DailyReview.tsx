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
    <Card className="border-cyan-500/20 bg-cyan-500/5">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">
            Daily Review
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Today's Performance
          </h2>
        </div>

        <div className="text-5xl">
          📅
        </div>

      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">

        <div className="rounded-2xl bg-slate-900 p-5">

          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
            Completed
          </p>

          <h3 className="mt-3 text-4xl font-black text-green-400">
            {completedTasks}
          </h3>

          <p className="mt-2 text-slate-500">
            Missions Finished
          </p>

        </div>

        <div className="rounded-2xl bg-slate-900 p-5">

          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
            Remaining
          </p>

          <h3 className="mt-3 text-4xl font-black text-yellow-400">
            {pendingTasks}
          </h3>

          <p className="mt-2 text-slate-500">
            Missions Left
          </p>

        </div>

        <div className="rounded-2xl bg-slate-900 p-5">

          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
            XP Earned
          </p>

          <h3 className="mt-3 text-4xl font-black text-cyan-400">
            +{xpEarned}
          </h3>

          <p className="mt-2 text-slate-500">
            Experience Today
          </p>

        </div>

      </div>

      <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-6">

        <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
          🤖 ATLAS Daily Insight
        </p>

        <p className="mt-4 leading-8 text-slate-300">
          {message}
        </p>

      </div>

    </Card>
  );
}