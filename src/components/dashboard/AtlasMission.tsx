import type {
  SmartMission,
} from "../../atlas/types";

interface AtlasMissionProps {
  missions: SmartMission[];
}

export default function AtlasMission({
  missions,
}: AtlasMissionProps) {
  const getPriorityColor = (
    priority: string
  ) => {
    switch (
      priority.toLowerCase()
    ) {
      case "high":
        return "bg-lifeos-danger/20 text-lifeos-danger border-lifeos-danger/30";

      case "medium":
        return "bg-lifeos-warning/20 text-lifeos-warning border-lifeos-warning/30";

      default:
        return "bg-lifeos-success/20 text-lifeos-success border-lifeos-success/30";
    }
  };

  return (
    <div className="rounded-3xl border border-lifeos-warning/30 bg-lifeos-surface p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-lifeos-warning">
          🎯 Today's Missions
        </h2>

        <span className="rounded-full bg-lifeos-warning/10 px-3 py-1 text-sm text-lifeos-warning">
          {missions.length} Active
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {missions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-lifeos-border p-8 text-center">
            <p className="text-lifeos-text-secondary">
              No missions available.
            </p>
          </div>
        ) : (
          missions.map(
            (mission) => (
              <div
                key={
                  mission.title
                }
                className="rounded-2xl border border-lifeos-border bg-lifeos-elevated/70 p-5 transition-all duration-300 hover:border-lifeos-warning/40 hover:bg-lifeos-elevated hover:shadow-lg hover:shadow-lifeos-warning/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {
                        mission.title
                      }
                    </h3>

                    <p className="mt-3 text-sm text-lifeos-text-secondary">
                      {
                        mission.reason
                      }
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityColor(
                      mission.priority
                    )}`}
                  >
                    {mission.priority.toUpperCase()}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="rounded-lg bg-lifeos-surface px-3 py-2 text-sm">
                    ⏱{" "}
                    {
                      mission.estimatedMinutes
                    }{" "}
                    min
                  </div>

                  {mission.completed && (
                    <div className="rounded-lg bg-lifeos-success/20 px-3 py-2 text-sm text-lifeos-success">
                      ✅ Completed
                    </div>
                  )}
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}