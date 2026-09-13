import {
  STORAGE_KEYS,
} from "../../constants/storage";

import type {
  ExecutionRecord,
  ExecutionType,
} from "../../shared/execution";

import type {
  ExecutionHistoryRepository,
} from "./executionHistoryRepository";

export interface ExecutionHistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ExecutionHistoryEventTarget {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  dispatchEvent(event: Event): boolean;
}

const HISTORY_CHANGED_EVENT = "lifeos:execution-history-changed";

export type ExecutionHistorySourceSnapshot =
  | { status: "missing"; records: ExecutionRecord[] }
  | { status: "valid"; records: ExecutionRecord[] }
  | { status: "invalid"; records: ExecutionRecord[] };

const EXECUTION_TYPES = new Set<ExecutionType>([
  "task_completed", "task_uncompleted", "task_deleted",
  "weekly_completed", "weekly_uncompleted", "weekly_deleted",
  "monthly_completed", "monthly_uncompleted", "monthly_deleted",
  "life_goal_completed", "life_goal_uncompleted", "life_goal_deleted",
  "habit_completed", "habit_uncompleted", "xp_earned",
  "achievement_unlocked", "system",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isExecutionRecord(value: unknown): value is ExecutionRecord {
  if (!isRecord(value)) return false;
  return (
    Number.isSafeInteger(value.id) && Number(value.id) >= 0 &&
    typeof value.type === "string" &&
    EXECUTION_TYPES.has(value.type as ExecutionType) &&
    Number.isSafeInteger(value.entityId) && Number(value.entityId) >= 0 &&
    typeof value.title === "string" &&
    isOptionalString(value.description) &&
    typeof value.createdAt === "string" &&
    typeof value.xpAwarded === "number" && Number.isFinite(value.xpAwarded) &&
    isOptionalString(value.icon) &&
    isOptionalString(value.color) &&
    (value.metadata === undefined || isRecord(value.metadata))
  );
}

export class LocalStorageExecutionHistoryRepository
implements ExecutionHistoryRepository {
  private readonly storage: ExecutionHistoryStorage;
  private readonly events?: ExecutionHistoryEventTarget;

  constructor(
    storage: ExecutionHistoryStorage,
    events?: ExecutionHistoryEventTarget
  ) {
    this.storage = storage;
    this.events = events;
  }

  load(): ExecutionRecord[] {
    const saved = this.storage.getItem(STORAGE_KEYS.EXECUTION_HISTORY);
    if (!saved) return [];

    try {
      const parsed: unknown = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed as ExecutionRecord[] : [];
    } catch {
      return [];
    }
  }

  inspect(): ExecutionHistorySourceSnapshot {
    const saved = this.storage.getItem(STORAGE_KEYS.EXECUTION_HISTORY);
    if (!saved) return { status: "missing", records: [] };

    try {
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.every(isExecutionRecord)) {
        return { status: "invalid", records: [] };
      }
      return { status: "valid", records: parsed };
    } catch {
      return { status: "invalid", records: [] };
    }
  }

  save(records: ExecutionRecord[]): void {
    this.storage.setItem(
      STORAGE_KEYS.EXECUTION_HISTORY,
      JSON.stringify(records)
    );
    this.notifyHistoryChanged();
  }

  append(records: ExecutionRecord[]): ExecutionRecord[] {
    if (records.length === 0) return this.load();

    const updatedHistory = [
      ...records,
      ...this.load(),
    ];
    this.save(updatedHistory);
    return updatedHistory;
  }

  remove(id: number): ExecutionRecord[] {
    const history = this.load();
    const updatedHistory = history.filter((record) => record.id !== id);

    if (updatedHistory.length === history.length) return history;

    this.save(updatedHistory);
    return updatedHistory;
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEYS.EXECUTION_HISTORY);
    this.notifyHistoryChanged();
  }

  subscribe(listener: () => void): () => void {
    if (!this.events) return () => undefined;

    this.events.addEventListener(HISTORY_CHANGED_EVENT, listener);
    return () => {
      this.events?.removeEventListener(HISTORY_CHANGED_EVENT, listener);
    };
  }

  private notifyHistoryChanged(): void {
    this.events?.dispatchEvent(new Event(HISTORY_CHANGED_EVENT));
  }
}
