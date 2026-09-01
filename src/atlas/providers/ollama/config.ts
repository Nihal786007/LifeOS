// ==========================================
// LifeOS ATLAS Ollama Provider Configuration
// ==========================================

export const DEFAULT_OLLAMA_BASE_URL =
  "http://127.0.0.1:11434" as const;

export const DEFAULT_OLLAMA_MODEL =
  "llama3.2:3b" as const;

export const DEFAULT_OLLAMA_TIMEOUT_MS =
  30_000 as const;

export interface OllamaAtlasProviderConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export type OllamaAtlasProviderConfigInput =
  Partial<OllamaAtlasProviderConfig>;

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

function normalizeLocalBaseUrl(
  value: string
): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "Ollama base URL must be a valid local HTTP URL."
    );
  }

  if (
    url.protocol !== "http:" ||
    !LOCAL_HOSTS.has(url.hostname) ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0 ||
    (url.pathname !== "/" &&
      url.pathname !== "")
  ) {
    throw new Error(
      "Ollama base URL must target a loopback-only HTTP origin without credentials, paths, query parameters, or fragments."
    );
  }

  return url.origin;
}

function validateLocalModel(
  value: string
): string {
  const model = value.trim();

  if (model.length === 0) {
    throw new Error(
      "Ollama model name must not be empty."
    );
  }

  if (/(?:^|[:/_-])cloud(?:$|[:/_-])/i.test(model)) {
    throw new Error(
      "Cloud-tagged Ollama models are not allowed by the local ATLAS provider."
    );
  }

  return model;
}

export function resolveOllamaAtlasProviderConfig(
  input: OllamaAtlasProviderConfigInput = {}
): OllamaAtlasProviderConfig {
  const timeoutMs =
    input.timeoutMs ?? DEFAULT_OLLAMA_TIMEOUT_MS;

  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new Error(
      "Ollama timeout must be a positive integer in milliseconds."
    );
  }

  return {
    baseUrl: normalizeLocalBaseUrl(
      input.baseUrl ?? DEFAULT_OLLAMA_BASE_URL
    ),
    model: validateLocalModel(
      input.model ?? DEFAULT_OLLAMA_MODEL
    ),
    timeoutMs,
  };
}
