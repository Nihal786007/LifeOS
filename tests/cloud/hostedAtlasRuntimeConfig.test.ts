import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveSupabasePublishableKey,
  type AtlasRuntimeEnvironment,
} from "../../supabase/functions/atlas-reason/runtimeConfig.ts";
import { createHostedRuntimeRegistration } from
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
