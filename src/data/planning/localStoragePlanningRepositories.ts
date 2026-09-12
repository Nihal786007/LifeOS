import {
  STORAGE_KEYS,
} from "../../constants/storage";

import type {
  LifeGoal,
  MonthlyTarget,
  WeeklyTarget,
} from "../../shared/types";

import type {
  LifeGoalRepository,
  MonthlyOutcomeRepository,
  WeeklyFocusRepository,
} from "./planningRepositories";

export interface PlanningStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PlanningStorageEventTarget {
  addEventListener(type: "storage", listener: EventListener): void;
  removeEventListener(type: "storage", listener: EventListener): void;
}

type CollectionGuard<T> = (value: unknown) => value is T[];

export type PlanningSourceSnapshot<T> =
  | { status: "missing"; records: [] }
  | { status: "valid"; records: T[] }
  | { status: "invalid"; records: [] };

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || (
    typeof value === "number" && Number.isFinite(value)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLifeGoal(value: unknown): value is LifeGoal {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    isFiniteNumber(candidate.id) &&
    typeof candidate.title === "string" &&
    isOptionalString(candidate.description) &&
    isFiniteNumber(candidate.progress) &&
    typeof candidate.completed === "boolean" &&
    isOptionalString(candidate.completedAt) &&
    typeof candidate.startDate === "string" &&
    isOptionalString(candidate.targetDate) &&
    typeof candidate.createdAt === "string"
  );
}

function isMonthlyTarget(value: unknown): value is MonthlyTarget {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    isFiniteNumber(candidate.id) &&
    typeof candidate.title === "string" &&
    isFiniteNumber(candidate.month) &&
    isFiniteNumber(candidate.year) &&
    isOptionalNumber(candidate.goalId) &&
    isFiniteNumber(candidate.progress) &&
    typeof candidate.completed === "boolean" &&
    isOptionalString(candidate.completedAt) &&
    typeof candidate.createdAt === "string"
  );
}

function isWeeklyTarget(value: unknown): value is WeeklyTarget {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    isFiniteNumber(candidate.id) &&
    typeof candidate.title === "string" &&
    isOptionalNumber(candidate.monthlyTargetId) &&
    isFiniteNumber(candidate.week) &&
    Number.isInteger(candidate.week) &&
    candidate.week >= 1 &&
    candidate.week <= 5 &&
    isOptionalString(candidate.weekStartDate) &&
    isOptionalString(candidate.weekEndDate) &&
    isFiniteNumber(candidate.progress) &&
    typeof candidate.completed === "boolean" &&
    isOptionalString(candidate.completedAt) &&
    typeof candidate.createdAt === "string"
  );
}

const isLifeGoalCollection: CollectionGuard<LifeGoal> = (
  value
): value is LifeGoal[] => Array.isArray(value) && value.every(isLifeGoal);

const isMonthlyTargetCollection: CollectionGuard<MonthlyTarget> = (
  value
): value is MonthlyTarget[] =>
  Array.isArray(value) && value.every(isMonthlyTarget);

const isWeeklyTargetCollection: CollectionGuard<WeeklyTarget> = (
  value
): value is WeeklyTarget[] =>
  Array.isArray(value) && value.every(isWeeklyTarget);

function inspectCollection<T>(
  storage: PlanningStorage,
  key: string,
  isCollection: CollectionGuard<T>
): PlanningSourceSnapshot<T> {
  const saved = storage.getItem(key);
  if (!saved) return { status: "missing", records: [] };

  try {
    const parsed: unknown = JSON.parse(saved);
    return isCollection(parsed)
      ? { status: "valid", records: parsed }
      : { status: "invalid", records: [] };
  } catch {
    return { status: "invalid", records: [] };
  }
}

function subscribeToKey(
  storageEvents: PlanningStorageEventTarget | undefined,
  key: string,
  listener: () => void
): () => void {
  if (!storageEvents) return () => undefined;

  const handleStorage: EventListener = (event) => {
    if ((event as StorageEvent).key === key) listener();
  };

  storageEvents.addEventListener("storage", handleStorage);
  return () => storageEvents.removeEventListener("storage", handleStorage);
}

export class LocalStorageLifeGoalRepository implements LifeGoalRepository {
  private readonly storage: PlanningStorage;
  private readonly storageEvents?: PlanningStorageEventTarget;

  constructor(
    storage: PlanningStorage,
    storageEvents?: PlanningStorageEventTarget
  ) {
    this.storage = storage;
    this.storageEvents = storageEvents;
  }

  load(): LifeGoal[] {
    return this.inspect().records;
  }

  inspect(): PlanningSourceSnapshot<LifeGoal> {
    return inspectCollection(
      this.storage,
      STORAGE_KEYS.LIFE_GOALS,
      isLifeGoalCollection
    );
  }

  save(lifeGoals: LifeGoal[]): void {
    this.storage.setItem(STORAGE_KEYS.LIFE_GOALS, JSON.stringify(lifeGoals));
  }

  subscribe(listener: () => void): () => void {
    return subscribeToKey(
      this.storageEvents,
      STORAGE_KEYS.LIFE_GOALS,
      listener
    );
  }
}

export class LocalStorageMonthlyOutcomeRepository
implements MonthlyOutcomeRepository {
  private readonly storage: PlanningStorage;
  private readonly storageEvents?: PlanningStorageEventTarget;

  constructor(
    storage: PlanningStorage,
    storageEvents?: PlanningStorageEventTarget
  ) {
    this.storage = storage;
    this.storageEvents = storageEvents;
  }

  load(): MonthlyTarget[] {
    return this.inspect().records;
  }

  inspect(): PlanningSourceSnapshot<MonthlyTarget> {
    return inspectCollection(
      this.storage,
      STORAGE_KEYS.MONTHLY_TARGETS,
      isMonthlyTargetCollection
    );
  }

  save(monthlyOutcomes: MonthlyTarget[]): void {
    this.storage.setItem(
      STORAGE_KEYS.MONTHLY_TARGETS,
      JSON.stringify(monthlyOutcomes)
    );
  }

  subscribe(listener: () => void): () => void {
    return subscribeToKey(
      this.storageEvents,
      STORAGE_KEYS.MONTHLY_TARGETS,
      listener
    );
  }
}

export class LocalStorageWeeklyFocusRepository implements WeeklyFocusRepository {
  private readonly storage: PlanningStorage;
  private readonly storageEvents?: PlanningStorageEventTarget;

  constructor(
    storage: PlanningStorage,
    storageEvents?: PlanningStorageEventTarget
  ) {
    this.storage = storage;
    this.storageEvents = storageEvents;
  }

  load(): WeeklyTarget[] {
    return this.inspect().records;
  }

  inspect(): PlanningSourceSnapshot<WeeklyTarget> {
    return inspectCollection(
      this.storage,
      STORAGE_KEYS.WEEKLY_TARGETS,
      isWeeklyTargetCollection
    );
  }

  save(weeklyFocuses: WeeklyTarget[]): void {
    this.storage.setItem(
      STORAGE_KEYS.WEEKLY_TARGETS,
      JSON.stringify(weeklyFocuses)
    );
  }

  subscribe(listener: () => void): () => void {
    return subscribeToKey(
      this.storageEvents,
      STORAGE_KEYS.WEEKLY_TARGETS,
      listener
    );
  }
}
