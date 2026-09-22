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

  /** Reads the current durable collection after pending repository writes. */
  readCurrent(): Promise<Task[]>;

  /** Resolves when locally queued writes have settled (and synced writes uploaded). */
  waitForPersistence(): Promise<void>;

  replace(tasks: Task[]): Promise<void>;

  subscribe(listener: (event: TaskRepositoryEvent) => void): () => void;
}
