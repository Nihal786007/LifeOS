import Button from "../ui/Button";

interface TaskEmptyStateProps {
  onAdd: () => void;
}

export default function TaskEmptyState({
  onAdd,
}: TaskEmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">

      <div className="text-6xl">
        📋
      </div>

      <h3 className="mt-6 text-2xl font-bold text-white">
        No Tasks for Today
      </h3>

      <p className="mt-3 text-slate-400">
        Plan your day and focus on what matters most.
      </p>

      <Button
        className="mt-8"
        onClick={onAdd}
      >
        + Add Your First Task
      </Button>

    </div>
  );
}