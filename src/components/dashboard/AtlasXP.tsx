interface AtlasXPProps {
  xp: number;
  level: number;
}

export default function AtlasXP({
  xp,
  level,
}: AtlasXPProps) {
  const progress = xp % 100;

  return (
    <div className="rounded-3xl border border-yellow-500/30 bg-slate-900 p-6 shadow-lg">
      <h2 className="text-xl font-bold text-yellow-400">
        🏆 XP & Level
      </h2>

      <div className="mt-6">
        <p className="text-3xl font-bold text-white">
          Level {level}
        </p>

        <p className="mt-2 text-slate-400">
          {xp} XP
        </p>

        <div className="mt-5 h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-yellow-400 transition-all duration-700"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}