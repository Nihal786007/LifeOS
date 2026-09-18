// Supabase Edge Function entrypoint. Hosted adapters are registered only when
// their server-side credentials are present.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createAtlasReasonHandler } from "./handler.ts";
import { resolveSupabasePublishableKey } from "./runtimeConfig.ts";
import {
  createHostedProviderSelectionDiagnostic,
  createHostedRuntimeRegistration,
} from "./runtimeRegistry.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const publishableKey = resolveSupabasePublishableKey(Deno.env);
const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve((request) => {
  const runtime = createHostedRuntimeRegistration(Deno.env);
  const handler = createAtlasReasonHandler({
    configuredProvider: runtime.configuredProvider,
    providerSelectionDiagnostic: createHostedProviderSelectionDiagnostic(runtime),
    registry: runtime.registry,
    authenticate: async (accessToken) => {
      const { data, error } = await supabase.auth.getUser(accessToken);
      return error || !data.user ? null : { userId: data.user.id };
    },
  });
  return handler(request);
});
