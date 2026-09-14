import type { Transaction } from "@powersync/web";

import type {
  NotificationPersistedState,
} from "./notificationStateRepository";

import {
  NOTIFICATION_STATE_VERSION,
  NOTIFICATION_STORAGE_KEY,
} from "./localStorageNotificationStateRepository.ts";

import type {
  NotificationStateEnvelope,
  NotificationStateSourceSnapshot,
} from "./localStorageNotificationStateRepository";

export const NOTIFICATION_STATE_MIGRATION_ID =
  "local-storage-notification-state-v1" as const;
export const NOTIFICATION_STATE_ROW_ID = "current" as const;
export const NOTIFICATION_STATE_QUERY =
  "SELECT id, state_json FROM notification_ui_state ORDER BY id ASC";

export interface NotificationStateDatabaseRow {
  id: string;
  state_json: string;
}

interface MigrationMarkerRow {
  id: string;
}

export interface NotificationStateMigrationSource {
  inspect(): NotificationStateSourceSnapshot;
}

export interface NotificationStateMigrationDatabase {
  getOptional<T>(sql: string, parameters?: unknown[]): Promise<T | null>;
  writeTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T>;
}

export function notificationStateToDatabaseRow(
  state: NotificationPersistedState
): NotificationStateDatabaseRow {
  const envelope: NotificationStateEnvelope = {
    version: NOTIFICATION_STATE_VERSION,
    readIds: structuredClone(state.readIds),
    dismissedIds: structuredClone(state.dismissedIds),
    preferences: { ...state.preferences },
  };

  return {
    id: NOTIFICATION_STATE_ROW_ID,
    state_json: JSON.stringify(envelope),
  };
}

export function notificationStateRowsToState(
  rows: readonly NotificationStateDatabaseRow[]
): NotificationPersistedState | null {
  if (rows.length === 0) return null;
  if (rows.length !== 1 || rows[0]?.id !== NOTIFICATION_STATE_ROW_ID) {
    throw new Error("Invalid Notification UI State row set");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rows[0].state_json);
  } catch {
    throw new Error("Invalid Notification UI State JSON");
  }

  const candidate = parsed as Partial<NotificationStateEnvelope> | null;
  const categories = ["tasks", "habits", "planning", "xp", "atlas"] as const;
  if (
    !candidate ||
    typeof candidate !== "object" ||
    candidate.version !== NOTIFICATION_STATE_VERSION ||
    !Array.isArray(candidate.readIds) ||
    !candidate.readIds.every((id) => typeof id === "string") ||
    !Array.isArray(candidate.dismissedIds) ||
    !candidate.dismissedIds.every((id) => typeof id === "string") ||
    !candidate.preferences ||
    !categories.every(
      (category) => typeof candidate.preferences?.[category] === "boolean"
    )
  ) {
    throw new Error("Invalid Notification UI State payload");
  }

  return {
    readIds: structuredClone(candidate.readIds),
    dismissedIds: structuredClone(candidate.dismissedIds),
    preferences: {
      tasks: candidate.preferences.tasks,
      habits: candidate.preferences.habits,
      planning: candidate.preferences.planning,
      xp: candidate.preferences.xp,
      atlas: candidate.preferences.atlas,
    },
  };
}

export type NotificationStateMigrationResult =
  | { status: "already-complete"; imported: 0 }
  | { status: "complete"; imported: 0 | 1 }
  | { status: "invalid-source"; imported: 0 };

export async function migrateLocalStorageNotificationState(
  database: NotificationStateMigrationDatabase,
  source: NotificationStateMigrationSource,
  completedAt: string = new Date().toISOString()
): Promise<NotificationStateMigrationResult> {
  const marker = await database.getOptional<MigrationMarkerRow>(
    "SELECT id FROM migration_journal WHERE id = ?",
    [NOTIFICATION_STATE_MIGRATION_ID]
  );
  if (marker) return { status: "already-complete", imported: 0 };

  const snapshot = source.inspect();
  if (snapshot.status === "invalid") {
    return { status: "invalid-source", imported: 0 };
  }
  const expected = snapshot.status === "valid"
    ? [notificationStateToDatabaseRow(snapshot.state)]
    : [];

  return database.writeTransaction(async (transaction) => {
    const transactionMarker = await transaction.getOptional<MigrationMarkerRow>(
      "SELECT id FROM migration_journal WHERE id = ?",
      [NOTIFICATION_STATE_MIGRATION_ID]
    );
    if (transactionMarker) {
      return { status: "already-complete", imported: 0 } as const;
    }

    const existing = await transaction.getAll<NotificationStateDatabaseRow>(
      NOTIFICATION_STATE_QUERY
    );
    if (existing.length > 0) {
      throw new Error(
        "Notification UI State migration cannot import into unjournaled non-empty storage"
      );
    }

    for (const row of expected) {
      await transaction.execute(
        "INSERT INTO notification_ui_state(id, state_json) VALUES(?, ?)",
        [row.id, row.state_json]
      );
    }

    const persisted = await transaction.getAll<NotificationStateDatabaseRow>(
      NOTIFICATION_STATE_QUERY
    );
    if (JSON.stringify(persisted) !== JSON.stringify(expected)) {
      throw new Error("Notification UI State migration verification failed");
    }

    await transaction.execute(
      "INSERT INTO migration_journal(id, source_key, record_count, completed_at) VALUES(?, ?, ?, ?)",
      [
        NOTIFICATION_STATE_MIGRATION_ID,
        NOTIFICATION_STORAGE_KEY,
        expected.length,
        completedAt,
      ]
    );

    return {
      status: "complete",
      imported: expected.length as 0 | 1,
    } as const;
  });
}
