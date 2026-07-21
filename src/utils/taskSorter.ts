import type { Task } from "../shared/types";

function getPriorityValue(priority: Task["priority"]) {
  switch (priority) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

export function sortTasks(tasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...tasks].sort((a, b) => {
    // Completed tasks always last
    if (a.completed !== b.completed) {
      return Number(a.completed) - Number(b.completed);
    }

    const aDue = a.dueDate ? new Date(a.dueDate) : null;
    const bDue = b.dueDate ? new Date(b.dueDate) : null;

    if (aDue) aDue.setHours(0, 0, 0, 0);
    if (bDue) bDue.setHours(0, 0, 0, 0);

    // Tasks with due dates come before tasks without due dates
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;

    // Earlier due dates first
    if (aDue && bDue) {
      const dueDifference = aDue.getTime() - bDue.getTime();
      if (dueDifference !== 0) {
        return dueDifference;
      }
    }

    // Same due date → higher priority first
    const priorityDifference =
      getPriorityValue(b.priority) - getPriorityValue(a.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    // Finally, older tasks first
    return (
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
    );
  });
}