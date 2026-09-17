// Supabase Edge Function entrypoint. Hosted adapters are registered only when
// their server-side credentials are present.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createAtlasReasonHandler } from "./handler.ts";
import { HostedModelAdapterRegistry } from "./providerRegistry.ts";
import { createGeminiAtlasAdapter } from "./adapters/gemini.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
const configuredProvider = Deno.env.get("ATLAS_HOSTED_PROVIDER");
const geminiApiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
const registry = new HostedModelAdapterRegistry();
if (geminiApiKey) {
  registry.register(createGeminiAtlasAdapter({
    apiKey: geminiApiKey,
    model: Deno.env.get("GEMINI_ATLAS_MODEL"),
  }));
}
const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const handler = createAtlasReasonHandler({
  configuredProvider,
  registry,
  authenticate: async (accessToken) => {
    const { data, error } = await supabase.auth.getUser(accessToken);
    return error || !data.user ? null : { userId: data.user.id };
  },
});

Deno.serve(handler);
