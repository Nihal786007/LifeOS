import type { PowerSyncDatabase, Transaction } from "@powersync/web";
import { isAtlasMemoryCollection } from "../../atlas/memory/types.ts";
import type { AtlasMemoryItem } from "../../atlas/memory/types";
import type { AsyncAtlasMemoryRepository, AtlasMemoryPersistencePhase } from "./asyncAtlasMemoryRepository";
import { ATLAS_MEMORY_QUERY, memoryItemToRow, memoryRowsMatch, memoryRowsToItems, migrateLocalStorageAtlasMemory } from "./migrateLocalStorageAtlasMemory";
import type { AtlasMemoryDatabaseRow, AtlasMemoryMigrationSource } from "./migrateLocalStorageAtlasMemory";

async function replaceRows(transaction: Transaction, items: readonly AtlasMemoryItem[]): Promise<void> {
  const rows = items.map(memoryItemToRow);
  await transaction.execute("DELETE FROM atlas_memory_items");
  for (const row of rows) await transaction.execute(
    "INSERT INTO atlas_memory_items(id, type, topic, content, source, created_at, updated_at, status, supersedes_memory_id, sort_order) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [row.id, row.type, row.topic, row.content, row.source, row.created_at, row.updated_at, row.status, row.supersedes_memory_id, row.sort_order]
  );
  const persisted = await transaction.getAll<AtlasMemoryDatabaseRow>(ATLAS_MEMORY_QUERY);
  if (!memoryRowsMatch(persisted, rows)) throw new Error("ATLAS Memory replacement verification failed");
}

export class PowerSyncAtlasMemoryRepository implements AsyncAtlasMemoryRepository {
  private initialization?: Promise<readonly AtlasMemoryItem[]>;
  private cache: readonly AtlasMemoryItem[] = [];
  private phase: AtlasMemoryPersistencePhase = "uninitialized";
  private error: Error | null = null;
  private queue: Promise<void> = Promise.resolve();
  private expected: readonly AtlasMemoryItem[] | null = null;
  private watchBlocked = false;
  private mutationVersion = 0;
  private readonly listeners = new Set<() => void>();
  private readonly database: PowerSyncDatabase;
  private readonly migrationSource: AtlasMemoryMigrationSource;

  constructor(database: PowerSyncDatabase, migrationSource: AtlasMemoryMigrationSource) {
    this.database = database; this.migrationSource = migrationSource;
  }
  initialize(onPhase?: (phase: "opening" | "migration") => void): Promise<readonly AtlasMemoryItem[]> {
    if (!this.initialization) this.initialization = this.initializeOnce(onPhase); return this.initialization;
  }
  private async initializeOnce(onPhase?: (phase: "opening" | "migration") => void): Promise<readonly AtlasMemoryItem[]> {
    this.phase = "opening"; onPhase?.("opening"); await this.database.init();
    this.phase = "migration"; onPhase?.("migration");
    const migration = await migrateLocalStorageAtlasMemory(this.database, this.migrationSource);
    if (migration.status === "invalid-source") {
      this.phase = "error"; throw new Error("Existing ATLAS Memory data is invalid and was not migrated");
    }
    this.cache = structuredClone(memoryRowsToItems(await this.database.getAll<AtlasMemoryDatabaseRow>(ATLAS_MEMORY_QUERY)));
    this.phase = "hydrated"; this.error = null; return this.load();
  }
  getPersistenceState() { return { phase: this.phase, error: this.error }; }
  load(): readonly AtlasMemoryItem[] {
    if (this.phase !== "hydrated") throw new Error("ATLAS Memory persistence is not hydrated");
    return structuredClone(this.cache);
  }
  save(items: readonly AtlasMemoryItem[]): void {
    if (this.phase !== "hydrated") throw new Error("ATLAS Memory persistence is not hydrated");
    if (!isAtlasMemoryCollection(items)) throw new Error("Invalid ATLAS Memory state");
    const snapshot = structuredClone(items); const version = ++this.mutationVersion; this.cache = snapshot; this.expected = snapshot; this.watchBlocked = false; this.error = null; this.notify();
    this.enqueue(() => this.database.writeTransaction((transaction) => replaceRows(transaction, snapshot)), version);
  }
  clear(): void {
    if (this.phase !== "hydrated") throw new Error("ATLAS Memory persistence is not hydrated");
    const snapshot: readonly AtlasMemoryItem[] = []; const version = ++this.mutationVersion; this.cache = snapshot; this.expected = snapshot; this.watchBlocked = false; this.error = null; this.notify();
    this.enqueue(() => this.database.writeTransaction((transaction) => replaceRows(transaction, snapshot)), version);
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener); const controller = new AbortController(); void this.watch(controller.signal);
    return () => { this.listeners.delete(listener); controller.abort(); };
  }
  private async watch(signal: AbortSignal): Promise<void> {
    try {
      await this.initialize();
      for await (const result of this.database.watch(ATLAS_MEMORY_QUERY, [], { signal })) {
        if (signal.aborted || this.watchBlocked) return;
        const rows = result.rows?._array as AtlasMemoryDatabaseRow[] | undefined;
        const items = memoryRowsToItems(rows ?? []);
        if (this.expected && JSON.stringify(items) !== JSON.stringify(this.expected)) continue;
        this.expected = null;
        if (JSON.stringify(items) === JSON.stringify(this.cache)) continue;
        this.cache = structuredClone(items); this.error = null; this.notify();
      }
    } catch (error) { if (!signal.aborted) { this.error = error instanceof Error ? error : new Error(String(error)); this.phase = "error"; this.notify(); } }
  }
  private enqueue(operation: () => Promise<void>, version: number): void {
    const result = this.queue.then(operation);
    this.queue = result.then(() => { if (version === this.mutationVersion) this.expected = null; }, (error: unknown) => {
      if (version !== this.mutationVersion) return;
      this.expected = null; this.watchBlocked = true; this.error = error instanceof Error ? error : new Error(String(error)); this.phase = "error"; this.notify();
    });
  }
  private notify() { for (const listener of this.listeners) listener(); }
}
