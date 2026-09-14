import type { Transaction } from "@powersync/web";
import { isAtlasMemoryCollection } from "../../atlas/memory/types.ts";
import type { AtlasMemoryItem } from "../../atlas/memory/types";
import type { AtlasMemorySourceSnapshot } from "./localStorageAtlasMemoryRepository";

export const ATLAS_MEMORY_MIGRATION_ID = "local-storage-atlas-memory-v1" as const;
export const ATLAS_MEMORY_SOURCE_KEY = "lifeos-atlas-user-memory-v1" as const;
export const ATLAS_MEMORY_QUERY = "SELECT id, type, topic, content, source, created_at, updated_at, status, supersedes_memory_id, sort_order FROM atlas_memory_items ORDER BY sort_order ASC, id ASC";

export interface AtlasMemoryMigrationSource { inspect(): AtlasMemorySourceSnapshot }
export interface AtlasMemoryMigrationDatabase {
  getOptional<T>(sql: string, parameters?: unknown[]): Promise<T | null>;
  writeTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T>;
}
export interface AtlasMemoryDatabaseRow {
  id: string; type: string; topic: string; content: string; source: string;
  created_at: string; updated_at: string; status: string;
  supersedes_memory_id: string | null; sort_order: number;
}
interface Marker { id: string }

export function memoryItemToRow(item: AtlasMemoryItem, sortOrder: number): AtlasMemoryDatabaseRow {
  return { id: item.id, type: item.type, topic: item.topic, content: item.content, source: item.source, created_at: item.createdAt, updated_at: item.updatedAt, status: item.status, supersedes_memory_id: item.supersedesMemoryId ?? null, sort_order: sortOrder };
}
export function memoryRowsToItems(rows: AtlasMemoryDatabaseRow[]): readonly AtlasMemoryItem[] {
  const items = rows.map((row) => ({
    id: row.id, type: row.type, topic: row.topic, content: row.content, source: row.source,
    createdAt: row.created_at, updatedAt: row.updated_at, status: row.status,
    ...(row.supersedes_memory_id === null ? {} : { supersedesMemoryId: row.supersedes_memory_id }),
  }));
  if (!isAtlasMemoryCollection(items)) throw new Error("Invalid ATLAS Memory database state");
  return items;
}
export function memoryRowsMatch(actual: AtlasMemoryDatabaseRow[], expected: AtlasMemoryDatabaseRow[]): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export type AtlasMemoryMigrationResult =
  | { status: "already-complete"; imported: 0 }
  | { status: "complete"; imported: number }
  | { status: "invalid-source"; imported: 0 };

export async function migrateLocalStorageAtlasMemory(
  database: AtlasMemoryMigrationDatabase,
  source: AtlasMemoryMigrationSource,
  completedAt: string = new Date().toISOString()
): Promise<AtlasMemoryMigrationResult> {
  const marker = await database.getOptional<Marker>("SELECT id FROM migration_journal WHERE id = ?", [ATLAS_MEMORY_MIGRATION_ID]);
  if (marker) return { status: "already-complete", imported: 0 };
  const snapshot = source.inspect();
  if (snapshot.status === "invalid") return { status: "invalid-source", imported: 0 };
  const expected = snapshot.items.map(memoryItemToRow);
  return database.writeTransaction(async (transaction) => {
    const transactionMarker = await transaction.getOptional<Marker>("SELECT id FROM migration_journal WHERE id = ?", [ATLAS_MEMORY_MIGRATION_ID]);
    if (transactionMarker) return { status: "already-complete", imported: 0 } as const;
    const existing = await transaction.getAll<AtlasMemoryDatabaseRow>(ATLAS_MEMORY_QUERY);
    if (existing.length > 0) throw new Error("ATLAS Memory migration cannot import into unjournaled non-empty storage");
    for (const row of expected) await transaction.execute(
      "INSERT INTO atlas_memory_items(id, type, topic, content, source, created_at, updated_at, status, supersedes_memory_id, sort_order) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [row.id, row.type, row.topic, row.content, row.source, row.created_at, row.updated_at, row.status, row.supersedes_memory_id, row.sort_order]
    );
    const persisted = await transaction.getAll<AtlasMemoryDatabaseRow>(ATLAS_MEMORY_QUERY);
    if (!memoryRowsMatch(persisted, expected)) throw new Error("ATLAS Memory migration verification failed");
    await transaction.execute("INSERT INTO migration_journal(id, source_key, record_count, completed_at) VALUES(?, ?, ?, ?)", [ATLAS_MEMORY_MIGRATION_ID, ATLAS_MEMORY_SOURCE_KEY, expected.length, completedAt]);
    return { status: "complete", imported: expected.length } as const;
  });
}
