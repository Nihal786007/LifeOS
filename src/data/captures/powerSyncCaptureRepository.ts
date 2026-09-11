import type {
  PowerSyncDatabase,
} from "@powersync/web";

import type {
  Capture,
} from "../../shared/types";

import type {
  AsyncCaptureRepository,
  CaptureRepositoryEvent,
} from "./asyncCaptureRepository";

import {
  migrateLocalStorageCaptures,
} from "./migrateLocalStorageCaptures";

import type {
  CaptureMigrationSource,
} from "./migrateLocalStorageCaptures";

interface CaptureDatabaseRow {
  id: string;
  text: string;
  created_at: string;
  sort_order: number;
  extras_json: string | null;
}

const CAPTURE_QUERY =
  "SELECT id, text, created_at, sort_order, extras_json FROM captures ORDER BY sort_order ASC, id DESC";

export function captureIdToDatabaseId(id: number): string {
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new Error(`Capture ID cannot be stored safely: ${String(id)}`);
  }

  return String(id);
}

export function databaseIdToCaptureId(id: string): number {
  if (!/^(0|[1-9]\d*)$/.test(id)) {
    throw new Error(`Invalid Capture database ID: ${id}`);
  }

  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || String(parsed) !== id) {
    throw new Error(`Unsafe Capture database ID: ${id}`);
  }

  return parsed;
}

function parseExtras(value: string | null): Record<string, unknown> {
  if (value === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid Capture extras JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid Capture extras payload");
  }

  return parsed as Record<string, unknown>;
}

function rowToCapture(row: CaptureDatabaseRow): Capture {
  const extras = parseExtras(row.extras_json);

  return {
    ...extras,
    id: databaseIdToCaptureId(row.id),
    text: row.text,
    createdAt: row.created_at,
  };
}

function captureExtras(capture: Capture): string | null {
  const extras = { ...capture } as Record<string, unknown>;
  delete extras.id;
  delete extras.text;
  delete extras.createdAt;
  return Object.keys(extras).length > 0 ? JSON.stringify(extras) : null;
}

export class PowerSyncCaptureRepository implements AsyncCaptureRepository {
  private initialization?: Promise<Capture[]>;
  private readonly database: PowerSyncDatabase;
  private readonly migrationSource: CaptureMigrationSource;

  constructor(
    database: PowerSyncDatabase,
    migrationSource: CaptureMigrationSource
  ) {
    this.database = database;
    this.migrationSource = migrationSource;
  }

  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<Capture[]> {
    if (!this.initialization) {
      this.initialization = this.initializeOnce(onPhase);
    }

    return this.initialization;
  }

  private async initializeOnce(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<Capture[]> {
    onPhase?.("opening");
    await this.database.init();
    onPhase?.("migration");

    const migration = await migrateLocalStorageCaptures(
      this.database,
      this.migrationSource
    );

    if (migration.status === "invalid-source") {
      throw new Error(
        "Existing Quick Capture data is invalid and was not migrated"
      );
    }

    return this.load();
  }

  private async load(): Promise<Capture[]> {
    const rows = await this.database.getAll<CaptureDatabaseRow>(CAPTURE_QUERY);
    return rows.map(rowToCapture);
  }

  async insert(capture: Capture): Promise<void> {
    await this.initialize();
    const id = captureIdToDatabaseId(capture.id);

    await this.database.writeTransaction(async (transaction) => {
      const minimum = await transaction.getOptional<{ minimum: number | null }>(
        "SELECT MIN(sort_order) AS minimum FROM captures"
      );
      const sortOrder = minimum?.minimum == null ? 0 : minimum.minimum - 1;

      await transaction.execute(
        "INSERT INTO captures(id, text, created_at, sort_order, extras_json) VALUES(?, ?, ?, ?, ?)",
        [id, capture.text, capture.createdAt, sortOrder, captureExtras(capture)]
      );
    });
  }

  async delete(id: number): Promise<void> {
    await this.initialize();
    await this.database.execute(
      "DELETE FROM captures WHERE id = ?",
      [captureIdToDatabaseId(id)]
    );
  }

  subscribe(
    listener: (event: CaptureRepositoryEvent) => void
  ): () => void {
    const abortController = new AbortController();

    void this.watch(listener, abortController.signal);
    return () => abortController.abort();
  }

  private async watch(
    listener: (event: CaptureRepositoryEvent) => void,
    signal: AbortSignal
  ): Promise<void> {
    try {
      await this.initialize();

      for await (const result of this.database.watch(
        CAPTURE_QUERY,
        [],
        { signal }
      )) {
        if (signal.aborted) return;
        const rows = result.rows?._array as CaptureDatabaseRow[] | undefined;
        listener({
          type: "captures",
          captures: (rows ?? []).map(rowToCapture),
        });
      }
    } catch (error) {
      if (signal.aborted) return;
      listener({
        type: "error",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}
