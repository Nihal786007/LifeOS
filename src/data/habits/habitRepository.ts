import type {
  HabitState,
} from "../../shared/habits";

/**
 * Persistence boundary for canonical Habits 2.0 state.
 *
 * Habit business rules and all derived values remain owned by the existing
 * habit engines and execution architecture.
 */
export interface HabitRepository {
  load(): HabitState;
  save(state: HabitState): void;
  subscribe(listener: () => void): () => void;
}
