import Card from "../ui/Card";

interface AtlasReportProps {
  completionRate: number;
  pendingTasks: number;
}

export default function AtlasReport({
  completionRate,
  pendingTasks,
}: AtlasReportProps) {
  const status =
    completionRate >= 80
      ? "Excellent"
      : completionRate >= 50
      ? "Good"
      : "Needs Attention";

  const recommendation =
    pendingTasks === 0
      ? "Outstanding. All missions are complete."
      : `Focus on completing your highest-priority mission next. ${pendingTasks} mission${
          pendingTasks > 1 ? "s remain" : " remains"
        }.`;

  return (
    <Card className="border-cyan-500/20 bg-cyan-500/5">

      <h2 className="mb-6 text-2xl font-bold">
        🤖 ATLAS Report
      </h2>

      <div className="grid gap-5 md:grid-cols-3">

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">
            Mission Status
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {status}
          </h3>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">
            Completion
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {completionRate}%
          </h3>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">
            Pending
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {pendingTasks}
          </h3>
        </div>

      </div>

      <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-5">

        <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">
          Recommendation
        </p>

        <p className="mt-3 leading-7 text-slate-300">
          {recommendation}
        </p>

      </div>

    </Card>
  );
}