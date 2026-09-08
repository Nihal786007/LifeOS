import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
} from "../../shared/types";

export interface LifeGoalRepository {
  load(): LifeGoal[];
  save(lifeGoals: LifeGoal[]): void;
  subscribe(listener: () => void): () => void;
}

export interface MonthlyOutcomeRepository {
  load(): MonthlyTarget[];
  save(monthlyOutcomes: MonthlyTarget[]): void;
  subscribe(listener: () => void): () => void;
}

export interface WeeklyFocusRepository {
  load(): WeeklyTarget[];
  save(weeklyFocuses: WeeklyTarget[]): void;
  subscribe(listener: () => void): () => void;
}
