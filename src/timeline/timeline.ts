import type { Activity } from "../shared/activity";

export class Timeline {
  private readonly activities: Activity[];

  constructor(activities: Activity[]) {
    this.activities = activities;
  }

  getAll(): Activity[] {
    return this.activities;
  }

 getByDate(date: Date): Activity[] {
  return this.activities.filter(
    (activity) =>
      activity.start.toDateString() === date.toDateString()
  );
}

  getCompleted(): Activity[] {
    return this.activities.filter(
      (activity) => activity.status === "completed"
    );
  }

  getPending(): Activity[] {
    return this.activities.filter(
      (activity) => activity.status !== "completed"
    );
  }

  getByCategory(category: string): Activity[] {
    return this.activities.filter(
      (activity) => activity.category === category
    );
  }
}