import type { AtlasResult } from "../atlas/types";

interface AICardProps {
  atlas: AtlasResult;
}

export default function AICard({ atlas }: AICardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-2xl font-bold mb-4">
        🤖 ATLAS AI Assistant
      </h2>

      <div className="rounded-xl bg-slate-950 p-4 text-slate-300 space-y-3">

        <p>
          <strong>{atlas.greeting}</strong>
        </p>

        <p>
          {atlas.briefing.summary}
        </p>

        <p>
          💡 {atlas.briefing.recommendation}
        </p>

        {atlas.recommendations.map((rec, index) => (
          <div key={index}>
            <p className="font-semibold">
              {rec.title}
            </p>

            <p className="text-sm text-slate-400">
              {rec.description}
            </p>
          </div>
        ))}

        <p className="italic text-cyan-400">
          "{atlas.motivation}"
        </p>

      </div>
    </div>
  );
}