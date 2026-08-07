interface Props {
  hasMonthlyTargets: boolean;
  onAdd: () => void;
}

export default function WeeklyTargetEmptyState({
  hasMonthlyTargets,
  onAdd,
}: Props) {
  if (!hasMonthlyTargets) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 py-12 text-center">
        <div className="text-5xl">📅</div>

        <h3 className="mt-4 text-xl font-semibold text-white">
          Create a Monthly Target First
        </h3>

        <p className="mt-2 text-slate-400">
          Weekly Targets are created inside a Monthly Target.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-700 py-12 text-center">
      <div className="text-5xl">📆</div>

      <h3 className="mt-4 text-xl font-semibold text-white">
        No Weekly Targets Yet
      </h3>

      <p className="mt-2 text-slate-400">
        Break your Monthly Target into weekly milestones.
      </p>

      <button
        onClick={onAdd}
        className="mt-6 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
      >
        + Add Weekly Target
      </button>
    </div>
  );
}