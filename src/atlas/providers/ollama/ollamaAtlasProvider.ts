// ==========================================
// LifeOS ATLAS Local Ollama AI Provider
// ==========================================

import {
  ATLAS_AI_RESPONSE_VERSION,
} from "../../reasoning/atlasAIProvider.ts";

import type {
  AtlasAIProvider,
  AtlasAIProviderDescriptor,
  AtlasAIRequest,
  AtlasAIResponse,
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
  assertOllamaAtlasPromptBudget,
  createOllamaAtlasResponseSchema,
  serializeAtlasReasoningGrounding,
} from "./grounding.ts";

import {
  buildOllamaAtlasFactCore,
} from "./factCore.ts";

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
  commentary: string;
  factReferences: readonly string[];
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

function parseModelResponse(
  content: string,
  allowedFactReferences: ReadonlySet<string>
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
      "x",
      "r",
      "l",
    ]) ||
    typeof value.x !== "string" ||
    !Array.isArray(value.r) ||
    value.r.some((item) => typeof item !== "string") ||
    !Array.isArray(value.l) ||
    value.l.some(
      (item) => typeof item !== "string"
    )
  ) {
    throw new Error(
      "Local Ollama output does not match the ATLAS response schema."
    );
  }

  const unknownReference = value.r.find(
    (item) => !allowedFactReferences.has(item as string)
  );
  if (unknownReference) {
    throw new Error(
      "Local Ollama returned an unsupported fact reference."
    );
  }

  const commentary = value.x.trim();
  if (
    commentary.length > 0 &&
    (!/[A-Za-z0-9]/.test(commentary) ||
      /^(?:c|f)\d+$/i.test(commentary) ||
      /(?:answer trusted|aggregate task counts|relevant trusted evidence|question relevance|citation tokens|return (?:compact )?json|add only brief non-factual commentary)/i.test(commentary))
  ) {
    throw new Error(
      "Local Ollama returned meaningless or copied commentary."
    );
  }

  return {
    commentary,
    factReferences: value.r as string[],
    limitations: value.l as string[],
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
    const factCore = buildOllamaAtlasFactCore(request);
    const responseSchema =
      createOllamaAtlasResponseSchema(request, factCore);
    const grounding = serializeAtlasReasoningGrounding(
      request,
      factCore
    );
    assertOllamaAtlasPromptBudget(
      OLLAMA_ATLAS_SYSTEM_PROMPT,
      grounding
    );
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
          content: grounding,
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
      new Set(factCore.facts.map((fact) => fact.ref))
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
      status: factCore.status,
      content: [
        factCore.factualAnswer,
        parsed.commentary,
      ].filter(Boolean).join(" "),
      citations: factCore.citations,
      limitations: mergeLimitations(
        request,
        parsed.limitations
      ),
    };
  }
}
