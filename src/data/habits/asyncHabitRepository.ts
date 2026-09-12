import type { HabitState } from "../../shared/habits";

export type HabitPersistencePhase =
  | "uninitialized"
  | "opening"
  | "migration"
  | "hydrated"
  | "error";

export type HabitRepositoryEvent =
  | { type: "habits"; state: HabitState }
  | { type: "error"; error: Error };

export interface AsyncHabitRepository {
  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<HabitState>;

  replace(state: HabitState): Promise<void>;

  subscribe(listener: (event: HabitRepositoryEvent) => void): () => void;
}
