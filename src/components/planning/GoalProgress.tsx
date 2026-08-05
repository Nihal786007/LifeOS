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

        <span className="text-sm font-medium text-slate-300">
          Progress
        </span>

        <span className="text-sm font-semibold text-cyan-400">
          {safeProgress}%
        </span>

      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-800">

        <div
          className="h-full rounded-full bg-cyan-500 transition-all duration-500"
          style={{
            width: `${safeProgress}%`,
          }}
        />

      </div>

      <p className="mt-2 text-xs text-slate-500">
        Progress is automatically calculated by
        LifeOS as you complete linked plans and
        tasks.
      </p>

    </div>
  );
}