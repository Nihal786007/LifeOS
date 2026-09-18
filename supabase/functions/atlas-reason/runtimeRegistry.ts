import { createGeminiAtlasAdapter } from "./adapters/gemini.ts";
import { createQwenAtlasAdapter } from "./adapters/qwen.ts";
import { HostedModelAdapterRegistry } from "./providerRegistry.ts";
import type { AtlasRuntimeEnvironment } from "./runtimeConfig.ts";

export interface HostedRuntimeDiagnostics {
  geminiApiKeyPresent: boolean;
  atlasHostedProviderPresent: boolean;
  geminiAtlasModelPresent: boolean;
  geminiAdapterRegistered: boolean;
  qwenApiKeyPresent: boolean;
  qwenAtlasModelPresent: boolean;
  qwenApiBaseUrlPresent: boolean;
  qwenAdapterRegistered: boolean;
}

export interface HostedRuntimeRegistration {
  configuredProvider: string | undefined;
  registry: HostedModelAdapterRegistry;
  diagnostics: HostedRuntimeDiagnostics;
}

function normalized(environment: AtlasRuntimeEnvironment, name: string): string | undefined {
  const value = environment.get(name)?.trim();
  return value ? value : undefined;
}

export function createHostedRuntimeRegistration(
  environment: AtlasRuntimeEnvironment
): HostedRuntimeRegistration {
  const configuredProvider = normalized(environment, "ATLAS_HOSTED_PROVIDER")
    ?.toLowerCase();
  const geminiApiKey = normalized(environment, "GEMINI_API_KEY");
  const geminiModel = normalized(environment, "GEMINI_ATLAS_MODEL");
  const qwenApiKey = normalized(environment, "QWEN_API_KEY");
  const qwenModel = normalized(environment, "QWEN_ATLAS_MODEL");
  const qwenApiBaseUrl = normalized(environment, "QWEN_ATLAS_BASE_URL");
  const registry = new HostedModelAdapterRegistry();
  if (geminiApiKey) {
    registry.register(createGeminiAtlasAdapter({
      apiKey: geminiApiKey,
      model: geminiModel,
    }));
  }
  if (qwenApiKey) {
    registry.register(createQwenAtlasAdapter({
      apiKey: qwenApiKey,
      model: qwenModel,
      apiBaseUrl: qwenApiBaseUrl,
    }));
  }
  return {
    configuredProvider,
    registry,
    diagnostics: {
      geminiApiKeyPresent: geminiApiKey !== undefined,
      atlasHostedProviderPresent: configuredProvider !== undefined,
      geminiAtlasModelPresent: geminiModel !== undefined,
      geminiAdapterRegistered: geminiApiKey !== undefined,
      qwenApiKeyPresent: qwenApiKey !== undefined,
      qwenAtlasModelPresent: qwenModel !== undefined,
      qwenApiBaseUrlPresent: qwenApiBaseUrl !== undefined,
      qwenAdapterRegistered: qwenApiKey !== undefined,
    },
  };
}
