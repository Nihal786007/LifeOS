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
  ready: boolean;
  persistenceError?: string;
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
    () => injectedStore ? store.load() : []
  );
  const [ready, setReady] = useState(Boolean(injectedStore));
  const [persistenceError, setPersistenceError] = useState<string>();

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;

    if (injectedStore) {
      unsubscribe = store.subscribe(() => setItems(store.load()));
      return () => { active = false; unsubscribe(); };
    }

    void atlasMemoryRepository.initialize().then(() => {
      if (!active) return;
      setItems(store.load());
      setReady(true);
      setPersistenceError(undefined);
      unsubscribe = store.subscribe(() => {
        if (!active) return;
        const state = atlasMemoryRepository.getPersistenceState();
        if (state.error) setPersistenceError(state.error.message);
        else { setItems(store.load()); setPersistenceError(undefined); }
      });
    }).catch((error: unknown) => {
      if (active) setPersistenceError(error instanceof Error ? error.message : String(error));
    });

    return () => { active = false; unsubscribe(); };
  }, [atlasMemoryRepository, injectedStore, store]);

  const saveMemory = useCallback(
    (input: AtlasMemoryInput) => {
      if (!ready) throw new Error("ATLAS Memory is still loading.");
      setItems(store.saveMemory(input));
    },
    [ready, store]
  );
  const deleteMemory = useCallback(
    (id: string) => {
      if (!ready) throw new Error("ATLAS Memory is still loading.");
      setItems(store.deleteMemory(id));
    },
    [ready, store]
  );
  const clearAll = useCallback(
    () => {
      if (!ready) throw new Error("ATLAS Memory is still loading.");
      setItems(store.clearAll());
    },
    [ready, store]
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
    ready,
    persistenceError,
    saveMemory,
    deleteMemory,
    clearAll,
  };
}
