import ProgressRing from "./ProgressRing";

type PerformanceOverviewProps = {
  total: number;
  completed: number;
  productivity: number;
  remaining: number;
};

export default function PerformanceOverview({
  total,
  completed,
  productivity,
  remaining,
}: PerformanceOverviewProps) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">

      <p className="text-xs uppercase tracking-[0.4em] text-cyan-400">
        Today's Performance
      </p>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-4 items-center">

        {/* Tasks */}
        <div className="text-center">

          <h2 className="text-5xl font-black">
            {total}
          </h2>

          <p className="mt-3 text-sm uppercase tracking-widest text-slate-500">
            Tasks
          </p>

        </div>

        {/* Completed */}
        <div className="text-center">

          <h2 className="text-5xl font-black text-green-400">
            {completed}
          </h2>

          <p className="mt-3 text-sm uppercase tracking-widest text-slate-500">
            Completed
          </p>

        </div>

        {/* Progress Ring */}
        <div className="flex justify-center">

          <ProgressRing value={productivity} />

        </div>

        {/* Remaining */}
        <div className="text-center">

          <h2 className="text-5xl font-black text-orange-400">
            {remaining}
          </h2>

          <p className="mt-3 text-sm uppercase tracking-widest text-slate-500">
            Remaining
          </p>

        </div>

      </div>

    </section>
  );
}