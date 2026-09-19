import type { HostedAtlasRequest } from
  "../../../../src/atlas/providers/hosted/contract.ts";
import { buildHostedAtlasPrompt } from "../prompt.ts";
import type {
  HostedModelAdapter,
  HostedModelAdapterResult,
} from "../providerRegistry.ts";
import {
  HostedProviderFailure,
  normalizeHostedProviderHttpFailure,
} from "../providerFailure.ts";

export const DEFAULT_MISTRAL_ATLAS_MODEL = "mistral-small-2603";
export const DEFAULT_MISTRAL_API_BASE_URL = "https://api.mistral.ai/v1";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface MistralAtlasAdapterOptions {
  apiKey: string;
  model?: string;
  apiBaseUrl?: string;
  fetchImpl?: FetchLike;
}

const ATLAS_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    commentary: { type: "string" },
    factReferences: { type: "array", items: { type: "string" } },
    limitations: { type: "array", items: { type: "string" } },
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

function validatedBaseUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("Mistral API base URL must be a credential-free HTTPS URL.");
  }
  return parsed.toString().replace(/\/$/, "");
}

function parseModelOutput(
  text: string
): Omit<HostedModelAdapterResult, "inputTokens" | "outputTokens"> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Mistral returned malformed structured output.");
  }
  if (!isRecord(parsed) || !hasExactKeys(parsed, [
    "commentary", "factReferences", "limitations",
  ]) || typeof parsed.commentary !== "string" ||
      !Array.isArray(parsed.factReferences) ||
      !parsed.factReferences.every((item) => typeof item === "string") ||
      !Array.isArray(parsed.limitations) ||
      !parsed.limitations.every((item) => typeof item === "string")) {
    throw new Error("Mistral returned an invalid ATLAS output shape.");
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

function boundedNonnegativeIntegerHeader(
  headers: Headers,
  name: string
): number | undefined {
  const value = headers.get(name)?.trim();
  if (!value || !/^(?:0|[1-9]\d{0,15})$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function responseText(value: unknown): { text: string; usage: unknown } {
  if (!isRecord(value) || !Array.isArray(value.choices) || value.choices.length !== 1) {
    throw new Error("Mistral returned no single ATLAS choice.");
  }
  const choice = value.choices[0];
  if (!isRecord(choice) || choice.finish_reason !== "stop" ||
      !isRecord(choice.message) || choice.message.role !== "assistant" ||
      typeof choice.message.content !== "string" ||
      choice.message.content.trim().length === 0 ||
      "tool_calls" in choice.message) {
    throw new Error("Mistral returned incomplete, empty, or tool-bearing ATLAS output.");
  }
  return { text: choice.message.content, usage: value.usage };
}

export function buildMistralAtlasRequest(request: HostedAtlasRequest, model: string) {
  const prompt = buildHostedAtlasPrompt(request);
  return {
    model,
    messages: [
      { role: "system", content: prompt.system },
      {
        role: "user",
        content: JSON.stringify({
          input: prompt.input,
          allowedFactReferences: prompt.allowedFactReferences,
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "atlas_response",
        description: "Bounded ATLAS commentary and references to supplied facts only.",
        schema: ATLAS_OUTPUT_SCHEMA,
        strict: true,
      },
    },
    max_tokens: 512,
    stream: false,
  };
}

export function createMistralAtlasAdapter(
  options: MistralAtlasAdapterOptions
): HostedModelAdapter {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error("Mistral API key is required.");
  const model = options.model?.trim() || DEFAULT_MISTRAL_ATLAS_MODEL;
  const apiBaseUrl = validatedBaseUrl(
    options.apiBaseUrl?.trim() || DEFAULT_MISTRAL_API_BASE_URL
  );
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    provider: "mistral",
    model,
    async generate(request, { signal }) {
      const response = await fetchImpl(`${apiBaseUrl}/chat/completions`, {
        method: "POST",
        signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildMistralAtlasRequest(request, model)),
      });
      if (!response.ok) {
        throw new HostedProviderFailure({
          provider: "mistral",
          upstreamHttpStatus: response.status,
          category: normalizeHostedProviderHttpFailure(response.status),
          rateLimitRemaining: boundedNonnegativeIntegerHeader(
            response.headers,
            "X-RateLimit-Remaining"
          ),
        });
      }
      const payload = await response.json();
      const generated = responseText(payload);
      const result = parseModelOutput(generated.text);
      const inputTokens = optionalUsage(generated.usage, "prompt_tokens");
      const outputTokens = optionalUsage(generated.usage, "completion_tokens");
      return {
        ...result,
        ...(inputTokens === undefined ? {} : { inputTokens }),
        ...(outputTokens === undefined ? {} : { outputTokens }),
      };
    },
  };
}
