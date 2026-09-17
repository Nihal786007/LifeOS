// ==========================================
// LifeOS ATLAS Shared Deterministic Fact Core
// ==========================================
//
// This facade makes the existing deterministic
// Fact Core available to every provider without
// coupling new providers to Ollama transport code.
// The implementation remains frozen and shared.
// ==========================================

export {
  OLLAMA_ATLAS_FACT_CORE_VERSION as ATLAS_PROVIDER_FACT_CORE_VERSION,
  buildOllamaAtlasFactCore as buildAtlasProviderFactCore,
  resolveOllamaAtlasGroundedFact as resolveAtlasProviderGroundedFact,
} from "./ollama/factCore.ts";

export type {
  OllamaAtlasFactCore as AtlasProviderFactCore,
  OllamaAtlasGroundedFact as AtlasProviderGroundedFact,
} from "./ollama/factCore";
