interface AtlasXPProps {
  totalXP: number;
  level: number;
  progress: number;
  xpNeededForNextLevel: number;
}

export default function AtlasXP({
  totalXP,
  level,
  progress,
  xpNeededForNextLevel,
}: AtlasXPProps) {
  return (
    <div className="rounded-3xl border border-lifeos-warning/20 bg-lifeos-surface/90 p-6 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lifeos-warning">
            Progression
          </p>

          <h2 className="mt-2 text-2xl font-bold text-lifeos-text">
            Level {level}
          </h2>

          <p className="mt-1 text-sm text-lifeos-text-secondary">
            {totalXP.toLocaleString()} total XP
          </p>
        </div>

        <div className="rounded-2xl border border-lifeos-warning/20 bg-lifeos-warning/10 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-wider text-lifeos-warning">
            Next Level
          </p>

          <p className="mt-1 text-lg font-bold text-lifeos-warning">
            {xpNeededForNextLevel} XP
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-lifeos-text-secondary">
            Level Progress
          </span>

          <span className="font-semibold text-lifeos-warning">
            {progress}%
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-lifeos-elevated">
          <div
            className="h-full rounded-full bg-gradient-to-r from-lifeos-warning to-lifeos-warning transition-all duration-700"
            style={{
              width: `${Math.min(
                100,
                Math.max(0, progress)
              )}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}