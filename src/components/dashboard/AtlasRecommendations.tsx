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
        return "bg-lifeos-danger/20 text-lifeos-danger border-lifeos-danger/30";
      case "medium":
        return "bg-lifeos-warning/20 text-lifeos-warning border-lifeos-warning/30";
      default:
        return "bg-lifeos-success/20 text-lifeos-success border-lifeos-success/30";
    }
  };

  return (
    <div className="rounded-3xl border border-lifeos-accent/30 bg-lifeos-surface p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-lifeos-accent">
          💡 AI Recommendations
        </h2>

        <span className="rounded-full bg-lifeos-accent/10 px-3 py-1 text-xs uppercase tracking-widest text-lifeos-accent">
          ATLAS
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-lifeos-border p-8 text-center">
            <p className="text-lifeos-text-secondary">
              No recommendations available.
            </p>
          </div>
        ) : (
          recommendations.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-lifeos-border bg-lifeos-elevated/70 p-5 transition-all duration-300 hover:border-lifeos-accent/40 hover:bg-lifeos-elevated hover:shadow-lg hover:shadow-lifeos-accent/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-lifeos-text-secondary">
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

              <div className="mt-5 rounded-xl bg-lifeos-surface p-4">
                <p className="text-xs uppercase tracking-widest text-lifeos-accent">
                  Related Mission
                </p>

                <p className="mt-2 font-semibold">
                  {item.missionTitle}
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-lifeos-accent/20 bg-lifeos-accent/5 p-4">
                <p className="text-xs uppercase tracking-widest text-lifeos-accent">
                  ATLAS Reason
                </p>

                <p className="mt-2 text-lifeos-text-secondary">
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