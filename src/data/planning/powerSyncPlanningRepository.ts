import type {
  PowerSyncDatabase,
  Transaction,
} from "@powersync/web";

import type {
  AsyncPlanningRepository,
  PlanningRepositoryEvent,
  PlanningRepositoryState,
} from "./asyncPlanningRepository";
import {
  inspectPlanningRelationships,
  LIFE_GOAL_QUERY,
  lifeGoalRowToLifeGoal,
  lifeGoalToDatabaseRow,
  migrateLocalStoragePlanning,
  MONTHLY_OUTCOME_QUERY,
  monthlyOutcomeRowToMonthlyOutcome,
  monthlyOutcomeToDatabaseRow,
  WEEKLY_FOCUS_QUERY,
  weeklyFocusRowToWeeklyFocus,
  weeklyFocusToDatabaseRow,
} from "./migrateLocalStoragePlanning";
import type {
  LifeGoalDatabaseRow,
  MonthlyOutcomeDatabaseRow,
  PlanningMigrationSources,
  PlanningQueryable,
  PlanningRelationshipReport,
  WeeklyFocusDatabaseRow,
} from "./migrateLocalStoragePlanning";

interface IdRow { id: string }

const INSERT_LIFE_GOAL =
  "INSERT INTO life_goals(id, title, description, progress, completed, completed_at, start_date, target_date, created_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
const UPDATE_LIFE_GOAL =
  "UPDATE life_goals SET title = ?, description = ?, progress = ?, completed = ?, completed_at = ?, start_date = ?, target_date = ?, created_at = ?, sort_order = ?, extras_json = ? WHERE id = ?";
const INSERT_MONTHLY_OUTCOME =
  "INSERT INTO monthly_outcomes(id, title, month, year, goal_id, progress, completed, completed_at, created_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
const UPDATE_MONTHLY_OUTCOME =
  "UPDATE monthly_outcomes SET title = ?, month = ?, year = ?, goal_id = ?, progress = ?, completed = ?, completed_at = ?, created_at = ?, sort_order = ?, extras_json = ? WHERE id = ?";
const INSERT_WEEKLY_FOCUS =
  "INSERT INTO weekly_focuses(id, title, monthly_target_id, week, week_start_date, week_end_date, progress, completed, completed_at, created_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
const UPDATE_WEEKLY_FOCUS =
  "UPDATE weekly_focuses SET title = ?, monthly_target_id = ?, week = ?, week_start_date = ?, week_end_date = ?, progress = ?, completed = ?, completed_at = ?, created_at = ?, sort_order = ?, extras_json = ? WHERE id = ?";

const PLANNING_WATCH_QUERY = `
  SELECT 'life_goal' AS kind, id FROM life_goals
  UNION ALL
  SELECT 'monthly_outcome' AS kind, id FROM monthly_outcomes
  UNION ALL
  SELECT 'weekly_focus' AS kind, id FROM weekly_focuses
  ORDER BY kind ASC, id ASC
`;

function rowsMatch(actual: unknown[], expected: unknown[]): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

async function loadPlanningState(
  database: PlanningQueryable
): Promise<PlanningRepositoryState> {
  const lifeGoalRows = await database.getAll<LifeGoalDatabaseRow>(
    LIFE_GOAL_QUERY
  );
  const monthlyRows = await database.getAll<MonthlyOutcomeDatabaseRow>(
    MONTHLY_OUTCOME_QUERY
  );
  const weeklyRows = await database.getAll<WeeklyFocusDatabaseRow>(
    WEEKLY_FOCUS_QUERY
  );
  return {
    lifeGoals: lifeGoalRows.map(lifeGoalRowToLifeGoal),
    monthlyOutcomes: monthlyRows.map(monthlyOutcomeRowToMonthlyOutcome),
    weeklyFocuses: weeklyRows.map(weeklyFocusRowToWeeklyFocus),
  };
}

async function existingIds(
  transaction: Transaction,
  table: "life_goals" | "monthly_outcomes" | "weekly_focuses"
): Promise<Set<string>> {
  const rows = await transaction.getAll<IdRow>(`SELECT id FROM ${table}`);
  return new Set(rows.map((row) => row.id));
}

async function replaceLifeGoals(
  transaction: Transaction,
  rows: LifeGoalDatabaseRow[]
): Promise<void> {
  const expectedIds = new Set(rows.map((row) => row.id));
  if (expectedIds.size !== rows.length) {
    throw new Error("Life Goal collection contains duplicate IDs");
  }
  const existing = await existingIds(transaction, "life_goals");
  for (const row of rows) {
    const values = [row.title, row.description, row.progress, row.completed,
      row.completed_at, row.start_date, row.target_date, row.created_at,
      row.sort_order, row.extras_json];
    await transaction.execute(
      existing.has(row.id) ? UPDATE_LIFE_GOAL : INSERT_LIFE_GOAL,
      existing.has(row.id) ? [...values, row.id] : [row.id, ...values]
    );
  }
  for (const id of existing) {
    if (!expectedIds.has(id)) {
      await transaction.execute("DELETE FROM life_goals WHERE id = ?", [id]);
    }
  }
}

async function replaceMonthlyOutcomes(
  transaction: Transaction,
  rows: MonthlyOutcomeDatabaseRow[]
): Promise<void> {
  const expectedIds = new Set(rows.map((row) => row.id));
  if (expectedIds.size !== rows.length) {
    throw new Error("Monthly Outcome collection contains duplicate IDs");
  }
  const existing = await existingIds(transaction, "monthly_outcomes");
  for (const row of rows) {
    const values = [row.title, row.month, row.year, row.goal_id, row.progress,
      row.completed, row.completed_at, row.created_at, row.sort_order,
      row.extras_json];
    await transaction.execute(
      existing.has(row.id) ? UPDATE_MONTHLY_OUTCOME : INSERT_MONTHLY_OUTCOME,
      existing.has(row.id) ? [...values, row.id] : [row.id, ...values]
    );
  }
  for (const id of existing) {
    if (!expectedIds.has(id)) {
      await transaction.execute("DELETE FROM monthly_outcomes WHERE id = ?", [id]);
    }
  }
}

async function replaceWeeklyFocuses(
  transaction: Transaction,
  rows: WeeklyFocusDatabaseRow[]
): Promise<void> {
  const expectedIds = new Set(rows.map((row) => row.id));
  if (expectedIds.size !== rows.length) {
    throw new Error("Weekly Focus collection contains duplicate IDs");
  }
  const existing = await existingIds(transaction, "weekly_focuses");
  for (const row of rows) {
    const values = [row.title, row.monthly_target_id, row.week,
      row.week_start_date, row.week_end_date, row.progress, row.completed,
      row.completed_at, row.created_at, row.sort_order, row.extras_json];
    await transaction.execute(
      existing.has(row.id) ? UPDATE_WEEKLY_FOCUS : INSERT_WEEKLY_FOCUS,
      existing.has(row.id) ? [...values, row.id] : [row.id, ...values]
    );
  }
  for (const id of existing) {
    if (!expectedIds.has(id)) {
      await transaction.execute("DELETE FROM weekly_focuses WHERE id = ?", [id]);
    }
  }
}

async function replacePlanningRows(
  transaction: Transaction,
  state: PlanningRepositoryState
): Promise<PlanningRelationshipReport> {
  const lifeGoalRows = state.lifeGoals.map(lifeGoalToDatabaseRow);
  const monthlyRows = state.monthlyOutcomes.map(monthlyOutcomeToDatabaseRow);
  const weeklyRows = state.weeklyFocuses.map(weeklyFocusToDatabaseRow);

  await replaceLifeGoals(transaction, lifeGoalRows);
  await replaceMonthlyOutcomes(transaction, monthlyRows);
  await replaceWeeklyFocuses(transaction, weeklyRows);

  const persistedLifeGoals = await transaction.getAll<LifeGoalDatabaseRow>(
    LIFE_GOAL_QUERY
  );
  const persistedMonthly = await transaction.getAll<MonthlyOutcomeDatabaseRow>(
    MONTHLY_OUTCOME_QUERY
  );
  const persistedWeekly = await transaction.getAll<WeeklyFocusDatabaseRow>(
    WEEKLY_FOCUS_QUERY
  );
  if (
    !rowsMatch(persistedLifeGoals, lifeGoalRows) ||
    !rowsMatch(persistedMonthly, monthlyRows) ||
    !rowsMatch(persistedWeekly, weeklyRows)
  ) {
    throw new Error("Planning replacement verification failed");
  }
  return inspectPlanningRelationships(transaction);
}

export class PowerSyncPlanningRepository implements AsyncPlanningRepository {
  private initialization?: Promise<PlanningRepositoryState>;
  private mutationQueue: Promise<void> = Promise.resolve();
  private relationshipReport?: PlanningRelationshipReport;
  private readonly database: PowerSyncDatabase;
  private readonly migrationSources: PlanningMigrationSources;

  constructor(
    database: PowerSyncDatabase,
    migrationSources: PlanningMigrationSources
  ) {
    this.database = database;
    this.migrationSources = migrationSources;
  }

  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<PlanningRepositoryState> {
    if (!this.initialization) {
      this.initialization = this.initializeOnce(onPhase);
    }
    return this.initialization;
  }

  private async initializeOnce(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<PlanningRepositoryState> {
    onPhase?.("opening");
    await this.database.init();
    onPhase?.("migration");
    const migration = await migrateLocalStoragePlanning(
      this.database,
      this.migrationSources
    );
    if (migration.status === "invalid-source") {
      throw new Error("Existing planning data is invalid and was not migrated");
    }
    this.relationshipReport = await inspectPlanningRelationships(this.database);
    return this.load();
  }

  private async load(): Promise<PlanningRepositoryState> {
    return this.database.readTransaction((transaction) =>
      loadPlanningState(transaction)
    );
  }

  async replace(state: PlanningRepositoryState): Promise<void> {
    await this.initialize();
    const snapshot = structuredClone(state);
    const operation = this.mutationQueue.then(async () => {
      this.relationshipReport = await this.database.writeTransaction(
        (transaction) => replacePlanningRows(transaction, snapshot)
      );
    });
    this.mutationQueue = operation.catch(() => undefined);
    return operation;
  }

  subscribe(listener: (event: PlanningRepositoryEvent) => void): () => void {
    const abortController = new AbortController();
    void this.watch(listener, abortController.signal);
    return () => abortController.abort();
  }

  getLastRelationshipReport(): PlanningRelationshipReport | undefined {
    return this.relationshipReport
      ? structuredClone(this.relationshipReport)
      : undefined;
  }

  private async watch(
    listener: (event: PlanningRepositoryEvent) => void,
    signal: AbortSignal
  ): Promise<void> {
    try {
      await this.initialize();
      for await (const result of this.database.watch(
        PLANNING_WATCH_QUERY,
        [],
        { signal }
      )) {
        void result;
        if (signal.aborted) return;
        const state = await this.load();
        if (signal.aborted) return;
        listener({ type: "planning", state });
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

export {
  databaseIdToPlanningId,
  planningIdToDatabaseId,
} from "./migrateLocalStoragePlanning";
