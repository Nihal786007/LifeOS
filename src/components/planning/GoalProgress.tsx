interface GoalProgressProps {
  progress: number;
}

export default function GoalProgress({
  progress,
}: GoalProgressProps) {
  const safeProgress = Math.max(
    0,
    Math.min(progress, 100)
  );

  return (
    <div className="mt-5">

      <div className="mb-2 flex items-center justify-between">

        <span className="text-sm font-medium text-lifeos-text-secondary">
          Progress
        </span>

        <span className="text-sm font-semibold text-lifeos-accent">
          {safeProgress}%
        </span>

      </div>

      <div className="h-3 overflow-hidden rounded-full bg-lifeos-elevated">

        <div
          className="h-full rounded-full bg-lifeos-accent transition-all duration-500"
          style={{
            width: `${safeProgress}%`,
          }}
        />

      </div>

      <p className="mt-2 text-xs text-lifeos-muted">
        Progress is automatically calculated by
        LifeOS as you complete linked plans and
        tasks.
      </p>

    </div>
  );
}