// ==========================================
// LifeOS ATLAS Local Ollama AI Provider
// ==========================================

import {
  ATLAS_AI_RESPONSE_VERSION,
} from "../../reasoning/atlasAIProvider.ts";

import type {
  AtlasAICitation,
  AtlasAIProvider,
  AtlasAIProviderDescriptor,
  AtlasAIRequest,
  AtlasAIResponse,
  AtlasAIResponseStatus,
} from "../../reasoning/atlasAIProvider";

import {
  resolveOllamaAtlasProviderConfig,
} from "./config.ts";

import type {
  OllamaAtlasProviderConfig,
  OllamaAtlasProviderConfigInput,
} from "./config";

import {
  OLLAMA_ATLAS_RESPONSE_SCHEMA,
  OLLAMA_ATLAS_SYSTEM_PROMPT,
  serializeAtlasReasoningGrounding,
} from "./grounding.ts";

import {
  FetchOllamaTransport,
} from "./ollamaTransport.ts";

import type {
  OllamaChatRequestBody,
  OllamaTransport,
} from "./types";

export const OLLAMA_ATLAS_PROVIDER_DESCRIPTOR:
  AtlasAIProviderDescriptor = {
    id: "ollama-local",
    displayName: "Local Ollama",
    kind: "local",
  };

interface OllamaAtlasModelResponse {
  status: AtlasAIResponseStatus;
  content: string;
  citations: readonly AtlasAICitation[];
  limitations: readonly string[];
}

export interface OllamaAtlasProviderOptions {
  config?: OllamaAtlasProviderConfigInput;
  transport?: OllamaTransport;
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[]
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return (
    actual.length === expected.length &&
    actual.every(
      (key, index) => key === expected[index]
    )
  );
}

function readAssistantContent(
  response: unknown
): string {
  if (!isRecord(response) || !isRecord(response.message)) {
    throw new Error(
      "Local Ollama returned a malformed chat response."
    );
  }

  if (
    "tool_calls" in response.message &&
    Array.isArray(response.message.tool_calls) &&
    response.message.tool_calls.length > 0
  ) {
    throw new Error(
      "Local Ollama attempted an unsupported tool call."
    );
  }

  if (typeof response.message.content !== "string") {
    throw new Error(
      "Local Ollama response is missing assistant content."
    );
  }

  return response.message.content;
}

function parseCitation(
  value: unknown
): AtlasAICitation {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "source",
      "path",
      "explanation",
    ]) ||
    typeof value.source !== "string" ||
    typeof value.path !== "string" ||
    typeof value.explanation !== "string"
  ) {
    throw new Error(
      "Local Ollama returned a malformed citation."
    );
  }

  return {
    source:
      value.source as AtlasAICitation["source"],
    path: value.path,
    explanation: value.explanation,
  };
}

function parseModelResponse(
  content: string
): OllamaAtlasModelResponse | undefined {
  if (content.trim().length === 0) {
    return undefined;
  }

  let value: unknown;

  try {
    value = JSON.parse(content);
  } catch {
    throw new Error(
      "Local Ollama returned malformed structured output."
    );
  }

  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "status",
      "content",
      "citations",
      "limitations",
    ]) ||
    (value.status !== "completed" &&
      value.status !== "insufficient-evidence" &&
      value.status !== "refused") ||
    typeof value.content !== "string" ||
    !Array.isArray(value.citations) ||
    !Array.isArray(value.limitations) ||
    value.limitations.some(
      (item) => typeof item !== "string"
    )
  ) {
    throw new Error(
      "Local Ollama output does not match the ATLAS response schema."
    );
  }

  return {
    status: value.status,
    content: value.content,
    citations: value.citations.map(parseCitation),
    limitations:
      value.limitations as string[],
  };
}

function mergeLimitations(
  request: AtlasAIRequest,
  providerLimitations: readonly string[]
): string[] {
  const limitations = request.context.limitations.map(
    (item) => item.reason
  );

  providerLimitations.forEach((item) => {
    if (
      item.trim().length > 0 &&
      !limitations.includes(item)
    ) {
      limitations.push(item);
    }
  });

  return limitations;
}

export class OllamaAtlasProvider
implements AtlasAIProvider {
  readonly descriptor =
    OLLAMA_ATLAS_PROVIDER_DESCRIPTOR;

  readonly config: OllamaAtlasProviderConfig;

  private readonly transport: OllamaTransport;

  constructor(
    options: OllamaAtlasProviderOptions = {}
  ) {
    this.config = resolveOllamaAtlasProviderConfig(
      options.config
    );
    this.transport =
      options.transport ??
      new FetchOllamaTransport();
  }

  async reason(
    request: AtlasAIRequest
  ): Promise<AtlasAIResponse> {
    const body: OllamaChatRequestBody = {
      model: this.config.model,
      messages: [
        {
          role: "system",
          content: OLLAMA_ATLAS_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content:
            serializeAtlasReasoningGrounding(
              request
            ),
        },
      ],
      stream: false,
      think: false,
      format: OLLAMA_ATLAS_RESPONSE_SCHEMA,
      options: {
        temperature: 0,
        seed: 0,
      },
    };

    const rawResponse = await this.transport.send({
      url: `${this.config.baseUrl}/api/chat`,
      timeoutMs: this.config.timeoutMs,
      body,
    });

    const parsed = parseModelResponse(
      readAssistantContent(rawResponse)
    );

    if (!parsed) {
      return {
        version: ATLAS_AI_RESPONSE_VERSION,
        requestId: request.requestId,
        providerId: this.descriptor.id,
        status: "insufficient-evidence",
        content: "",
        citations: [],
        limitations: mergeLimitations(
          request,
          []
        ),
      };
    }

    return {
      version: ATLAS_AI_RESPONSE_VERSION,
      requestId: request.requestId,
      providerId: this.descriptor.id,
      status: parsed.status,
      content: parsed.content,
      citations: parsed.citations,
      limitations: mergeLimitations(
        request,
        parsed.limitations
      ),
    };
  }
}
