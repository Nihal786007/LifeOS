import {
  HOSTED_ATLAS_MAX_COMMENTARY_LENGTH,
  HOSTED_ATLAS_MAX_FACT_REFERENCES,
  HOSTED_ATLAS_MAX_LIMITATIONS,
  type HostedAtlasRequest,
} from "../../../../src/atlas/providers/hosted/contract.ts";
import { buildHostedAtlasPrompt } from "../prompt.ts";
import type {
  HostedModelAdapter,
  HostedModelAdapterResult,
} from "../providerRegistry.ts";

export const DEFAULT_GEMINI_ATLAS_MODEL = "gemini-3.8-flash";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

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
      maxLength: HOSTED_ATLAS_MAX_COMMENTARY_LENGTH,
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
      items: { type: "string", maxLength: 240 },
      description: "Honest evidence limitations; use an empty array when none apply.",
    },
  },
  required: ["commentary", "factReferences", "limitations"],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
      temperature: 0.2,
      maxOutputTokens: 512,
      responseFormat: {
        text: { mimeType: "application/json", schema: ATLAS_OUTPUT_SCHEMA },
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
        throw new Error(`Gemini request failed with HTTP ${response.status}.`);
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
