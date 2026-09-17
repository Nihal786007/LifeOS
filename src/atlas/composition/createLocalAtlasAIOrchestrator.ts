// ==========================================
// LifeOS ATLAS Local Provider Composition
// ==========================================
//
// This is the only production composition point
// that knows the current provider implementation.
// Presentational components and controller hooks
// depend only on AtlasAIOrchestrator.
// ==========================================

import {
  AtlasAIOrchestrator,
} from "../orchestration/AtlasAIOrchestrator.ts";

import {
  OllamaAtlasProvider,
} from "../providers/ollama/ollamaAtlasProvider.ts";
import { supabaseClient } from "../../auth/supabaseClient.ts";
import { HostedAtlasProvider } from "../providers/hosted/hostedAtlasProvider.ts";
import { SupabaseHostedAtlasTransport } from "../providers/hosted/transport.ts";
import {
  AtlasProviderRegistry,
  resolveAtlasProviderId,
} from "../providers/registry.ts";
import type { AtlasAIProvider } from "../reasoning/atlasAIProvider";

export interface AtlasProviderCompositionOptions {
  selection?: string;
  localProvider?: AtlasAIProvider;
  hostedProvider?: AtlasAIProvider;
}

export function createLocalAtlasAIOrchestrator():
  AtlasAIOrchestrator {
  return new AtlasAIOrchestrator(
    new OllamaAtlasProvider()
  );
}

export function createAtlasAIOrchestrator(
  options: AtlasProviderCompositionOptions = {}
): AtlasAIOrchestrator {
  const registry = new AtlasProviderRegistry().register(
    options.localProvider ?? new OllamaAtlasProvider()
  );
  const hostedProvider = options.hostedProvider ?? (supabaseClient
    ? new HostedAtlasProvider({
        transport: new SupabaseHostedAtlasTransport({
          client: supabaseClient,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        }),
      })
    : undefined);
  if (hostedProvider) registry.register(hostedProvider);
  const selection = resolveAtlasProviderId(
    options.selection ?? import.meta.env.VITE_ATLAS_PROVIDER
  );
  return new AtlasAIOrchestrator(registry.resolve(selection));
}
