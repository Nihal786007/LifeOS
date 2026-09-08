import type {
  Task,
} from "../../shared/types";

/**
 * Persistence boundary for the canonical task collection.
 *
 * Task business rules remain owned by the existing contexts and engines.
 */
export interface TaskRepository {
  load(): Task[];
  save(tasks: Task[]): void;
  subscribe(listener: () => void): () => void;
}
