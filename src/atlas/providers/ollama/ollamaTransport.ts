// ==========================================
// LifeOS ATLAS Ollama Local HTTP Transport
// ==========================================

import {
  OllamaTransportError,
} from "./types.ts";

import type {
  OllamaTransport,
  OllamaTransportRequest,
} from "./types";

export class FetchOllamaTransport
implements OllamaTransport {
  async send(
    request: OllamaTransportRequest
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      request.timeoutMs
    );

    try {
      const response = await fetch(request.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new OllamaTransportError(
          "http-error",
          `Local Ollama returned HTTP ${response.status}.`
        );
      }

      try {
        return await response.json();
      } catch {
        throw new OllamaTransportError(
          "malformed-response",
          "Local Ollama returned malformed JSON."
        );
      }
    } catch (failure) {
      if (failure instanceof OllamaTransportError) {
        throw failure;
      }

      if (
        failure instanceof DOMException &&
        failure.name === "AbortError"
      ) {
        throw new OllamaTransportError(
          "timeout",
          `Local Ollama timed out after ${request.timeoutMs} ms.`
        );
      }

      throw new OllamaTransportError(
        "network",
        "Local Ollama is unavailable or the loopback request failed."
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
