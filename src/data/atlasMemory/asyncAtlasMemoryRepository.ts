import type { AtlasMemoryItem } from "../../atlas/memory/types";
import type { AtlasMemoryRepository } from "./atlasMemoryRepository";

export type AtlasMemoryPersistencePhase = "uninitialized" | "opening" | "migration" | "hydrated" | "error";

export interface AsyncAtlasMemoryRepository extends AtlasMemoryRepository {
  initialize(onPhase?: (phase: "opening" | "migration") => void): Promise<readonly AtlasMemoryItem[]>;
  getPersistenceState(): { phase: AtlasMemoryPersistencePhase; error: Error | null };
}

export function isAsyncAtlasMemoryRepository(
  repository: AtlasMemoryRepository
): repository is AsyncAtlasMemoryRepository {
  return "initialize" in repository && "getPersistenceState" in repository;
}
