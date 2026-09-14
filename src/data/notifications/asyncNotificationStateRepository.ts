import type {
  NotificationPersistedState,
  NotificationStateRepository,
} from "./notificationStateRepository";

export type NotificationStatePersistencePhase =
  | "uninitialized"
  | "opening"
  | "migration"
  | "hydrated"
  | "error";

export interface AsyncNotificationStateRepository
extends NotificationStateRepository {
  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<NotificationPersistedState>;
  getPersistenceState(): {
    phase: NotificationStatePersistencePhase;
    error: Error | null;
  };
}
