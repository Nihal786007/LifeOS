// ==========================================
// LifeOS ATLAS Memory React Controller
// ==========================================

import { useCallback, useMemo, useState } from "react";
import { getBrowserAtlasMemoryStore } from "./atlasMemoryStore.ts";
import type { AtlasMemoryStore } from "./atlasMemoryStore";
import type { AtlasMemoryInput, AtlasMemoryItem } from "./types";

export interface AtlasMemoryController {
  items: readonly AtlasMemoryItem[];
  activeMemories: readonly AtlasMemoryItem[];
  supersededMemories: readonly AtlasMemoryItem[];
  saveMemory(input: AtlasMemoryInput): void;
  deleteMemory(id: string): void;
  clearAll(): void;
}

export function useAtlasMemory(
  store: AtlasMemoryStore = getBrowserAtlasMemoryStore()
): AtlasMemoryController {
  const [items, setItems] = useState<readonly AtlasMemoryItem[]>(
    () => store.load()
  );

  const saveMemory = useCallback(
    (input: AtlasMemoryInput) => setItems(store.saveMemory(input)),
    [store]
  );
  const deleteMemory = useCallback(
    (id: string) => setItems(store.deleteMemory(id)),
    [store]
  );
  const clearAll = useCallback(
    () => setItems(store.clearAll()),
    [store]
  );

  const activeMemories = useMemo(
    () => items.filter((item) => item.status === "active"),
    [items]
  );
  const supersededMemories = useMemo(
    () => items.filter((item) => item.status === "superseded"),
    [items]
  );

  return {
    items,
    activeMemories,
    supersededMemories,
    saveMemory,
    deleteMemory,
    clearAll,
  };
}
