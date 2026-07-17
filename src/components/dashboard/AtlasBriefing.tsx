interface AtlasBriefingProps {
  summary: string;
  recommendation: string;
}

export default function AtlasBriefing({
  summary,
  recommendation,
}: AtlasBriefingProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-2xl font-bold mb-4">
        📋 Daily Briefing
      </h2>

      <div className="space-y-3 text-slate-300">
        <p>{summary}</p>

        <p className="text-cyan-400">
          💡 {recommendation}
        </p>
      </div>
    </div>
  );
}