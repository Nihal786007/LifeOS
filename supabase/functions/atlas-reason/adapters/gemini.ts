import {
  HOSTED_ATLAS_MAX_FACT_REFERENCES,
  HOSTED_ATLAS_MAX_LIMITATIONS,
  type HostedAtlasRequest,
} from "../../../../src/atlas/providers/hosted/contract.ts";
import { buildHostedAtlasPrompt } from "../prompt.ts";
import type {
  HostedModelAdapter,
  HostedModelAdapterResult,
} from "../providerRegistry.ts";
import {
  HostedProviderFailure,
  normalizeHostedProviderHttpFailure,
} from "../providerFailure.ts";

export const DEFAULT_GEMINI_ATLAS_MODEL = "gemini-3.8-flash";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MAX_GOOGLE_ERROR_BODY_LENGTH = 16_384;
const MAX_GOOGLE_FIELD_VIOLATIONS = 5;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface GeminiAtlasAdapterOptions {
  apiKey: string;
  model?: string;
  apiBaseUrl?: string;
  fetchImpl?: FetchLike;
}

const ATLAS_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    commentary: {
      type: "string",
      description: "Concise grounded commentary that does not repeat the deterministic answer.",
    },
    factReferences: {
      type: "array",
      maxItems: HOSTED_ATLAS_MAX_FACT_REFERENCES,
      items: { type: "string" },
      description: "Only reference tokens supplied in allowedFactReferences.",
    },
    limitations: {
      type: "array",
      maxItems: HOSTED_ATLAS_MAX_LIMITATIONS,
      items: { type: "string" },
      description: "Honest evidence limitations; use an empty array when none apply.",
    },
  },
  required: ["commentary", "factReferences", "limitations"],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface GoogleErrorMetadata {
  googleStatus?: string;
  reason?: string;
  fieldViolationPaths?: readonly string[];
}

function safeMachineIdentifier(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return /^[A-Z][A-Z0-9_]{0,62}$/.test(normalized) ? normalized : undefined;
}

function safeFieldPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 160) return undefined;
  return /^[A-Za-z][A-Za-z0-9_]*(?:\[\d+\])?(?:\.[A-Za-z][A-Za-z0-9_]*(?:\[\d+\])?)*$/.test(normalized)
    ? normalized : undefined;
}

export function extractGoogleErrorMetadata(value: unknown): GoogleErrorMetadata {
  if (!isRecord(value) || !isRecord(value.error)) return {};
  const error = value.error;
  const googleStatus = safeMachineIdentifier(error.status);
  let reason: string | undefined;
  const fieldViolationPaths: string[] = [];
  if (Array.isArray(error.details)) {
    for (const detail of error.details) {
      if (!isRecord(detail)) continue;
      const detailType = detail["@type"];
      if (detailType === "type.googleapis.com/google.rpc.ErrorInfo" && reason === undefined) {
        reason = safeMachineIdentifier(detail.reason);
      }
      if (detailType !== "type.googleapis.com/google.rpc.BadRequest" ||
          !Array.isArray(detail.fieldViolations)) continue;
      for (const violation of detail.fieldViolations) {
        if (!isRecord(violation)) continue;
        if (reason === undefined) reason = safeMachineIdentifier(violation.reason);
        const field = safeFieldPath(violation.field);
        if (field !== undefined && !fieldViolationPaths.includes(field) &&
            fieldViolationPaths.length < MAX_GOOGLE_FIELD_VIOLATIONS) {
          fieldViolationPaths.push(field);
        }
      }
    }
  }
  return {
    ...(googleStatus === undefined ? {} : { googleStatus }),
    ...(reason === undefined ? {} : { reason }),
    ...(fieldViolationPaths.length === 0 ? {} : { fieldViolationPaths }),
  };
}

async function readGoogleErrorMetadata(response: Response): Promise<GoogleErrorMetadata> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) return {};
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_GOOGLE_ERROR_BODY_LENGTH) return {};
  try {
    const body = await response.text();
    if (body.length > MAX_GOOGLE_ERROR_BODY_LENGTH) return {};
    return extractGoogleErrorMetadata(JSON.parse(body));
  } catch {
    return {};
  }
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  return actual.length === required.length &&
    actual.every((key, index) => key === required[index]);
}

function parseModelOutput(text: string): Omit<HostedModelAdapterResult, "inputTokens" | "outputTokens"> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned malformed structured output.");
  }
  if (!isRecord(parsed) || !hasExactKeys(parsed, [
    "commentary", "factReferences", "limitations",
  ]) || typeof parsed.commentary !== "string" ||
      !Array.isArray(parsed.factReferences) ||
      !parsed.factReferences.every((item) => typeof item === "string") ||
      !Array.isArray(parsed.limitations) ||
      !parsed.limitations.every((item) => typeof item === "string")) {
    throw new Error("Gemini returned an invalid ATLAS output shape.");
  }
  return {
    commentary: parsed.commentary,
    factReferences: parsed.factReferences as string[],
    limitations: parsed.limitations as string[],
  };
}

function optionalUsage(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) return undefined;
  const item = value[key];
  return typeof item === "number" && Number.isFinite(item) && item >= 0
    ? item : undefined;
}

function responseText(value: unknown): { text: string; usage: unknown } {
  if (!isRecord(value) || !Array.isArray(value.candidates) || value.candidates.length !== 1) {
    throw new Error("Gemini returned no single ATLAS candidate.");
  }
  const candidate = value.candidates[0];
  if (!isRecord(candidate) || candidate.finishReason !== "STOP" ||
      !isRecord(candidate.content) || !Array.isArray(candidate.content.parts) ||
      candidate.content.parts.length !== 1 || !isRecord(candidate.content.parts[0]) ||
      typeof candidate.content.parts[0].text !== "string" ||
      candidate.content.parts[0].text.trim().length === 0) {
    throw new Error("Gemini returned incomplete or empty ATLAS output.");
  }
  return { text: candidate.content.parts[0].text, usage: value.usageMetadata };
}

export function buildGeminiAtlasRequest(request: HostedAtlasRequest) {
  const prompt = buildHostedAtlasPrompt(request);
  return {
    systemInstruction: { parts: [{ text: prompt.system }] },
    contents: [{
      role: "user",
      parts: [{ text: JSON.stringify({
        input: prompt.input,
        allowedFactReferences: prompt.allowedFactReferences,
      }) }],
    }],
    generationConfig: {
      maxOutputTokens: 512,
      responseFormat: {
        text: { mimeType: "APPLICATION_JSON", schema: ATLAS_OUTPUT_SCHEMA },
      },
    },
  };
}

export function createGeminiAtlasAdapter(
  options: GeminiAtlasAdapterOptions
): HostedModelAdapter {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error("Gemini API key is required.");
  const model = options.model?.trim() || DEFAULT_GEMINI_ATLAS_MODEL;
  const apiBaseUrl = (options.apiBaseUrl ?? GEMINI_API_BASE_URL).replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    provider: "gemini",
    model,
    async generate(request, { signal }) {
      const response = await fetchImpl(
        `${apiBaseUrl}/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(buildGeminiAtlasRequest(request)),
        }
      );
      if (!response.ok) {
        const metadata = await readGoogleErrorMetadata(response);
        throw new HostedProviderFailure({
          provider: "gemini",
          upstreamHttpStatus: response.status,
          category: normalizeHostedProviderHttpFailure(response.status),
          ...metadata,
        });
      }
      const payload = await response.json();
      const generated = responseText(payload);
      const result = parseModelOutput(generated.text);
      const inputTokens = optionalUsage(generated.usage, "promptTokenCount");
      const outputTokens = optionalUsage(generated.usage, "candidatesTokenCount");
      return {
        ...result,
        ...(inputTokens === undefined ? {} : { inputTokens }),
        ...(outputTokens === undefined ? {} : { outputTokens }),
      };
    },
  };
}
