import type { PowerSyncDatabase, Transaction } from "@powersync/web";

import type { HabitState } from "../../shared/habits";
import type {
  AsyncHabitRepository,
  HabitRepositoryEvent,
} from "./asyncHabitRepository";
import {
  HABIT_COMPLETION_QUERY,
  HABIT_DEFINITION_QUERY,
  habitCompletionRowToCompletion,
  habitCompletionToDatabaseRow,
  habitDefinitionRowToHabit,
  habitDefinitionToDatabaseRow,
  habitRowsMatch,
  inspectHabitRelationships,
  migrateLocalStorageHabits,
} from "./migrateLocalStorageHabits";
import type {
  HabitCompletionDatabaseRow,
  HabitDefinitionDatabaseRow,
  HabitMigrationSource,
  HabitRelationshipReport,
} from "./migrateLocalStorageHabits";

interface IdRow { id: string }

const INSERT_DEFINITION =
  "INSERT INTO habit_definitions(id, name, description, active_days_json, start_date, archived, archived_at, created_at, updated_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
const UPDATE_DEFINITION =
  "UPDATE habit_definitions SET name = ?, description = ?, active_days_json = ?, start_date = ?, archived = ?, archived_at = ?, created_at = ?, updated_at = ?, sort_order = ?, extras_json = ? WHERE id = ?";
const INSERT_COMPLETION =
  "INSERT INTO habit_completions(id, habit_id, date, completed_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?)";
const UPDATE_COMPLETION =
  "UPDATE habit_completions SET habit_id = ?, date = ?, completed_at = ?, sort_order = ?, extras_json = ? WHERE id = ?";

const HABIT_WATCH_QUERY = `
  SELECT 'definition' AS kind, id FROM habit_definitions
  UNION ALL
  SELECT 'completion' AS kind, id FROM habit_completions
  ORDER BY kind ASC, id ASC
`;

async function loadState(
  database: Pick<PowerSyncDatabase, "readTransaction">
): Promise<HabitState> {
  return database.readTransaction(async (transaction) => {
    const definitions = await transaction.getAll<HabitDefinitionDatabaseRow>(
      HABIT_DEFINITION_QUERY
    );
    const completions = await transaction.getAll<HabitCompletionDatabaseRow>(
      HABIT_COMPLETION_QUERY
    );
    const state = {
      habits: definitions.map(habitDefinitionRowToHabit),
      completions: completions.map(habitCompletionRowToCompletion),
    };
    validateRuntimeState(state);
    return state;
  });
}

function validateRuntimeState(state: HabitState): void {
  const definitionIds = state.habits.map((habit) => habit.id);
  if (new Set(definitionIds).size !== definitionIds.length) {
    throw new Error("Habit collection contains duplicate definition IDs");
  }
  const completionIds = state.completions.map((completion) => completion.id);
  if (new Set(completionIds).size !== completionIds.length) {
    throw new Error("Habit collection contains duplicate completion IDs");
  }
  const days = state.completions.map((completion) =>
    `${completion.habitId}\u0000${completion.date}`
  );
  if (new Set(days).size !== days.length) {
    throw new Error("Habit collection contains duplicate habit/date completions");
  }
}

async function existingIds(
  transaction: Transaction,
  table: "habit_definitions" | "habit_completions"
): Promise<Set<string>> {
  const rows = await transaction.getAll<IdRow>(`SELECT id FROM ${table}`);
  return new Set(rows.map((row) => row.id));
}

async function replaceRows(
  transaction: Transaction,
  state: HabitState
): Promise<HabitRelationshipReport> {
  validateRuntimeState(state);
  const definitions = state.habits.map(habitDefinitionToDatabaseRow);
  const completions = state.completions.map(habitCompletionToDatabaseRow);
  const existingDefinitions = await existingIds(transaction, "habit_definitions");
  const existingCompletions = await existingIds(transaction, "habit_completions");

  for (const row of definitions) {
    const values = [row.name, row.description, row.active_days_json,
      row.start_date, row.archived, row.archived_at, row.created_at,
      row.updated_at, row.sort_order, row.extras_json];
    await transaction.execute(
      existingDefinitions.has(row.id) ? UPDATE_DEFINITION : INSERT_DEFINITION,
      existingDefinitions.has(row.id) ? [...values, row.id] : [row.id, ...values]
    );
  }
  for (const row of completions) {
    const values = [row.habit_id, row.date, row.completed_at,
      row.sort_order, row.extras_json];
    await transaction.execute(
      existingCompletions.has(row.id) ? UPDATE_COMPLETION : INSERT_COMPLETION,
      existingCompletions.has(row.id) ? [...values, row.id] : [row.id, ...values]
    );
  }

  const expectedCompletionIds = new Set(completions.map((row) => row.id));
  for (const id of existingCompletions) {
    if (!expectedCompletionIds.has(id)) {
      await transaction.execute("DELETE FROM habit_completions WHERE id = ?", [id]);
    }
  }
  const expectedDefinitionIds = new Set(definitions.map((row) => row.id));
  for (const id of existingDefinitions) {
    if (!expectedDefinitionIds.has(id)) {
      await transaction.execute("DELETE FROM habit_definitions WHERE id = ?", [id]);
    }
  }

  const persistedDefinitions = await transaction.getAll<HabitDefinitionDatabaseRow>(
    HABIT_DEFINITION_QUERY
  );
  const persistedCompletions = await transaction.getAll<HabitCompletionDatabaseRow>(
    HABIT_COMPLETION_QUERY
  );
  if (
    !habitRowsMatch(persistedDefinitions, definitions) ||
    !habitRowsMatch(persistedCompletions, completions)
  ) {
    throw new Error("Habit replacement verification failed");
  }
  return inspectHabitRelationships(state);
}

export class PowerSyncHabitRepository implements AsyncHabitRepository {
  private initialization?: Promise<HabitState>;
  private mutationQueue: Promise<void> = Promise.resolve();
  private relationshipReport?: HabitRelationshipReport;
  private readonly database: PowerSyncDatabase;
  private readonly migrationSource: HabitMigrationSource;

  constructor(
    database: PowerSyncDatabase,
    migrationSource: HabitMigrationSource
  ) {
    this.database = database;
    this.migrationSource = migrationSource;
  }

  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<HabitState> {
    if (!this.initialization) {
      this.initialization = this.initializeOnce(onPhase);
    }
    return this.initialization;
  }

  private async initializeOnce(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<HabitState> {
    onPhase?.("opening");
    await this.database.init();
    onPhase?.("migration");
    const migration = await migrateLocalStorageHabits(
      this.database,
      this.migrationSource
    );
    if (migration.status === "invalid-source") {
      throw new Error("Existing Habit data is invalid and was not migrated");
    }
    const state = await loadState(this.database);
    this.relationshipReport = inspectHabitRelationships(state);
    return state;
  }

  async replace(state: HabitState): Promise<void> {
    await this.initialize();
    const snapshot = structuredClone(state);
    const operation = this.mutationQueue.then(async () => {
      this.relationshipReport = await this.database.writeTransaction(
        (transaction) => replaceRows(transaction, snapshot)
      );
    });
    this.mutationQueue = operation.catch(() => undefined);
    return operation;
  }

  subscribe(listener: (event: HabitRepositoryEvent) => void): () => void {
    const abortController = new AbortController();
    void this.watch(listener, abortController.signal);
    return () => abortController.abort();
  }

  getLastRelationshipReport(): HabitRelationshipReport | undefined {
    return this.relationshipReport
      ? structuredClone(this.relationshipReport)
      : undefined;
  }

  private async watch(
    listener: (event: HabitRepositoryEvent) => void,
    signal: AbortSignal
  ): Promise<void> {
    try {
      await this.initialize();
      for await (const result of this.database.watch(
        HABIT_WATCH_QUERY,
        [],
        { signal }
      )) {
        void result;
        if (signal.aborted) return;
        const state = await loadState(this.database);
        if (signal.aborted) return;
        listener({ type: "habits", state });
      }
    } catch (error) {
      if (signal.aborted) return;
      listener({
        type: "error",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}

export { databaseIdToHabitId, habitIdToDatabaseId } from "./migrateLocalStorageHabits";
