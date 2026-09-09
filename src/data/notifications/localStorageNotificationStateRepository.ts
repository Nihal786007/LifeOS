import {
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "../../notifications/notificationEngine.ts";

import type {
  NotificationPreferences,
} from "../../notifications/notificationEngine";

import type {
  NotificationPersistedState,
  NotificationStateRepository,
} from "./notificationStateRepository";

export const NOTIFICATION_STORAGE_KEY =
  "lifeos-notification-state-v1" as const;
export const NOTIFICATION_STATE_VERSION = "1.0" as const;

interface NotificationStateEnvelope extends NotificationPersistedState {
  version: typeof NOTIFICATION_STATE_VERSION;
}

export interface NotificationStateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface NotificationStateStorageEventTarget {
  addEventListener(type: "storage", listener: EventListener): void;
  removeEventListener(type: "storage", listener: EventListener): void;
}

function defaultState(): NotificationPersistedState {
  return {
    readIds: [],
    dismissedIds: [],
    preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  };
}

function validIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validPreferences(value: unknown): value is NotificationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;

  return (["tasks", "habits", "planning", "xp", "atlas"] as const).every(
    (category) => typeof candidate[category] === "boolean"
  );
}

function copyPreferences(
  preferences: NotificationPreferences
): NotificationPreferences {
  return {
    tasks: preferences.tasks,
    habits: preferences.habits,
    planning: preferences.planning,
    xp: preferences.xp,
    atlas: preferences.atlas,
  };
}

export class LocalStorageNotificationStateRepository
implements NotificationStateRepository {
  private readonly storage: NotificationStateStorage;
  private readonly storageEvents?: NotificationStateStorageEventTarget;

  constructor(
    storage: NotificationStateStorage,
    storageEvents?: NotificationStateStorageEventTarget
  ) {
    this.storage = storage;
    this.storageEvents = storageEvents;
  }

  load(): NotificationPersistedState {
    const saved = this.storage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!saved) return defaultState();

    try {
      const parsed: unknown = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return defaultState();
      }

      const candidate = parsed as Record<string, unknown>;
      if (
        candidate.version !== NOTIFICATION_STATE_VERSION ||
        !validIds(candidate.readIds) ||
        !validIds(candidate.dismissedIds) ||
        !validPreferences(candidate.preferences)
      ) {
        return defaultState();
      }

      return {
        readIds: structuredClone(candidate.readIds),
        dismissedIds: structuredClone(candidate.dismissedIds),
        preferences: copyPreferences(candidate.preferences),
      };
    } catch {
      return defaultState();
    }
  }

  save(state: NotificationPersistedState): void {
    const envelope: NotificationStateEnvelope = {
      version: NOTIFICATION_STATE_VERSION,
      readIds: structuredClone(state.readIds),
      dismissedIds: structuredClone(state.dismissedIds),
      preferences: copyPreferences(state.preferences),
    };

    this.storage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(envelope)
    );
  }

  clear(): void {
    this.storage.removeItem(NOTIFICATION_STORAGE_KEY);
  }

  subscribe(listener: () => void): () => void {
    if (!this.storageEvents) return () => undefined;

    const handleStorage: EventListener = (event) => {
      const storageEvent = event as StorageEvent;
      if (storageEvent.key === NOTIFICATION_STORAGE_KEY) listener();
    };

    this.storageEvents.addEventListener("storage", handleStorage);
    return () => {
      this.storageEvents?.removeEventListener("storage", handleStorage);
    };
  }
}
