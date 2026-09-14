import type { PowerSyncDatabase } from "@powersync/web";
import type { UserProfile } from "../../shared/types";
import type { AsyncProfileRepository, ProfileRepositoryEvent } from "./asyncProfileRepository";
import { migrateLocalStorageProfile, PROFILE_QUERY, PROFILE_ROW_ID, profileRowsToProfile, profileToDatabaseRow } from "./migrateLocalStorageProfile";
import type { ProfileDatabaseRow, ProfileMigrationSource } from "./migrateLocalStorageProfile";

export class PowerSyncProfileRepository implements AsyncProfileRepository {
  private initialization?: Promise<UserProfile | null>;
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly database: PowerSyncDatabase;
  private readonly migrationSource: ProfileMigrationSource;

  constructor(database: PowerSyncDatabase, migrationSource: ProfileMigrationSource) {
    this.database = database;
    this.migrationSource = migrationSource;
  }
  initialize(onPhase?: (phase: "opening" | "migration") => void): Promise<UserProfile | null> {
    if (!this.initialization) this.initialization = this.initializeOnce(onPhase);
    return this.initialization;
  }
  private async initializeOnce(onPhase?: (phase: "opening" | "migration") => void): Promise<UserProfile | null> {
    onPhase?.("opening"); await this.database.init(); onPhase?.("migration");
    const result = await migrateLocalStorageProfile(this.database, this.migrationSource);
    if (result.status === "invalid-source") throw new Error("Existing Profile data is invalid and was not migrated");
    return this.load();
  }
  private async load(): Promise<UserProfile | null> {
    return profileRowsToProfile(await this.database.getAll<ProfileDatabaseRow>(PROFILE_QUERY));
  }
  async replace(profile: UserProfile): Promise<UserProfile> {
    await this.initialize(); const snapshot = structuredClone(profile);
    return this.enqueue(() => this.database.writeTransaction(async (transaction) => {
      profileRowsToProfile(await transaction.getAll<ProfileDatabaseRow>(PROFILE_QUERY));
      const row = profileToDatabaseRow(snapshot);
      await transaction.execute("DELETE FROM profiles WHERE id = ?", [PROFILE_ROW_ID]);
      await transaction.execute("INSERT INTO profiles(id, profile_json) VALUES(?, ?)", [row.id, row.profile_json]);
      const persisted = await transaction.getAll<ProfileDatabaseRow>(PROFILE_QUERY);
      if (JSON.stringify(persisted) !== JSON.stringify([row])) throw new Error("Profile replacement verification failed");
      return structuredClone(profileRowsToProfile(persisted)!);
    }));
  }
  subscribe(listener: (event: ProfileRepositoryEvent) => void): () => void {
    const controller = new AbortController(); void this.watch(listener, controller.signal); return () => controller.abort();
  }
  private async watch(listener: (event: ProfileRepositoryEvent) => void, signal: AbortSignal): Promise<void> {
    try {
      await this.initialize();
      for await (const result of this.database.watch(PROFILE_QUERY, [], { signal })) {
        if (signal.aborted) return;
        const rows = result.rows?._array as ProfileDatabaseRow[] | undefined;
        listener({ type: "profile", profile: profileRowsToProfile(rows ?? []) });
      }
    } catch (error) {
      if (!signal.aborted) listener({ type: "error", error: error instanceof Error ? error : new Error(String(error)) });
    }
  }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation); this.mutationQueue = result.then(() => undefined, () => undefined); return result;
  }
}
