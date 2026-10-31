import { FaBullseye } from "react-icons/fa";

interface GoalEmptyStateProps {
  onCreate: () => void;
}

export default function GoalEmptyState({
  onCreate,
}: GoalEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-lifeos-border bg-lifeos-surface/50 px-8 py-16 text-center">

      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-lifeos-accent/10 text-4xl text-lifeos-accent">
        <FaBullseye />
      </div>

      <h3 className="mt-6 text-2xl font-bold text-lifeos-text">
        No Life Goals Yet
      </h3>

      <p className="mt-3 max-w-md leading-7 text-lifeos-text-secondary">
        Every achievement starts with a single goal.
        Create your first Life Goal and let LifeOS
        help you turn it into reality.
      </p>

      <button
        onClick={onCreate}
        className="mt-8 rounded-xl bg-lifeos-accent px-6 py-3 font-semibold text-lifeos-accent-foreground transition hover:bg-lifeos-accent"
      >
        + Create Your First Goal
      </button>

    </div>
  );
}