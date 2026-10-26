import type { AsyncTaskRepository } from '../src/data/tasks/asyncTaskRepository';
import type { Task } from '../src/shared/types';
import type { AtlasCanonicalState } from '../src/atlas/state/types';
import type { AsyncPlanningRepository, PlanningRepositoryState, PlanningRepositoryEvent } from '../src/data/planning/asyncPlanningRepository';
import type { TaskRepositoryEvent } from '../src/data/tasks/asyncTaskRepository';
import type { AsyncExecutionHistoryRepository, ExecutionHistoryRepositoryEvent } from '../src/data/execution/asyncExecutionHistoryRepository';
import type { AsyncHabitRepository } from '../src/data/habits/asyncHabitRepository';
import type { ExecutionRecord } from '../src/shared/execution';

// Implements the existing port. No writer is installed in this read-only proof.
export function createReadOnlyDemoTaskRepository(seed: readonly Task[]): AsyncTaskRepository {
  const rows = structuredClone([...seed]);
  return {
    initialize: async () => structuredClone(rows),
    readCurrent: async () => structuredClone(rows),
    subscribe: () => () => undefined,
    replace: async () => { throw new Error('Task mutations are unavailable in this read-only demonstration.'); },
    waitForPersistence: async () => { throw new Error('This demonstration has no persistent repository.'); },
  };
}

// Storage ports only: domain decisions remain in the production providers/engines.
// Every read/event is cloned. No localStorage, IndexedDB, network or disk exists here.
function memoryCell<T, E>(seed: T, event: (value: T) => E) {
  let value = structuredClone(seed);
  const listeners = new Set<(event: E) => void>();
  const read = () => structuredClone(value);
  return {
    read,
    write(next: T) {
      value = structuredClone(next);
      queueMicrotask(() => { for (const listener of listeners) listener(event(read())); });
    },
    subscribe(listener: (event: E) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

export function createDemoRepositories(seed: AtlasCanonicalState) {
  const tasks = memoryCell<Task[], TaskRepositoryEvent>([...seed.tasks], value => ({ type: 'tasks', tasks: value }));
  const planning = memoryCell<PlanningRepositoryState, PlanningRepositoryEvent>({ lifeGoals: [...seed.lifeGoals], monthlyOutcomes: [...seed.monthlyTargets], weeklyFocuses: [...seed.weeklyTargets] }, value => ({ type: 'planning', state: value }));
  const history = memoryCell<ExecutionRecord[], ExecutionHistoryRepositoryEvent>([...seed.executionHistory], value => ({ type: 'history', records: value }));
  const taskRepository: AsyncTaskRepository = {
    initialize: async () => tasks.read(), readCurrent: async () => tasks.read(),
    replace: async rows => { tasks.write(rows); }, subscribe: tasks.subscribe,
    waitForPersistence: async () => { throw new Error('Demo storage is memory only; durable persistence is unavailable.'); },
  };
  const planningRepository: AsyncPlanningRepository = {
    initialize: async () => planning.read(), replace: async state => { planning.write(state); }, subscribe: planning.subscribe,
  };
  const executionHistoryRepository: AsyncExecutionHistoryRepository = {
    initialize: async () => history.read(), readCurrent: async () => history.read(),
    replace: async rows => { history.write(rows); return history.read(); },
    append: async rows => { history.write([...rows, ...history.read()]); return history.read(); },
    remove: async id => { history.write(history.read().filter(row => row.id !== id)); return history.read(); },
    clear: async () => { history.write([]); }, subscribe: history.subscribe,
    waitForPersistence: async () => { throw new Error('Demo history is memory only; cloud/durable persistence is unavailable.'); },
  };
  const habitRepository: AsyncHabitRepository = {
    initialize: async () => ({ habits: structuredClone([...seed.habitDefinitions]), completions: structuredClone([...seed.habitCompletions]) }),
    replace: async () => { throw new Error('Habit mutation is outside this checkpoint.'); }, subscribe: () => () => undefined,
  };
  return { taskRepository, planningRepository, executionHistoryRepository, habitRepository };
}
export type DemoRepositories = ReturnType<typeof createDemoRepositories>;
