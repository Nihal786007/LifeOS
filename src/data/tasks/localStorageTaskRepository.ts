import {
  STORAGE_KEYS,
} from "../../constants/storage";

import type {
  Task,
  TaskPriority,
} from "../../shared/types";

import type {
  TaskRepository,
} from "./taskRepository";

export interface TaskStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface TaskStorageEventTarget {
  addEventListener(type: "storage", listener: EventListener): void;
  removeEventListener(type: "storage", listener: EventListener): void;
}

const TASK_PRIORITIES: readonly TaskPriority[] = [
  "low",
  "medium",
  "high",
];

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === "number";
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "number" &&
    Number.isFinite(candidate.id) &&
    typeof candidate.title === "string" &&
    isOptionalString(candidate.description) &&
    isOptionalString(candidate.dueDate) &&
    typeof candidate.priority === "string" &&
    TASK_PRIORITIES.includes(candidate.priority as TaskPriority) &&
    isOptionalNumber(candidate.weeklyTargetId) &&
    typeof candidate.completed === "boolean" &&
    isOptionalString(candidate.completedAt) &&
    typeof candidate.createdAt === "string"
  );
}

function isTaskCollection(value: unknown): value is Task[] {
  return Array.isArray(value) && value.every(isTask);
}

export class LocalStorageTaskRepository implements TaskRepository {
  private readonly storage: TaskStorage;
  private readonly storageEvents?: TaskStorageEventTarget;

  constructor(
    storage: TaskStorage,
    storageEvents?: TaskStorageEventTarget
  ) {
    this.storage = storage;
    this.storageEvents = storageEvents;
  }

  load(): Task[] {
    const saved = this.storage.getItem(STORAGE_KEYS.TASKS);
    if (!saved) return [];

    try {
      const parsed: unknown = JSON.parse(saved);
      return isTaskCollection(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save(tasks: Task[]): void {
    this.storage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  subscribe(listener: () => void): () => void {
    if (!this.storageEvents) return () => undefined;

    const handleStorage: EventListener = (event) => {
      const storageEvent = event as StorageEvent;
      if (storageEvent.key === STORAGE_KEYS.TASKS) listener();
    };

    this.storageEvents.addEventListener("storage", handleStorage);
    return () => {
      this.storageEvents?.removeEventListener("storage", handleStorage);
    };
  }
}
