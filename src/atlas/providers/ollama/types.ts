// ==========================================
// LifeOS ATLAS Ollama Transport Types
// ==========================================

export interface OllamaChatMessage {
  role: "system" | "user";
  content: string;
}

export interface OllamaChatRequestBody {
  model: string;
  messages: readonly OllamaChatMessage[];
  stream: false;
  think: false;
  format: Record<string, unknown>;
  options: {
    temperature: 0;
    seed: 0;
  };
}

export interface OllamaTransportRequest {
  url: string;
  timeoutMs: number;
  body: OllamaChatRequestBody;
}

export interface OllamaTransport {
  send(
    request: OllamaTransportRequest
  ): Promise<unknown>;
}

export type OllamaTransportErrorCode =
  | "timeout"
  | "network"
  | "http-error"
  | "malformed-response";

export class OllamaTransportError extends Error {
  readonly code: OllamaTransportErrorCode;

  constructor(
    code: OllamaTransportErrorCode,
    message: string
  ) {
    super(message);
    this.name = "OllamaTransportError";
    this.code = code;
  }
}
