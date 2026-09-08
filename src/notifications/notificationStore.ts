// ==========================================
// LifeOS Notification UI-State Store
// ==========================================
//
// Persists presentation state only. Notification
// facts remain derived by NotificationEngine.
// ==========================================

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "./notificationEngine.ts";

import type {
  NotificationCategory,
  NotificationPreferences,
} from "./notificationEngine";

export const NOTIFICATION_STORAGE_KEY =
  "lifeos-notification-state-v1" as const;
export const NOTIFICATION_STATE_VERSION = "1.0" as const;
export const NOTIFICATION_MAX_PERSISTED_IDS = 200 as const;

export interface NotificationUIState {
  readIds: readonly string[];
  dismissedIds: readonly string[];
  preferences: NotificationPreferences;
}

interface NotificationStateEnvelope extends NotificationUIState {
  version: typeof NOTIFICATION_STATE_VERSION;
}

export interface NotificationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function uniqueBounded(ids: readonly string[]): string[] {
  const unique = [...new Set(ids.filter((id) => id.trim().length > 0))];
  return unique.slice(-NOTIFICATION_MAX_PERSISTED_IDS);
}

function validPreferences(value: unknown): value is NotificationPreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (["tasks", "habits", "planning", "xp", "atlas"] as const).every(
    (category) => typeof candidate[category] === "boolean"
  );
}

function validIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function emptyState(): NotificationUIState {
  return {
    readIds: [],
    dismissedIds: [],
    preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  };
}

export class NotificationStore {
  private readonly storage: NotificationStorage;

  constructor(storage: NotificationStorage) {
    this.storage = storage;
  }

  load(): NotificationUIState {
    const saved = this.storage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!saved) return emptyState();

    try {
      const parsed = JSON.parse(saved) as Partial<NotificationStateEnvelope>;
      if (
        parsed.version !== NOTIFICATION_STATE_VERSION ||
        !validIds(parsed.readIds) ||
        !validIds(parsed.dismissedIds) ||
        !validPreferences(parsed.preferences)
      ) {
        return emptyState();
      }

      return {
        readIds: uniqueBounded(parsed.readIds),
        dismissedIds: uniqueBounded(parsed.dismissedIds),
        preferences: { ...parsed.preferences },
      };
    } catch {
      return emptyState();
    }
  }

  markRead(state: NotificationUIState, id: string): NotificationUIState {
    return this.persist({
      ...state,
      readIds: uniqueBounded([...state.readIds, id]),
    });
  }

  markAllRead(
    state: NotificationUIState,
    ids: readonly string[]
  ): NotificationUIState {
    return this.persist({
      ...state,
      readIds: uniqueBounded([...state.readIds, ...ids]),
    });
  }

  dismiss(state: NotificationUIState, id: string): NotificationUIState {
    return this.persist({
      ...state,
      dismissedIds: uniqueBounded([...state.dismissedIds, id]),
    });
  }

  setCategoryEnabled(
    state: NotificationUIState,
    category: NotificationCategory,
    enabled: boolean
  ): NotificationUIState {
    return this.persist({
      ...state,
      preferences: {
        ...state.preferences,
        [category]: enabled,
      },
    });
  }

  private persist(state: NotificationUIState): NotificationUIState {
    const normalized: NotificationUIState = {
      readIds: uniqueBounded(state.readIds),
      dismissedIds: uniqueBounded(state.dismissedIds),
      preferences: { ...state.preferences },
    };
    const envelope: NotificationStateEnvelope = {
      version: NOTIFICATION_STATE_VERSION,
      ...normalized,
    };

    this.storage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(envelope)
    );
    return structuredClone(normalized);
  }
}

let browserStore: NotificationStore | undefined;

export function getBrowserNotificationStore(): NotificationStore {
  browserStore ??= new NotificationStore(window.localStorage);
  return browserStore;
}
