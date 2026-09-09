// ==========================================
// LifeOS Notification UI-State Store
// ==========================================
//
// Persists presentation state only. Notification
// facts remain derived by NotificationEngine.
// ==========================================

import type {
  NotificationCategory,
} from "./notificationEngine";

import type {
  NotificationPersistedState,
  NotificationStateRepository,
} from "../data/notifications/notificationStateRepository";

export const NOTIFICATION_MAX_PERSISTED_IDS = 200 as const;

export type NotificationUIState = NotificationPersistedState;

function uniqueBounded(ids: readonly string[]): string[] {
  const unique = [...new Set(ids.filter((id) => id.trim().length > 0))];
  return unique.slice(-NOTIFICATION_MAX_PERSISTED_IDS);
}

export class NotificationStore {
  private readonly repository: NotificationStateRepository;

  constructor(repository: NotificationStateRepository) {
    this.repository = repository;
  }

  load(): NotificationUIState {
    const state = this.repository.load();
    return {
      readIds: uniqueBounded(state.readIds),
      dismissedIds: uniqueBounded(state.dismissedIds),
      preferences: { ...state.preferences },
    };
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
    this.repository.save(normalized);
    return structuredClone(normalized);
  }

  subscribe(listener: () => void): () => void {
    return this.repository.subscribe(listener);
  }
}
