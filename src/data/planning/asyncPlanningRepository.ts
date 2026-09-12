import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
} from "../../shared/types";

export interface PlanningRepositoryState {
  lifeGoals: LifeGoal[];
  monthlyOutcomes: MonthlyTarget[];
  weeklyFocuses: WeeklyTarget[];
}

export type PlanningPersistencePhase =
  | "uninitialized"
  | "opening"
  | "migration"
  | "hydrated"
  | "error";

export type PlanningRepositoryEvent =
  | {
      type: "planning";
      state: PlanningRepositoryState;
    }
  | {
      type: "error";
      error: Error;
    };

export interface AsyncPlanningRepository {
  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<PlanningRepositoryState>;

  replace(state: PlanningRepositoryState): Promise<void>;

  subscribe(
    listener: (event: PlanningRepositoryEvent) => void
  ): () => void;
}
