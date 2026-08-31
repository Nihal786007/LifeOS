// ==========================================
// LifeOS ATLAS State Understanding Types
// ==========================================
//
// These values describe facts in the canonical
// state. They intentionally contain no priority,
// risk, or recommendation decisions.
// ==========================================

export interface AtlasTaskFacts {
  total: number;
  active: number;
  completed: number;
  completedToday: number;
  overdue: number;
  dueToday: number;
  undated: number;
  highPriorityActive: number;
}

export interface AtlasPlanningFacts {
  activeGoals: number;
  completedGoals: number;
  overdueGoals: number;
  activeMonthlyTargets: number;
  activeWeeklyTargets: number;
  unlinkedMonthlyTargets: number;
  unlinkedWeeklyTargets: number;
  unlinkedTasks: number;
}

export interface AtlasHabitFacts {
  total: number;
  active: number;
  scheduledToday: number;
  completedToday: number;
  activeStreaks: number;
}

export interface AtlasExecutionFacts {
  totalEvents: number;
  eventsToday: number;
  totalXP: number;
  xpToday: number;
}

export interface AtlasStateUnderstanding {
  date: string;
  tasks: AtlasTaskFacts;
  planning: AtlasPlanningFacts;
  habits: AtlasHabitFacts;
  execution: AtlasExecutionFacts;
}
