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
  OLLAMA_ATLAS_SYSTEM_PROMPT,
  createOllamaAtlasCitationTargets,
  createOllamaAtlasResponseSchema,
  serializeAtlasReasoningGrounding,
} from "./grounding.ts";

import type {
  OllamaAtlasCitationTarget,
} from "./grounding";

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

export const OLLAMA_ATLAS_CONTEXT_WINDOW =
  8_192 as const;

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
  value: unknown,
  targets: readonly OllamaAtlasCitationTarget[]
): AtlasAICitation {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "r",
      "e",
    ]) ||
    typeof value.r !== "string" ||
    typeof value.e !== "string"
  ) {
    throw new Error(
      "Local Ollama returned a malformed citation."
    );
  }

  const target = targets.find(
    (item) => item.token === value.r
  );

  if (!target) {
    throw new Error(
      "Local Ollama returned an unsupported citation reference."
    );
  }

  return {
    source: target.source,
    path: target.path,
    explanation: value.e,
  };
}

function parseModelResponse(
  content: string,
  citationTargets: readonly OllamaAtlasCitationTarget[]
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
      "s",
      "a",
      "c",
      "l",
    ]) ||
    (value.s !== "completed" &&
      value.s !== "insufficient-evidence" &&
      value.s !== "refused") ||
    typeof value.a !== "string" ||
    !Array.isArray(value.c) ||
    !Array.isArray(value.l) ||
    value.l.some(
      (item) => typeof item !== "string"
    )
  ) {
    throw new Error(
      "Local Ollama output does not match the ATLAS response schema."
    );
  }

  return {
    status: value.s,
    content: value.a,
    citations: value.c.map(
      (citation) =>
        parseCitation(citation, citationTargets)
    ),
    limitations:
      value.l as string[],
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
    const responseSchema =
      createOllamaAtlasResponseSchema(request);
    const citationTargets =
      createOllamaAtlasCitationTargets(request);
    const options = {
      temperature: 0 as const,
      seed: 0 as const,
      num_ctx: OLLAMA_ATLAS_CONTEXT_WINDOW,
      num_predict: this.config.numPredict,
    };

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
      format: responseSchema,
      options,
    };

    const rawResponse = await this.transport.send({
      url: `${this.config.baseUrl}/api/chat`,
      timeoutMs: this.config.timeoutMs,
      body,
    });

    const parsed = parseModelResponse(
      readAssistantContent(rawResponse),
      citationTargets
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
