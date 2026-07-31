import type { Activity } from "../shared/activity";

const demoActivities: Activity[] = [
  {
    id: "1",
    title: "APEX V1 Ultimate",
    description: "Continue chassis development",
    type: "robotics",
    category: "Projects",
    start: new Date(2026, 6, 31, 9, 0),
    end: new Date(2026, 6, 31, 11, 0),
    status: "completed",
    priority: "high",
    xpReward: 250,
    estimatedMinutes: 120,
    completedAt: new Date(2026, 6, 31, 11, 0),
    notes: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    title: "LifeOS Development",
    description: "Mission 1.3",
    type: "task",
    category: "Development",
    start: new Date(2026, 6, 31, 14, 0),
    end: new Date(2026, 6, 31, 16, 0),
    status: "in_progress",
    priority: "high",
    xpReward: 180,
    estimatedMinutes: 120,
    completedAt: null,
    notes: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function getActivitiesForDate(date: Date): Activity[] {
  return demoActivities.filter(
    (activity) =>
      activity.start.toDateString() === date.toDateString()
  );
}