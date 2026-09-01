// ==========================================
// LifeOS ATLAS Local Provider Composition
// ==========================================
//
// This is the only production composition point
// that knows the current provider implementation.
// Presentational components and controller hooks
// depend only on AtlasAIOrchestrator.
// ==========================================

import {
  AtlasAIOrchestrator,
} from "../orchestration/AtlasAIOrchestrator.ts";

import {
  OllamaAtlasProvider,
} from "../providers/ollama/ollamaAtlasProvider.ts";

export function createLocalAtlasAIOrchestrator():
  AtlasAIOrchestrator {
  return new AtlasAIOrchestrator(
    new OllamaAtlasProvider()
  );
}
