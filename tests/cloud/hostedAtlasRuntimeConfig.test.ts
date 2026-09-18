import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveSupabasePublishableKey,
  type AtlasRuntimeEnvironment,
} from "../../supabase/functions/atlas-reason/runtimeConfig.ts";

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
