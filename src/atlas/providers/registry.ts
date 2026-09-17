import type { AtlasAIProvider } from "../reasoning/atlasAIProvider";

export const ATLAS_PROVIDER_IDS = ["ollama-local", "hosted-atlas"] as const;
export type AtlasProviderId = (typeof ATLAS_PROVIDER_IDS)[number];

export class AtlasProviderRegistry {
  private readonly providers = new Map<string, AtlasAIProvider>();

  register(provider: AtlasAIProvider): this {
    if (this.providers.has(provider.descriptor.id)) {
      throw new Error(`ATLAS provider ${provider.descriptor.id} is already registered.`);
    }
    this.providers.set(provider.descriptor.id, provider);
    return this;
  }

  resolve(id: AtlasProviderId): AtlasAIProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`ATLAS provider ${id} is unavailable.`);
    return provider;
  }

  descriptors() {
    return [...this.providers.values()].map((provider) =>
      structuredClone(provider.descriptor));
  }
}

export function resolveAtlasProviderId(value: string | undefined): AtlasProviderId {
  const id = value?.trim() || "ollama-local";
  if (!ATLAS_PROVIDER_IDS.includes(id as AtlasProviderId)) {
    throw new Error(`Unsupported ATLAS provider selection: ${id}.`);
  }
  return id as AtlasProviderId;
}
