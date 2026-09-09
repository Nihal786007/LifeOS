// ==========================================
// LifeOS ATLAS Memory React Controller
// ==========================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { AtlasMemoryStore } from "./atlasMemoryStore.ts";
import type { AtlasMemoryInput, AtlasMemoryItem } from "./types";
import { useDataServices } from "../../data/DataServicesContext";

export interface AtlasMemoryController {
  items: readonly AtlasMemoryItem[];
  activeMemories: readonly AtlasMemoryItem[];
  supersededMemories: readonly AtlasMemoryItem[];
  saveMemory(input: AtlasMemoryInput): void;
  deleteMemory(id: string): void;
  clearAll(): void;
}

export function useAtlasMemory(
  injectedStore?: AtlasMemoryStore
): AtlasMemoryController {
  const { atlasMemoryRepository } = useDataServices();
  const store = useMemo(
    () => injectedStore ?? new AtlasMemoryStore(atlasMemoryRepository),
    [atlasMemoryRepository, injectedStore]
  );

  const [items, setItems] = useState<readonly AtlasMemoryItem[]>(
    () => store.load()
  );

  useEffect(() =>
    store.subscribe(() => setItems(store.load())),
  [store]);

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
