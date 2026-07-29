import type { Recommendation } from "../../atlas/types";

interface AtlasRecommendationsProps {
  recommendations: Recommendation[];
}

export default function AtlasRecommendations({
  recommendations,
}: AtlasRecommendationsProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30";
    }
  };

  return (
    <div className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-cyan-400">
          💡 AI Recommendations
        </h2>

        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-widest text-cyan-300">
          ATLAS
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
            <p className="text-slate-400">
              No recommendations available.
            </p>
          </div>
        ) : (
          recommendations.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-800 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-slate-400">
                    {item.description}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityColor(
                    item.priority
                  )}`}
                >
                  {item.priority.toUpperCase()}
                </span>
              </div>

              <div className="mt-5 rounded-xl bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-widest text-cyan-300">
                  Related Mission
                </p>

                <p className="mt-2 font-semibold">
                  {item.missionTitle}
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <p className="text-xs uppercase tracking-widest text-cyan-300">
                  ATLAS Reason
                </p>

                <p className="mt-2 text-slate-300">
                  {item.reason}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}