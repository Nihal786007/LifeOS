import {
  HOSTED_ATLAS_MAX_COMMENTARY_LENGTH,
  HOSTED_ATLAS_MAX_FACT_REFERENCES,
  HOSTED_ATLAS_MAX_LIMITATIONS,
  assertHostedAtlasRequest,
  assertHostedAtlasResponse,
} from "../../../src/atlas/providers/hosted/contract.ts";
import type { HostedAtlasRequest } from "../../../src/atlas/providers/hosted/contract.ts";
import {
  HostedModelAdapterRegistry,
  buildHostedAtlasResponse,
} from "./providerRegistry.ts";
import { isHostedProviderFailure } from "./providerFailure.ts";
import type { HostedProviderSelectionDiagnostic } from "./runtimeRegistry.ts";

export interface AtlasReasonHandlerDependencies {
  authenticate(accessToken: string): Promise<{ userId: string } | null>;
  registry: HostedModelAdapterRegistry;
  configuredProvider: string | undefined;
  providerSelectionDiagnostic?: HostedProviderSelectionDiagnostic;
  timeoutMs?: number;
  now?: () => number;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("Authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
}

function validateAdapterOutput(
  request: HostedAtlasRequest,
  commentary: string,
  factReferences: readonly string[],
  limitations: readonly string[]
): void {
  if (commentary.length > HOSTED_ATLAS_MAX_COMMENTARY_LENGTH ||
      factReferences.length > HOSTED_ATLAS_MAX_FACT_REFERENCES ||
      limitations.length > HOSTED_ATLAS_MAX_LIMITATIONS) {
    throw new Error("Hosted model output exceeds ATLAS response bounds.");
  }
  const allowed = new Set(request.factCore.facts.map((fact) => fact.ref));
  if (factReferences.some((ref) => !allowed.has(ref))) {
    throw new Error("Hosted model returned an unknown fact reference.");
  }
  if (commentary.trim().length === 0 || !/[A-Za-z0-9]/.test(commentary)) {
    throw new Error("Hosted model returned empty or meaningless commentary.");
  }
}

export function createAtlasReasonHandler(dependencies: AtlasReasonHandlerDependencies) {
  const timeoutMs = dependencies.timeoutMs ?? 25_000;
  const now = dependencies.now ?? Date.now;
  return async (request: Request): Promise<Response> => {
    const diagnosticRequested = request.method === "GET" &&
      new URL(request.url).searchParams.get("diagnostic") === "provider-selection";
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      });
    }
    if (request.method !== "POST" && !diagnosticRequested) {
      return json(405, { error: "method_not_allowed" });
    }
    const token = bearerToken(request);
    if (!token) return json(401, { error: "authentication_required" });
    const identity = await dependencies.authenticate(token);
    if (!identity?.userId) return json(401, { error: "invalid_or_expired_token" });
    if (diagnosticRequested) {
      return dependencies.providerSelectionDiagnostic
        ? json(200, dependencies.providerSelectionDiagnostic)
        : json(503, { error: "provider_diagnostic_unavailable" });
    }
    if (!dependencies.configuredProvider) {
      return json(503, { error: "hosted_provider_not_configured" });
    }
    let payload: unknown;
    try {
      payload = await request.json();
      assertHostedAtlasRequest(payload);
    } catch (failure) {
      return json(400, {
        error: "invalid_request",
        message: failure instanceof Error ? failure.message : "Invalid request.",
      });
    }
    const adapter = (() => {
      try {
        return dependencies.registry.resolve(dependencies.configuredProvider as string);
      } catch {
        return undefined;
      }
    })();
    if (!adapter) return json(503, { error: "hosted_provider_unavailable" });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = now();
    try {
      const providerCall = adapter.generate(payload, {
          signal: controller.signal,
          authenticatedUserId: identity.userId,
        });
      const timeout = new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () =>
          reject(new Error("Hosted provider timeout.")), { once: true });
      });
      const result = await Promise.race([providerCall, timeout]);
      validateAdapterOutput(payload, result.commentary, result.factReferences, result.limitations);
      const response = buildHostedAtlasResponse(payload, adapter, result, Math.max(0, now() - startedAt));
      assertHostedAtlasResponse(response);
      return json(200, response);
    } catch (failure) {
      const timedOut = controller.signal.aborted;
      if (timedOut) {
        return json(504, {
          error: "provider_timeout",
          provider: adapter.provider,
          category: "timeout",
          message: "Hosted provider timed out.",
        });
      }
      if (isHostedProviderFailure(failure)) {
        return json(502, {
          error: "provider_failure",
          provider: failure.provider,
          ...(failure.upstreamHttpStatus === undefined
            ? {} : { upstreamStatus: failure.upstreamHttpStatus }),
          category: failure.category,
          ...(failure.googleStatus === undefined
            ? {} : { googleStatus: failure.googleStatus }),
          ...(failure.reason === undefined ? {} : { reason: failure.reason }),
          ...(failure.fieldViolationPaths === undefined
            ? {} : { fieldViolationPaths: [...failure.fieldViolationPaths] }),
        });
      }
      return json(502, {
        error: "provider_failure",
        provider: adapter.provider,
        category: "unknown_provider_failure",
        message: "Hosted provider failed safely.",
      });
    } finally {
      clearTimeout(timer);
    }
  };
}
