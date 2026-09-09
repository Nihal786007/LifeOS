import type {
  AtlasMemoryItem,
} from "../../atlas/memory/types";

export interface AtlasMemoryRepository {
  load(): readonly AtlasMemoryItem[];
  save(items: readonly AtlasMemoryItem[]): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}
