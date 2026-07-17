interface AtlasTrendProps {
  trend: string;
  averageCompletion: number;
}

export default function AtlasTrend({
  trend,
  averageCompletion,
}: AtlasTrendProps) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <h2 className="text-xl font-bold text-purple-400">
        📊 Trend Analysis
      </h2>

      <div className="mt-5 space-y-2">
        <p>
          Weekly Trend: <strong>{trend}</strong>
        </p>

        <p>
          Average Completion:{" "}
          <strong>{averageCompletion}%</strong>
        </p>
      </div>
    </div>
  );
}