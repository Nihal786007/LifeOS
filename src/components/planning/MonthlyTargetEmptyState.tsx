type Props = {
  onAdd?: () => void;
};

export default function MonthlyTargetEmptyState({
  onAdd,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 py-12 text-center">

      <div className="text-5xl">📅</div>

      <h3 className="mt-4 text-xl font-semibold text-white">
        No Monthly Targets Yet
      </h3>

      <p className="mt-2 max-w-md text-slate-400">
        Create your first monthly target and start moving
        towards your life goals.
      </p>

      <button
        onClick={onAdd}
        className="mt-6 rounded-lg bg-blue-600 px-5 py-2 font-medium text-white transition hover:bg-blue-700"
      >
        + Add Monthly Target
      </button>

    </div>
  );
}