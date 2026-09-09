import type {
  HabitCompletion,
  HabitDefinition,
  HabitState,
  HabitWeekday,
} from "../../shared/habits";

import type {
  HabitRepository,
} from "./habitRepository";

export interface HabitStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface HabitStorageEventTarget {
  addEventListener(type: "storage", listener: EventListener): void;
  removeEventListener(type: "storage", listener: EventListener): void;
}

const HABIT_STATE_STORAGE_KEY = "lifeos-habit-state-v2";

const HABIT_WEEKDAYS: readonly HabitWeekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function emptyHabitState(): HabitState {
  return {
    habits: [],
    completions: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isHabitWeekday(value: unknown): value is HabitWeekday {
  return typeof value === "string" &&
    HABIT_WEEKDAYS.includes(value as HabitWeekday);
}

function isHabitDefinition(value: unknown): value is HabitDefinition {
  if (!isRecord(value)) return false;

  return (
    isFiniteNumber(value.id) &&
    typeof value.name === "string" &&
    isOptionalString(value.description) &&
    Array.isArray(value.activeDays) &&
    value.activeDays.every(isHabitWeekday) &&
    typeof value.startDate === "string" &&
    typeof value.archived === "boolean" &&
    isOptionalString(value.archivedAt) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isHabitCompletion(value: unknown): value is HabitCompletion {
  if (!isRecord(value)) return false;

  return (
    isFiniteNumber(value.id) &&
    isFiniteNumber(value.habitId) &&
    typeof value.date === "string" &&
    typeof value.completedAt === "string"
  );
}

function isHabitState(value: unknown): value is HabitState {
  if (!isRecord(value)) return false;

  return (
    Array.isArray(value.habits) &&
    value.habits.every(isHabitDefinition) &&
    Array.isArray(value.completions) &&
    value.completions.every(isHabitCompletion)
  );
}

export class LocalStorageHabitRepository implements HabitRepository {
  private readonly storage: HabitStorage;
  private readonly storageEvents?: HabitStorageEventTarget;

  constructor(
    storage: HabitStorage,
    storageEvents?: HabitStorageEventTarget
  ) {
    this.storage = storage;
    this.storageEvents = storageEvents;
  }

  load(): HabitState {
    const saved = this.storage.getItem(HABIT_STATE_STORAGE_KEY);
    if (!saved) return emptyHabitState();

    try {
      const parsed: unknown = JSON.parse(saved);
      return isHabitState(parsed) ? parsed : emptyHabitState();
    } catch {
      return emptyHabitState();
    }
  }

  save(state: HabitState): void {
    this.storage.setItem(HABIT_STATE_STORAGE_KEY, JSON.stringify(state));
  }

  subscribe(listener: () => void): () => void {
    if (!this.storageEvents) return () => undefined;

    const handleStorage: EventListener = (event) => {
      if ((event as StorageEvent).key === HABIT_STATE_STORAGE_KEY) listener();
    };

    this.storageEvents.addEventListener("storage", handleStorage);
    return () => {
      this.storageEvents?.removeEventListener("storage", handleStorage);
    };
  }
}
