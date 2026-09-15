import { createClient } from "@supabase/supabase-js";

function readClientEnvironment(): {
  url: string;
  publishableKey: string;
} | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;

  return { url, publishableKey };
}

const environment = readClientEnvironment();

export const supabaseClient = environment
  ? createClient(environment.url, environment.publishableKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const supabaseConfigurationError = environment
  ? null
  : "Supabase client configuration is unavailable.";
