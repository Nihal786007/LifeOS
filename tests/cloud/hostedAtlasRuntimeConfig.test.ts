import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveSupabasePublishableKey,
  type AtlasRuntimeEnvironment,
} from "../../supabase/functions/atlas-reason/runtimeConfig.ts";
import {
  createHostedProviderSelectionDiagnostic,
  createHostedRuntimeRegistration,
} from
  "../../supabase/functions/atlas-reason/runtimeRegistry.ts";

function environment(values: Record<string, string | undefined>): AtlasRuntimeEnvironment {
  return { get: (name) => values[name] };
}

const sanitizedError = /configuration is unavailable or invalid/;

test("resolves the default key from the hosted JSON map", () => {
  const result = resolveSupabasePublishableKey(environment({
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: "hosted-key" }),
    SUPABASE_PUBLISHABLE_KEY: "local-key",
  }));
  assert.equal(result, "hosted-key");
});

test("uses the single-value key only when the hosted map is absent", () => {
  const result = resolveSupabasePublishableKey(environment({
    SUPABASE_PUBLISHABLE_KEY: " local-key ",
  }));
  assert.equal(result, "local-key");
});

test("fails closed for malformed hosted JSON without revealing its value or falling back", () => {
  const malformed = "{private-key-material";
  assert.throws(() => resolveSupabasePublishableKey(environment({
    SUPABASE_PUBLISHABLE_KEYS: malformed,
    SUPABASE_PUBLISHABLE_KEY: "must-not-fallback",
  })), (failure: unknown) => failure instanceof Error &&
    sanitizedError.test(failure.message) && !failure.message.includes(malformed));
});

test("fails closed when the hosted map has no default entry", () => {
  assert.throws(() => resolveSupabasePublishableKey(environment({
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ alternate: "key" }),
    SUPABASE_PUBLISHABLE_KEY: "must-not-fallback",
  })), sanitizedError);
});

test("fails closed when the hosted default entry is empty", () => {
  assert.throws(() => resolveSupabasePublishableKey(environment({
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: "   " }),
    SUPABASE_PUBLISHABLE_KEY: "must-not-fallback",
  })), sanitizedError);
});

test("fails closed when hosted and local configurations are both missing", () => {
  assert.throws(() => resolveSupabasePublishableKey(environment({})), sanitizedError);
});

test("registers Gemini from normalized request-time hosted configuration", () => {
  const runtime = createHostedRuntimeRegistration(environment({
    ATLAS_HOSTED_PROVIDER: " Gemini ",
    GEMINI_API_KEY: " server-only-key ",
    GEMINI_ATLAS_MODEL: " gemini-3.8-flash ",
  }));
  assert.equal(runtime.configuredProvider, "gemini");
  assert.equal(runtime.registry.resolve("gemini").model, "gemini-3.8-flash");
  assert.deepEqual(runtime.diagnostics, {
    geminiApiKeyPresent: true,
    atlasHostedProviderPresent: true,
    geminiAtlasModelPresent: true,
    geminiAdapterRegistered: true,
    qwenApiKeyPresent: false,
    qwenAtlasModelPresent: false,
    qwenApiBaseUrlPresent: false,
    qwenAdapterRegistered: false,
    mistralApiKeyPresent: false,
    mistralAtlasModelPresent: false,
    mistralApiBaseUrlPresent: false,
    mistralAdapterRegistered: false,
  });
});

test("reports safe booleans and leaves Gemini unavailable when its key is absent", () => {
  const runtime = createHostedRuntimeRegistration(environment({
    ATLAS_HOSTED_PROVIDER: "gemini",
    GEMINI_ATLAS_MODEL: "gemini-3.8-flash",
  }));
  assert.deepEqual(runtime.diagnostics, {
    geminiApiKeyPresent: false,
    atlasHostedProviderPresent: true,
    geminiAtlasModelPresent: true,
    geminiAdapterRegistered: false,
    qwenApiKeyPresent: false,
    qwenAtlasModelPresent: false,
    qwenApiBaseUrlPresent: false,
    qwenAdapterRegistered: false,
    mistralApiKeyPresent: false,
    mistralAtlasModelPresent: false,
    mistralApiBaseUrlPresent: false,
    mistralAdapterRegistered: false,
  });
  assert.throws(() => runtime.registry.resolve("gemini"), /not configured/);
});

test("does not expose configuration values through runtime diagnostics", () => {
  const secret = "must-never-appear-in-diagnostics";
  const runtime = createHostedRuntimeRegistration(environment({
    ATLAS_HOSTED_PROVIDER: "gemini",
    GEMINI_API_KEY: secret,
    GEMINI_ATLAS_MODEL: "gemini-3.8-flash",
  }));
  assert.equal(JSON.stringify(runtime.diagnostics).includes(secret), false);
});

test("registers Qwen only from normalized server-side configuration", () => {
  const runtime = createHostedRuntimeRegistration(environment({
    ATLAS_HOSTED_PROVIDER: " QWEN ",
    QWEN_API_KEY: " server-only-qwen-key ",
    QWEN_ATLAS_MODEL: " qwen3.7-plus-2026-05-26 ",
    QWEN_ATLAS_BASE_URL: " https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1 ",
  }));
  assert.equal(runtime.configuredProvider, "qwen");
  assert.equal(runtime.registry.resolve("qwen").model, "qwen3.7-plus-2026-05-26");
  assert.deepEqual(runtime.diagnostics, {
    geminiApiKeyPresent: false,
    atlasHostedProviderPresent: true,
    geminiAtlasModelPresent: false,
    geminiAdapterRegistered: false,
    qwenApiKeyPresent: true,
    qwenAtlasModelPresent: true,
    qwenApiBaseUrlPresent: true,
    qwenAdapterRegistered: true,
    mistralApiKeyPresent: false,
    mistralAtlasModelPresent: false,
    mistralApiBaseUrlPresent: false,
    mistralAdapterRegistered: false,
  });
  assert.equal(JSON.stringify(runtime.diagnostics).includes("server-only-qwen-key"), false);
  assert.deepEqual(createHostedProviderSelectionDiagnostic(runtime), {
    configuredProviderId: "qwen",
    selectedProviderId: "qwen",
    providerRegistered: true,
    qwenApiKeyPresent: true,
    qwenModelConfigured: true,
    qwenBaseUrlConfigured: true,
    mistralApiKeyPresent: false,
    mistralModelConfigured: false,
    mistralBaseUrlConfigured: false,
  });
});

test("reports Qwen as unavailable without exposing missing or configured values", () => {
  const runtime = createHostedRuntimeRegistration(environment({
    ATLAS_HOSTED_PROVIDER: "qwen",
    QWEN_ATLAS_MODEL: "qwen3.7-plus-2026-05-26",
    QWEN_ATLAS_BASE_URL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  }));
  assert.deepEqual(createHostedProviderSelectionDiagnostic(runtime), {
    configuredProviderId: "qwen",
    selectedProviderId: null,
    providerRegistered: false,
    qwenApiKeyPresent: false,
    qwenModelConfigured: true,
    qwenBaseUrlConfigured: true,
    mistralApiKeyPresent: false,
    mistralModelConfigured: false,
    mistralBaseUrlConfigured: false,
  });
});

test("keeps Gemini selection unchanged and fails closed for unsupported providers", () => {
  const gemini = createHostedRuntimeRegistration(environment({
    ATLAS_HOSTED_PROVIDER: "gemini",
    GEMINI_API_KEY: "server-only-gemini-key",
  }));
  assert.deepEqual(createHostedProviderSelectionDiagnostic(gemini), {
    configuredProviderId: "gemini",
    selectedProviderId: "gemini",
    providerRegistered: true,
    qwenApiKeyPresent: false,
    qwenModelConfigured: false,
    qwenBaseUrlConfigured: false,
    mistralApiKeyPresent: false,
    mistralModelConfigured: false,
    mistralBaseUrlConfigured: false,
  });

  const unsupportedValue = "private-provider-value";
  const unsupported = createHostedRuntimeRegistration(environment({
    ATLAS_HOSTED_PROVIDER: unsupportedValue,
  }));
  const diagnostic = createHostedProviderSelectionDiagnostic(unsupported);
  assert.deepEqual(diagnostic, {
    configuredProviderId: "unknown",
    selectedProviderId: null,
    providerRegistered: false,
    qwenApiKeyPresent: false,
    qwenModelConfigured: false,
    qwenBaseUrlConfigured: false,
    mistralApiKeyPresent: false,
    mistralModelConfigured: false,
    mistralBaseUrlConfigured: false,
  });
  assert.equal(JSON.stringify(diagnostic).includes(unsupportedValue), false);
});

test("registers Mistral only from normalized server-side configuration", () => {
  const runtime = createHostedRuntimeRegistration(environment({
    ATLAS_HOSTED_PROVIDER: " MISTRAL ",
    MISTRAL_API_KEY: " server-only-mistral-key ",
    MISTRAL_ATLAS_MODEL: " mistral-small-2603 ",
    MISTRAL_ATLAS_BASE_URL: " https://api.mistral.ai/v1 ",
  }));
  assert.equal(runtime.configuredProvider, "mistral");
  assert.equal(runtime.registry.resolve("mistral").model, "mistral-small-2603");
  assert.equal(runtime.diagnostics.mistralApiKeyPresent, true);
  assert.equal(runtime.diagnostics.mistralAtlasModelPresent, true);
  assert.equal(runtime.diagnostics.mistralApiBaseUrlPresent, true);
  assert.equal(runtime.diagnostics.mistralAdapterRegistered, true);
  assert.deepEqual(createHostedProviderSelectionDiagnostic(runtime), {
    configuredProviderId: "mistral",
    selectedProviderId: "mistral",
    providerRegistered: true,
    qwenApiKeyPresent: false,
    qwenModelConfigured: false,
    qwenBaseUrlConfigured: false,
    mistralApiKeyPresent: true,
    mistralModelConfigured: true,
    mistralBaseUrlConfigured: true,
  });
  assert.equal(JSON.stringify(runtime.diagnostics).includes("server-only-mistral-key"), false);
});

test("reports Mistral as unavailable when its server-side key is missing", () => {
  const runtime = createHostedRuntimeRegistration(environment({
    ATLAS_HOSTED_PROVIDER: "mistral",
    MISTRAL_ATLAS_MODEL: "mistral-small-2603",
    MISTRAL_ATLAS_BASE_URL: "https://api.mistral.ai/v1",
  }));
  assert.deepEqual(createHostedProviderSelectionDiagnostic(runtime), {
    configuredProviderId: "mistral",
    selectedProviderId: null,
    providerRegistered: false,
    qwenApiKeyPresent: false,
    qwenModelConfigured: false,
    qwenBaseUrlConfigured: false,
    mistralApiKeyPresent: false,
    mistralModelConfigured: true,
    mistralBaseUrlConfigured: true,
  });
});
