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
    <div className="rounded-3xl border border-yellow-500/20 bg-slate-900/90 p-6 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400/80">
            Progression
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Level {level}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {totalXP.toLocaleString()} total XP
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-wider text-yellow-300/80">
            Next Level
          </p>

          <p className="mt-1 text-lg font-bold text-yellow-300">
            {xpNeededForNextLevel} XP
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Level Progress
          </span>

          <span className="font-semibold text-yellow-300">
            {progress}%
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-300 transition-all duration-700"
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