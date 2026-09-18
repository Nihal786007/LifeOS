export interface AtlasRuntimeEnvironment {
  get(name: string): string | undefined;
}

const CONFIGURATION_ERROR =
  "Supabase publishable key configuration is unavailable or invalid.";

function failConfiguration(): never {
  throw new Error(CONFIGURATION_ERROR);
}

export function resolveSupabasePublishableKey(
  environment: AtlasRuntimeEnvironment
): string {
  const hostedKeys = environment.get("SUPABASE_PUBLISHABLE_KEYS");
  if (hostedKeys !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(hostedKeys);
    } catch {
      return failConfiguration();
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return failConfiguration();
    }
    const value = (parsed as Record<string, unknown>).default;
    if (typeof value !== "string" || value.trim().length === 0) {
      return failConfiguration();
    }
    return value.trim();
  }

  const localKey = environment.get("SUPABASE_PUBLISHABLE_KEY");
  if (typeof localKey !== "string" || localKey.trim().length === 0) {
    return failConfiguration();
  }
  return localKey.trim();
}
