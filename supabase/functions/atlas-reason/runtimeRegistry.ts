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

export type HostedDiagnosticProviderId = "qwen" | "gemini" | "unknown";

export interface HostedProviderSelectionDiagnostic {
  configuredProviderId: HostedDiagnosticProviderId;
  selectedProviderId: Exclude<HostedDiagnosticProviderId, "unknown"> | null;
  providerRegistered: boolean;
  qwenApiKeyPresent: boolean;
  qwenModelConfigured: boolean;
  qwenBaseUrlConfigured: boolean;
}

function normalized(environment: AtlasRuntimeEnvironment, name: string): string | undefined {
  const value = environment.get(name)?.trim();
  return value ? value : undefined;
}

function diagnosticProviderId(value: string | undefined): HostedDiagnosticProviderId {
  return value === "qwen" || value === "gemini" ? value : "unknown";
}

export function createHostedProviderSelectionDiagnostic(
  runtime: HostedRuntimeRegistration
): HostedProviderSelectionDiagnostic {
  const configuredProviderId = diagnosticProviderId(runtime.configuredProvider);
  const selectedProviderId = (() => {
    if (configuredProviderId === "unknown") return null;
    try {
      const resolved = runtime.registry.resolve(configuredProviderId).provider;
      return resolved === "qwen" || resolved === "gemini" ? resolved : null;
    } catch {
      return null;
    }
  })();
  return {
    configuredProviderId,
    selectedProviderId,
    providerRegistered: selectedProviderId !== null,
    qwenApiKeyPresent: runtime.diagnostics.qwenApiKeyPresent,
    qwenModelConfigured: runtime.diagnostics.qwenAtlasModelPresent,
    qwenBaseUrlConfigured: runtime.diagnostics.qwenApiBaseUrlPresent,
  };
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
