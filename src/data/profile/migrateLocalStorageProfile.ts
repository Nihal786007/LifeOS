import type { Transaction } from "@powersync/web";
import type { UserProfile } from "../../shared/types";
import type { ProfileSourceSnapshot } from "../profileCapture/localStorageProfileCaptureRepositories";

export const PROFILE_MIGRATION_ID = "local-storage-profile-v1" as const;
export const PROFILE_SOURCE_KEY = "lifeos-profile" as const;
export const PROFILE_ROW_ID = "current" as const;
export interface ProfileMigrationSource { inspect(): ProfileSourceSnapshot }
export interface ProfileMigrationDatabase {
  getOptional<T>(sql: string, parameters?: unknown[]): Promise<T | null>;
  writeTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T>;
}
export interface ProfileDatabaseRow { id: string; profile_json: string }
interface MigrationMarkerRow { id: string }
export const PROFILE_QUERY = "SELECT id, profile_json FROM profiles ORDER BY id ASC";

export function profileToDatabaseRow(profile: UserProfile): ProfileDatabaseRow {
  return { id: PROFILE_ROW_ID, profile_json: JSON.stringify(profile) };
}

export function profileRowToProfile(row: ProfileDatabaseRow): UserProfile {
  if (row.id !== PROFILE_ROW_ID) throw new Error(`Invalid Profile row ID: ${row.id}`);
  let parsed: unknown;
  try { parsed = JSON.parse(row.profile_json); } catch { throw new Error("Invalid Profile JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid Profile payload");
  return parsed as UserProfile;
}

export function profileRowsToProfile(rows: ProfileDatabaseRow[]): UserProfile | null {
  if (rows.length === 0) return null;
  if (rows.length !== 1) throw new Error("Invalid Profile row count");
  return profileRowToProfile(rows[0]!);
}

export type ProfileMigrationResult =
  | { status: "already-complete"; imported: 0 }
  | { status: "complete"; imported: 0 | 1 }
  | { status: "invalid-source"; imported: 0 };

export async function migrateLocalStorageProfile(
  database: ProfileMigrationDatabase,
  source: ProfileMigrationSource,
  completedAt: string = new Date().toISOString()
): Promise<ProfileMigrationResult> {
  const marker = await database.getOptional<MigrationMarkerRow>("SELECT id FROM migration_journal WHERE id = ?", [PROFILE_MIGRATION_ID]);
  if (marker) return { status: "already-complete", imported: 0 };
  const snapshot = source.inspect();
  if (snapshot.status === "invalid") return { status: "invalid-source", imported: 0 };
  const expected = snapshot.status === "valid" ? [profileToDatabaseRow(snapshot.profile)] : [];
  return database.writeTransaction(async (transaction) => {
    const transactionMarker = await transaction.getOptional<MigrationMarkerRow>("SELECT id FROM migration_journal WHERE id = ?", [PROFILE_MIGRATION_ID]);
    if (transactionMarker) return { status: "already-complete", imported: 0 } as const;
    const existing = await transaction.getAll<ProfileDatabaseRow>(PROFILE_QUERY);
    if (existing.length > 0) throw new Error("Profile migration cannot import into unjournaled non-empty storage");
    for (const row of expected) await transaction.execute("INSERT INTO profiles(id, profile_json) VALUES(?, ?)", [row.id, row.profile_json]);
    const persisted = await transaction.getAll<ProfileDatabaseRow>(PROFILE_QUERY);
    if (JSON.stringify(persisted) !== JSON.stringify(expected)) throw new Error("Profile migration verification failed");
    await transaction.execute("INSERT INTO migration_journal(id, source_key, record_count, completed_at) VALUES(?, ?, ?, ?)", [PROFILE_MIGRATION_ID, PROFILE_SOURCE_KEY, expected.length, completedAt]);
    return { status: "complete", imported: expected.length as 0 | 1 } as const;
  });
}
