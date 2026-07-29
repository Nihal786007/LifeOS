import type { AtlasResult } from "../../atlas/types";

interface AtlasStatsProps {
  atlas: AtlasResult;
}

export default function AtlasStats({
  atlas,
}: AtlasStatsProps) {
  const { analysis } = atlas;

  const stats = [
    {
      title: "Focus Score",
      value: `${analysis.focusScore}%`,
      color: "text-cyan-400",
    },
    {
      title: "Potential XP",
      value: analysis.potentialXP,
      color: "text-yellow-400",
    },
    {
      title: "Productivity",
      value: `${analysis.completionRate}%`,
      color: "text-green-400",
    },
    {
      title: "Pending Tasks",
      value: analysis.pendingTasks,
      color: "text-orange-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-6 transition-all duration-300 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10"
        >
          <p className="text-sm uppercase tracking-wider text-slate-400">
            {stat.title}
          </p>

          <h2 className={`mt-3 text-4xl font-bold ${stat.color}`}>
            {stat.value}
          </h2>
        </div>
      ))}
    </div>
  );
}