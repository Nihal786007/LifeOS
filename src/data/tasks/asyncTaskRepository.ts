import type { Task } from "../../shared/types";

export type TaskPersistencePhase =
  | "uninitialized"
  | "opening"
  | "migration"
  | "hydrated"
  | "error";

export type TaskRepositoryEvent =
  | { type: "tasks"; tasks: Task[] }
  | { type: "error"; error: Error };

export interface AsyncTaskRepository {
  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<Task[]>;

  replace(tasks: Task[]): Promise<void>;

  subscribe(listener: (event: TaskRepositoryEvent) => void): () => void;
}
