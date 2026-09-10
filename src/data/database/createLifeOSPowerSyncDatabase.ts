import {
  PowerSyncDatabase,
  WASQLiteVFS,
} from "@powersync/web";

import {
  lifeOSPowerSyncProbeSchema,
} from "./lifeOSPowerSyncSchema";

export const POWERSYNC_PROBE_DATABASE_NAME =
  "lifeos-ps-probe-v1.sqlite" as const;

export const POWERSYNC_PROBE_VFS =
  WASQLiteVFS.IDBBatchAtomicVFS;

const PROBE_CAPTURE_ID = "probe-capture-1700000000001";
const WATCH_TIMEOUT_MS = 5_000;

interface ProbeCaptureRow {
  id: string;
  text: string;
  created_at: string;
}

export interface PowerSyncCompatibilityProbeResult {
  databaseName: typeof POWERSYNC_PROBE_DATABASE_NAME;
  vfs: typeof POWERSYNC_PROBE_VFS;
  opened: boolean;
  tableReadable: boolean;
  inserted: boolean;
  updated: boolean;
  watchObserved: boolean;
  deleted: boolean;
  reopenConfirmedDeletion: boolean;
  connected: boolean;
}

export function createLifeOSPowerSyncProbeDatabase() {
  return new PowerSyncDatabase({
    schema: lifeOSPowerSyncProbeSchema,
    database: {
      dbFilename: POWERSYNC_PROBE_DATABASE_NAME,
      vfs: POWERSYNC_PROBE_VFS,
      enableMultiTabs: false,
      useWebWorker: true,
    },
  });
}

async function nextWithTimeout<T>(
  iterator: AsyncIterator<T>,
  timeoutMs: number
): Promise<IteratorResult<T>> {
  return Promise.race([
    iterator.next(),
    new Promise<never>((_resolve, reject) => {
      globalThis.setTimeout(
        () => reject(new Error("PowerSync probe watch timed out")),
        timeoutMs
      );
    }),
  ]);
}

/**
 * Browser-only manual compatibility probe.
 *
 * This function is intentionally not wired into LifeOS. It uses only a
 * dedicated local-only database and never reads LocalStorage or calls
 * PowerSyncDatabase.connect().
 */
export async function runLifeOSPowerSyncCompatibilityProbe(): Promise<
  PowerSyncCompatibilityProbeResult
> {
  const createdAt = "2026-09-10T00:00:00.000Z";
  const database = createLifeOSPowerSyncProbeDatabase();

  await database.init();
  const opened = database.ready;
  await database.execute(
    "DELETE FROM captures WHERE id = ?",
    [PROBE_CAPTURE_ID]
  );
  await database.getAll<ProbeCaptureRow>("SELECT * FROM captures LIMIT 0");

  const abortController = new AbortController();
  const watchIterator = database.watch(
    "SELECT id, text, created_at FROM captures WHERE id = ?",
    [PROBE_CAPTURE_ID],
    { signal: abortController.signal }
  )[Symbol.asyncIterator]();

  await nextWithTimeout(watchIterator, WATCH_TIMEOUT_MS);

  await database.execute(
    "INSERT INTO captures(id, text, created_at) VALUES(?, ?, ?)",
    [PROBE_CAPTURE_ID, "PowerSync compatibility probe", createdAt]
  );

  const insertedRow = await database.get<ProbeCaptureRow>(
    "SELECT id, text, created_at FROM captures WHERE id = ?",
    [PROBE_CAPTURE_ID]
  );

  const watchedInsert = await nextWithTimeout(
    watchIterator,
    WATCH_TIMEOUT_MS
  );

  await database.execute(
    "UPDATE captures SET text = ? WHERE id = ?",
    ["PowerSync compatibility probe updated", PROBE_CAPTURE_ID]
  );

  const updatedRow = await database.get<ProbeCaptureRow>(
    "SELECT id, text, created_at FROM captures WHERE id = ?",
    [PROBE_CAPTURE_ID]
  );

  await database.execute(
    "DELETE FROM captures WHERE id = ?",
    [PROBE_CAPTURE_ID]
  );

  const deletedRow = await database.getOptional<ProbeCaptureRow>(
    "SELECT id, text, created_at FROM captures WHERE id = ?",
    [PROBE_CAPTURE_ID]
  );

  abortController.abort();
  await watchIterator.return?.();
  const connected = database.connected;
  await database.close();

  const reopenedDatabase = createLifeOSPowerSyncProbeDatabase();
  await reopenedDatabase.init();
  const reopenedRow = await reopenedDatabase.getOptional<ProbeCaptureRow>(
    "SELECT id, text, created_at FROM captures WHERE id = ?",
    [PROBE_CAPTURE_ID]
  );
  await reopenedDatabase.close();

  const watchedRows = watchedInsert.value?.array as
    | ProbeCaptureRow[]
    | undefined;

  return {
    databaseName: POWERSYNC_PROBE_DATABASE_NAME,
    vfs: POWERSYNC_PROBE_VFS,
    opened,
    tableReadable: true,
    inserted:
      insertedRow.id === PROBE_CAPTURE_ID &&
      insertedRow.text === "PowerSync compatibility probe" &&
      insertedRow.created_at === createdAt,
    updated: updatedRow.text === "PowerSync compatibility probe updated",
    watchObserved:
      !watchedInsert.done &&
      (watchedRows ?? []).some((row) => row.id === PROBE_CAPTURE_ID),
    deleted: deletedRow === null,
    reopenConfirmedDeletion: reopenedRow === null,
    connected,
  };
}
