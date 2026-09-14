import {
  ATLAS_MEMORY_STORAGE_KEY,
  ATLAS_MEMORY_VERSION,
  isAtlasMemoryEnvelope,
} from "../../atlas/memory/types.ts";

import type {
  AtlasMemoryEnvelope,
  AtlasMemoryItem,
  AtlasMemoryStorage,
} from "../../atlas/memory/types";

import type {
  AtlasMemoryRepository,
} from "./atlasMemoryRepository";

export interface AtlasMemoryStorageEventTarget {
  addEventListener(type: "storage", listener: EventListener): void;
  removeEventListener(type: "storage", listener: EventListener): void;
}

export type AtlasMemorySourceSnapshot =
  | { status: "missing"; items: readonly [] }
  | { status: "valid"; items: readonly AtlasMemoryItem[] }
  | { status: "invalid"; items: readonly [] };

export class LocalStorageAtlasMemoryRepository
implements AtlasMemoryRepository {
  private readonly storage: AtlasMemoryStorage;
  private readonly storageEvents?: AtlasMemoryStorageEventTarget;

  constructor(
    storage: AtlasMemoryStorage,
    storageEvents?: AtlasMemoryStorageEventTarget
  ) {
    this.storage = storage;
    this.storageEvents = storageEvents;
  }

  load(): readonly AtlasMemoryItem[] {
    const snapshot = this.inspect();
    return snapshot.status === "valid" ? structuredClone(snapshot.items) : [];
  }

  inspect(): AtlasMemorySourceSnapshot {
    const saved = this.storage.getItem(ATLAS_MEMORY_STORAGE_KEY);
    if (saved === null) return { status: "missing", items: [] };

    try {
      const parsed: unknown = JSON.parse(saved);
      return isAtlasMemoryEnvelope(parsed)
        ? { status: "valid", items: structuredClone(parsed.items) }
        : { status: "invalid", items: [] };
    } catch {
      return { status: "invalid", items: [] };
    }
  }

  save(items: readonly AtlasMemoryItem[]): void {
    const envelope: AtlasMemoryEnvelope = {
      version: ATLAS_MEMORY_VERSION,
      items,
    };

    this.storage.setItem(
      ATLAS_MEMORY_STORAGE_KEY,
      JSON.stringify(envelope)
    );
  }

  clear(): void {
    this.storage.removeItem(ATLAS_MEMORY_STORAGE_KEY);
  }

  subscribe(listener: () => void): () => void {
    if (!this.storageEvents) return () => undefined;

    const handleStorage: EventListener = (event) => {
      const storageEvent = event as StorageEvent;
      if (storageEvent.key === ATLAS_MEMORY_STORAGE_KEY) listener();
    };

    this.storageEvents.addEventListener("storage", handleStorage);
    return () => {
      this.storageEvents?.removeEventListener("storage", handleStorage);
    };
  }
}
