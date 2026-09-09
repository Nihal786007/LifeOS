// ==========================================
// LifeOS ATLAS Memory Persistence Boundary
// ==========================================

import {
  ATLAS_MEMORY_MAX_CONTENT_LENGTH,
  ATLAS_MEMORY_MAX_ITEMS,
  ATLAS_MEMORY_MAX_TOPIC_LENGTH,
  isAtlasMemoryType,
  normalizeAtlasMemoryTopic,
} from "./types.ts";
import type {
  AtlasMemoryInput,
  AtlasMemoryItem,
} from "./types";

import type {
  AtlasMemoryRepository,
} from "../../data/atlasMemory/atlasMemoryRepository";

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
  private readonly repository: AtlasMemoryRepository;
  private readonly now: () => string;
  private readonly createId: () => string;

  constructor(
    repository: AtlasMemoryRepository,
    options: AtlasMemoryStoreOptions = {}
  ) {
    this.repository = repository;
    this.now = options.now ?? (() => new Date().toISOString());
    this.createId = options.createId ?? (() => crypto.randomUUID());
  }

  load(): readonly AtlasMemoryItem[] {
    return structuredClone(this.repository.load());
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
    this.repository.save(next);
    return structuredClone(next);
  }

  deleteMemory(id: string): readonly AtlasMemoryItem[] {
    const current = [...this.load()];
    if (!current.some((item) => item.id === id)) {
      return structuredClone(current);
    }

    const next = current
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
      this.repository.clear();
      return [];
    }
    this.repository.save(next);
    return structuredClone(next);
  }

  clearAll(): readonly AtlasMemoryItem[] {
    this.repository.clear();
    return [];
  }

  subscribe(listener: () => void): () => void {
    return this.repository.subscribe(listener);
  }
}
