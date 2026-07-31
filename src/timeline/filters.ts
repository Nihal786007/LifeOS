import type { Activity } from "../shared/activity";

export function filterByPriority(
  activities: Activity[],
  priority: Activity["priority"]
) {
  return activities.filter(
    activity => activity.priority === priority
  );
}

export function filterByType(
  activities: Activity[],
  type: Activity["type"]
) {
  return activities.filter(
    activity => activity.type === type
  );
}