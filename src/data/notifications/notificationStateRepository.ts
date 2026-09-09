import type {
  NotificationPreferences,
} from "../../notifications/notificationEngine";

export interface NotificationPersistedState {
  readIds: readonly string[];
  dismissedIds: readonly string[];
  preferences: NotificationPreferences;
}

export interface NotificationStateRepository {
  load(): NotificationPersistedState;
  save(state: NotificationPersistedState): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}
