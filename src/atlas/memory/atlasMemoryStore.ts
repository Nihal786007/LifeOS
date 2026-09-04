// ==========================================
// LifeOS ATLAS Memory Persistence Boundary
// ==========================================

import {
  ATLAS_MEMORY_MAX_CONTENT_LENGTH,
  ATLAS_MEMORY_MAX_ITEMS,
  ATLAS_MEMORY_MAX_TOPIC_LENGTH,
  ATLAS_MEMORY_STORAGE_KEY,
  ATLAS_MEMORY_VERSION,
  isAtlasMemoryEnvelope,
  isAtlasMemoryType,
  normalizeAtlasMemoryTopic,
} from "./types.ts";
import type {
  AtlasMemoryEnvelope,
  AtlasMemoryInput,
  AtlasMemoryItem,
  AtlasMemoryStorage,
} from "./types";

export class AtlasMemoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtlasMemoryValidationError";
  }
}

export interface AtlasMemoryStoreOptions {
  now?: () => string;
  createId?: () => string;
}

function validateInput(input: AtlasMemoryInput): AtlasMemoryInput {
  const topic = input.topic.trim().replace(/\s+/g, " ");
  const content = input.content.trim();

  if (!isAtlasMemoryType(input.type))
    throw new AtlasMemoryValidationError("Unsupported ATLAS memory type.");
  if (topic.length === 0 || topic.length > ATLAS_MEMORY_MAX_TOPIC_LENGTH)
    throw new AtlasMemoryValidationError(
      `Memory topic must be 1-${ATLAS_MEMORY_MAX_TOPIC_LENGTH} characters.`
    );
  if (content.length === 0 || content.length > ATLAS_MEMORY_MAX_CONTENT_LENGTH)
    throw new AtlasMemoryValidationError(
      `Memory content must be 1-${ATLAS_MEMORY_MAX_CONTENT_LENGTH} characters.`
    );

  return { type: input.type, topic, content };
}

export class AtlasMemoryStore {
  private readonly storage: AtlasMemoryStorage;
  private readonly now: () => string;
  private readonly createId: () => string;

  constructor(storage: AtlasMemoryStorage, options: AtlasMemoryStoreOptions = {}) {
    this.storage = storage;
    this.now = options.now ?? (() => new Date().toISOString());
    this.createId = options.createId ?? (() => crypto.randomUUID());
  }

  load(): readonly AtlasMemoryItem[] {
    const saved = this.storage.getItem(ATLAS_MEMORY_STORAGE_KEY);
    if (!saved) return [];

    try {
      const parsed: unknown = JSON.parse(saved);
      return isAtlasMemoryEnvelope(parsed) ? structuredClone(parsed.items) : [];
    } catch {
      return [];
    }
  }

  saveMemory(untrustedInput: AtlasMemoryInput): readonly AtlasMemoryItem[] {
    const input = validateInput(untrustedInput);
    const current = [...this.load()];
    if (current.length >= ATLAS_MEMORY_MAX_ITEMS)
      throw new AtlasMemoryValidationError(
        `ATLAS memory cannot exceed ${ATLAS_MEMORY_MAX_ITEMS} items.`
      );

    const timestamp = this.now();
    const conflictKey = `${input.type}:${normalizeAtlasMemoryTopic(input.topic)}`;
    const conflict = current.find((item) =>
      item.status === "active" &&
      `${item.type}:${normalizeAtlasMemoryTopic(item.topic)}` === conflictKey
    );
    const id = this.createId();
    if (current.some((item) => item.id === id))
      throw new AtlasMemoryValidationError("ATLAS memory ID must be unique.");

    const next = current.map((item) =>
      item.id === conflict?.id
        ? { ...item, status: "superseded" as const, updatedAt: timestamp }
        : item
    );
    const created: AtlasMemoryItem = {
      id,
      ...input,
      source: "explicit_user_statement",
      createdAt: timestamp,
      updatedAt: timestamp,
      status: "active",
      ...(conflict ? { supersedesMemoryId: conflict.id } : {}),
    };

    next.push(created);
    this.persist(next);
    return structuredClone(next);
  }

  deleteMemory(id: string): readonly AtlasMemoryItem[] {
    const next = this.load()
      .filter((item) => item.id !== id)
      .map((item) => {
        if (item.supersedesMemoryId !== id) {
          return item;
        }

        const remaining = { ...item };
        delete remaining.supersedesMemoryId;
        return remaining;
      });
    if (next.length === 0) {
      this.storage.removeItem(ATLAS_MEMORY_STORAGE_KEY);
      return [];
    }
    this.persist(next);
    return structuredClone(next);
  }

  clearAll(): readonly AtlasMemoryItem[] {
    this.storage.removeItem(ATLAS_MEMORY_STORAGE_KEY);
    return [];
  }

  private persist(items: readonly AtlasMemoryItem[]): void {
    const envelope: AtlasMemoryEnvelope = {
      version: ATLAS_MEMORY_VERSION,
      items,
    };
    this.storage.setItem(ATLAS_MEMORY_STORAGE_KEY, JSON.stringify(envelope));
  }
}

let browserStore: AtlasMemoryStore | undefined;

export function getBrowserAtlasMemoryStore(): AtlasMemoryStore {
  browserStore ??= new AtlasMemoryStore(window.localStorage);
  return browserStore;
}
