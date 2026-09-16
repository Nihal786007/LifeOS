import {
  UpdateType,
} from "@powersync/web";
import type {
  CommonPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from "@powersync/web";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  LIFEOS_CLOUD_COLUMNS,
  LIFEOS_CLOUD_DELETE_ORDER,
  LIFEOS_CLOUD_PUT_ORDER,
  isLifeOSCloudTable,
} from "./lifeOSCloudTables.ts";
import type { LifeOSCloudTable } from "./lifeOSCloudTables.ts";
import { assertAuthenticatedUserId } from "../database/authenticatedLifeOSPowerSync.ts";

interface SupabaseMutationError {
  code?: string;
  message: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validatedEndpoint(endpoint: string): string {
  const value = endpoint.trim().replace(/\/$/, "");
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("PowerSync endpoint must be an HTTPS instance URL");
  }
  return value;
}

function assertRemoteRowId(id: string): void {
  if (!UUID_PATTERN.test(id)) {
    throw new Error("Cloud mutations require UUID row identity");
  }
}

function assertApprovedColumns(
  table: LifeOSCloudTable,
  data: Record<string, unknown>
): void {
  const allowed = new Set(LIFEOS_CLOUD_COLUMNS[table]);
  const unsupported = Object.keys(data).filter((column) => !allowed.has(column));
  if (unsupported.length > 0) {
    throw new Error(`${table}: unsupported cloud columns: ${unsupported.join(", ")}`);
  }
}

function ownedPayload(
  operation: CrudEntry,
  table: LifeOSCloudTable,
  expectedUserId: string
): Record<string, unknown> {
  assertRemoteRowId(operation.id);
  const data = operation.opData;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${operation.table}: mutation payload is required`);
  }
  assertApprovedColumns(table, data);
  if (data.user_id !== expectedUserId) {
    throw new Error(`${operation.table}: mutation ownership mismatch`);
  }
  if (typeof data.entity_id !== "string" || data.entity_id.length === 0) {
    throw new Error(`${operation.table}: canonical entity_id is required`);
  }
  return { id: operation.id, ...data };
}

function patchPayload(
  operation: CrudEntry,
  table: LifeOSCloudTable,
  expectedUserId: string
): Record<string, unknown> {
  assertRemoteRowId(operation.id);
  const data = operation.opData;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${operation.table}: patch payload is required`);
  }
  assertApprovedColumns(table, data);
  if ("user_id" in data && data.user_id !== expectedUserId) {
    throw new Error(`${operation.table}: patch ownership mismatch`);
  }
  if ("entity_id" in data || "execution_id" in data) {
    throw new Error(`${operation.table}: canonical identity cannot be patched`);
  }
  const patch = { ...data };
  delete patch.user_id;
  return patch;
}

function throwMutationError(
  table: LifeOSCloudTable,
  action: string,
  error: SupabaseMutationError | null
): void {
  if (error) {
    throw new Error(
      `${table}: cloud ${action} failed${error.code ? ` (${error.code})` : ""}: ${error.message}`
    );
  }
}

export interface SupabasePowerSyncConnectorOptions {
  endpoint: string;
  userId: string;
  supabase: SupabaseClient;
}

export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  readonly endpoint: string;
  readonly userId: string;
  private readonly supabase: SupabaseClient;

  constructor(options: SupabasePowerSyncConnectorOptions) {
    this.endpoint = validatedEndpoint(options.endpoint);
    this.userId = assertAuthenticatedUserId(options.userId);
    this.supabase = options.supabase;
  }

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) throw error;
    const session = data.session;
    if (!session) return null;
    if (session.user.id.toLowerCase() !== this.userId) {
      throw new Error("Supabase session does not match the active PowerSync user");
    }
    return {
      endpoint: this.endpoint,
      token: session.access_token,
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1_000)
        : undefined,
    };
  }

  async uploadData(database: CommonPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    const operations = transaction.crud.map((operation) => {
      if (!isLifeOSCloudTable(operation.table)) {
        throw new Error(`Cloud upload rejected unknown table: ${operation.table}`);
      }
      return operation as CrudEntry & { table: LifeOSCloudTable };
    });

    for (const table of LIFEOS_CLOUD_PUT_ORDER) {
      const puts = operations.filter(
        (operation) => operation.table === table && operation.op === UpdateType.PUT
      );
      if (puts.length > 0) await this.uploadPuts(table, puts);

      const patches = operations.filter(
        (operation) => operation.table === table && operation.op === UpdateType.PATCH
      );
      for (const patch of patches) await this.uploadPatch(table, patch);
    }

    for (const table of LIFEOS_CLOUD_DELETE_ORDER) {
      const deletes = operations.filter(
        (operation) => operation.table === table && operation.op === UpdateType.DELETE
      );
      if (deletes.length > 0) await this.uploadDeletes(table, deletes);
    }

    await transaction.complete();
  }

  private async uploadPuts(
    table: LifeOSCloudTable,
    operations: CrudEntry[]
  ): Promise<void> {
    const rows = operations.map((operation) =>
      ownedPayload(operation, table, this.userId)
    );
    const query = this.supabase.from(table);
    const { error } = table === "execution_records"
      ? await query.upsert(rows, {
          onConflict: "id",
          ignoreDuplicates: true,
        })
      : await query.upsert(rows, { onConflict: "id" });
    throwMutationError(table, "put", error);
  }

  private async uploadPatch(
    table: LifeOSCloudTable,
    operation: CrudEntry
  ): Promise<void> {
    if (table === "execution_records") {
      throw new Error("Execution History is append-only and cannot be patched");
    }
    const patch = patchPayload(operation, table, this.userId);
    const { error } = await this.supabase
      .from(table)
      .update(patch)
      .eq("id", operation.id)
      .eq("user_id", this.userId);
    throwMutationError(table, "patch", error);
  }

  private async uploadDeletes(
    table: LifeOSCloudTable,
    operations: CrudEntry[]
  ): Promise<void> {
    const ids = operations.map((operation) => {
      assertRemoteRowId(operation.id);
      return operation.id;
    });
    const { error } = await this.supabase
      .from(table)
      .delete()
      .in("id", ids)
      .eq("user_id", this.userId);
    throwMutationError(table, "delete", error);
  }
}
