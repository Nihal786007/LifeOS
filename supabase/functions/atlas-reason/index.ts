// Supabase Edge Function entrypoint. Provider adapters are intentionally not
// activated in the offline foundation checkpoint.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createAtlasReasonHandler } from "./handler.ts";
import { HostedModelAdapterRegistry } from "./providerRegistry.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
const configuredProvider = Deno.env.get("ATLAS_HOSTED_PROVIDER");
const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const handler = createAtlasReasonHandler({
  configuredProvider,
  registry: new HostedModelAdapterRegistry(),
  authenticate: async (accessToken) => {
    const { data, error } = await supabase.auth.getUser(accessToken);
    return error || !data.user ? null : { userId: data.user.id };
  },
});

Deno.serve(handler);
