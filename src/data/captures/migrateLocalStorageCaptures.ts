import type {
  Transaction,
} from "@powersync/web";

import type {
  Capture,
} from "../../shared/types";

import type {
  CaptureSourceSnapshot,
} from "../profileCapture/localStorageProfileCaptureRepositories";

export const CAPTURE_MIGRATION_ID =
  "local-storage-captures-v1" as const;

export const CAPTURE_SOURCE_KEY =
  "lifeos-captures" as const;

export interface CaptureMigrationSource {
  inspect(): CaptureSourceSnapshot;
}

export interface CaptureMigrationDatabase {
  getOptional<T>(sql: string, parameters?: unknown[]): Promise<T | null>;
  writeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
}

interface MigrationMarkerRow {
  id: string;
}

interface CaptureDatabaseRow {
  id: string;
  text: string;
  created_at: string;
  sort_order: number;
  extras_json: string | null;
}

function captureIdToDatabaseId(id: number): string {
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new Error(`Capture ID cannot be stored safely: ${String(id)}`);
  }

  return String(id);
}

function captureExtras(capture: Capture): Record<string, unknown> {
  const extras = { ...capture } as Record<string, unknown>;
  delete extras.id;
  delete extras.text;
  delete extras.createdAt;
  return extras;
}

function toDatabaseRow(
  capture: Capture,
  sortOrder: number
): CaptureDatabaseRow {
  const extras = captureExtras(capture);

  return {
    id: captureIdToDatabaseId(capture.id),
    text: capture.text,
    created_at: capture.createdAt,
    sort_order: sortOrder,
    extras_json:
      Object.keys(extras).length > 0 ? JSON.stringify(extras) : null,
  };
}

function rowsMatch(
  actual: CaptureDatabaseRow[],
  expected: CaptureDatabaseRow[]
): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export type CaptureMigrationResult =
  | { status: "already-complete"; imported: 0 }
  | { status: "complete"; imported: number }
  | { status: "invalid-source"; imported: 0 };

export async function migrateLocalStorageCaptures(
  database: CaptureMigrationDatabase,
  source: CaptureMigrationSource,
  completedAt: string = new Date().toISOString()
): Promise<CaptureMigrationResult> {
  const marker = await database.getOptional<MigrationMarkerRow>(
    "SELECT id FROM migration_journal WHERE id = ?",
    [CAPTURE_MIGRATION_ID]
  );

  if (marker) {
    return { status: "already-complete", imported: 0 };
  }

  const snapshot = source.inspect();
  if (snapshot.status === "invalid") {
    return { status: "invalid-source", imported: 0 };
  }

  const expectedRows = snapshot.captures.map(toDatabaseRow);

  return database.writeTransaction(async (transaction) => {
    const transactionMarker = await transaction.getOptional<MigrationMarkerRow>(
      "SELECT id FROM migration_journal WHERE id = ?",
      [CAPTURE_MIGRATION_ID]
    );

    if (transactionMarker) {
      return { status: "already-complete", imported: 0 } as const;
    }

    const existingRows = await transaction.getAll<CaptureDatabaseRow>(
      "SELECT id, text, created_at, sort_order, extras_json FROM captures ORDER BY sort_order ASC, id DESC"
    );

    if (existingRows.length > 0) {
      throw new Error(
        "Capture migration cannot import into an unjournaled non-empty database"
      );
    }

    for (const row of expectedRows) {
      await transaction.execute(
        "INSERT INTO captures(id, text, created_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?)",
        [row.id, row.text, row.created_at, row.sort_order, row.extras_json]
      );
    }

    const importedRows = await transaction.getAll<CaptureDatabaseRow>(
      "SELECT id, text, created_at, sort_order, extras_json FROM captures ORDER BY sort_order ASC, id DESC"
    );

    if (!rowsMatch(importedRows, expectedRows)) {
      throw new Error("Capture migration verification failed");
    }

    await transaction.execute(
      "INSERT INTO migration_journal(id, source_key, record_count, completed_at) VALUES(?, ?, ?, ?)",
      [CAPTURE_MIGRATION_ID, CAPTURE_SOURCE_KEY, expectedRows.length, completedAt]
    );

    return { status: "complete", imported: expectedRows.length } as const;
  });
}
