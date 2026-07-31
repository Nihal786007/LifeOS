import type { Activity } from "../shared/activity";

export class Timeline {
  private readonly activities: Activity[];

  constructor(activities: Activity[]) {
    this.activities = activities;
  }

  getAll(): Activity[] {
    return this.activities;
  }

  getByDate(date: string): Activity[] {
    return this.activities.filter((activity) =>
      activity.start.startsWith(date)
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