import type { Activity } from "../shared/activity";

export function calculateTotalXP(
  activities: Activity[]
) {
  return activities
    .filter(a => a.status === "completed")
    .reduce((sum, a) => sum + a.xpReward, 0);
}