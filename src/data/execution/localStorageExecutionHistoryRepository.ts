import {
  STORAGE_KEYS,
} from "../../constants/storage";

import type {
  ExecutionRecord,
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
