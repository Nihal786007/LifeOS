import type {
  HostedAtlasProviderFamily,
  HostedAtlasRequest,
  HostedAtlasResponse,
} from "../../../src/atlas/providers/hosted/contract.ts";

export interface HostedModelAdapterResult {
  commentary: string;
  factReferences: readonly string[];
  limitations: readonly string[];
  inputTokens?: number;
  outputTokens?: number;
}

export interface HostedModelAdapter {
  readonly provider: HostedAtlasProviderFamily;
  readonly model: string;
  generate(
    request: HostedAtlasRequest,
    options: { signal: AbortSignal; authenticatedUserId: string }
  ): Promise<HostedModelAdapterResult>;
}

export class HostedModelAdapterRegistry {
  private readonly adapters = new Map<HostedAtlasProviderFamily, HostedModelAdapter>();

  register(adapter: HostedModelAdapter): this {
    if (this.adapters.has(adapter.provider)) {
      throw new Error(`Hosted model adapter ${adapter.provider} is already registered.`);
    }
    this.adapters.set(adapter.provider, adapter);
    return this;
  }

  resolve(provider: string): HostedModelAdapter {
    const adapter = this.adapters.get(provider as HostedAtlasProviderFamily);
    if (!adapter) throw new Error(`Hosted model provider ${provider} is not configured.`);
    return adapter;
  }
}

export function buildHostedAtlasResponse(
  request: HostedAtlasRequest,
  adapter: HostedModelAdapter,
  result: HostedModelAdapterResult,
  latencyMs: number
): HostedAtlasResponse {
  return {
    version: "1.0.0",
    requestId: request.requestId,
    commentary: result.commentary,
    factReferences: [...result.factReferences],
    limitations: [...result.limitations],
    providerMetadata: {
      provider: adapter.provider,
      model: adapter.model,
      ...(result.inputTokens === undefined ? {} : { inputTokens: result.inputTokens }),
      ...(result.outputTokens === undefined ? {} : { outputTokens: result.outputTokens }),
      latencyMs,
    },
  };
}
