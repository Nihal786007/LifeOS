interface AtlasStatsProps {
  productivity: number;
  completed: number;
  total: number;
  remaining: number;
}

export default function AtlasStats({
  productivity,
  completed,
  total,
  remaining,
}: AtlasStatsProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">

      <div className="rounded-2xl bg-slate-900 p-6 border border-slate-700">
        <p className="text-slate-400">Tasks</p>
        <h2 className="mt-2 text-3xl font-bold">
          {total}
        </h2>
      </div>

      <div className="rounded-2xl bg-slate-900 p-6 border border-slate-700">
        <p className="text-slate-400">Completed</p>
        <h2 className="mt-2 text-3xl font-bold text-green-400">
          {completed}
        </h2>
      </div>

      <div className="rounded-2xl bg-slate-900 p-6 border border-slate-700">
        <p className="text-slate-400">Productivity</p>
        <h2 className="mt-2 text-3xl font-bold text-cyan-400">
          {productivity}%
        </h2>
      </div>

      <div className="rounded-2xl bg-slate-900 p-6 border border-slate-700">
        <p className="text-slate-400">Remaining</p>
        <h2 className="mt-2 text-3xl font-bold text-orange-400">
          {remaining}
        </h2>
      </div>

    </div>
  );
}