import type { Recommendation } from "../../atlas/types";

interface AtlasRecommendationsProps {
  recommendations: Recommendation[];
}

export default function AtlasRecommendations({
  recommendations,
}: AtlasRecommendationsProps) {
  return (
    <div className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-lg">
      <h2 className="text-xl font-bold text-cyan-400">
        💡 Recommendations
      </h2>

      <div className="mt-5 space-y-3">
        {recommendations.map((item) => (
          <div
            key={item.title}
            className="rounded-xl bg-slate-800 p-4"
          >
            <p className="font-semibold text-white">
              {item.title}
            </p>

            <p className="mt-2 text-slate-400">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}