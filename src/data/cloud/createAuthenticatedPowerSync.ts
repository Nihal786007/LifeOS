import type { SupabaseClient } from "@supabase/supabase-js";

import { AuthenticatedPowerSyncSessionManager } from "./AuthenticatedPowerSyncSessionManager.ts";
import { SupabasePowerSyncConnector } from "./SupabasePowerSyncConnector.ts";

export function readPowerSyncEndpoint(
  environment: Record<string, string | boolean | undefined> = import.meta.env
): string {
  const endpoint = environment.VITE_POWERSYNC_URL;
  if (typeof endpoint !== "string" || endpoint.trim().length === 0) {
    throw new Error("VITE_POWERSYNC_URL is unavailable");
  }
  return endpoint.trim();
}

export function createAuthenticatedPowerSyncSessionManager(
  supabase: SupabaseClient,
  endpoint = readPowerSyncEndpoint()
): AuthenticatedPowerSyncSessionManager {
  return new AuthenticatedPowerSyncSessionManager({
    createConnector: (userId) => new SupabasePowerSyncConnector({
      endpoint,
      userId,
      supabase,
    }),
  });
}
