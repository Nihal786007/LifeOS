// ==========================================
// LifeOS ATLAS User-Confirmed Memory V1
// ==========================================

export const ATLAS_MEMORY_VERSION = "1.0.0" as const;
export const ATLAS_MEMORY_STORAGE_KEY =
  "lifeos-atlas-user-memory-v1" as const;
export const ATLAS_MEMORY_MAX_ITEMS = 50 as const;
export const ATLAS_MEMORY_MAX_TOPIC_LENGTH = 80 as const;
export const ATLAS_MEMORY_MAX_CONTENT_LENGTH = 280 as const;

export const ATLAS_MEMORY_TYPES = [
  "preference",
  "decision",
  "constraint",
  "important_context",
] as const;

export type AtlasMemoryType =
  (typeof ATLAS_MEMORY_TYPES)[number];
export type AtlasMemoryStatus = "active" | "superseded";

export interface AtlasMemoryItem {
  id: string;
  type: AtlasMemoryType;
  topic: string;
  content: string;
  source: "explicit_user_statement";
  createdAt: string;
  updatedAt: string;
  status: AtlasMemoryStatus;
  supersedesMemoryId?: string;
}

export interface AtlasMemoryInput {
  type: AtlasMemoryType;
  topic: string;
  content: string;
}

export interface AtlasMemoryEnvelope {
  version: typeof ATLAS_MEMORY_VERSION;
  items: readonly AtlasMemoryItem[];
}

export interface AtlasMemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
): boolean {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  return actual.length === required.length &&
    actual.every((key, index) => key === required[index]);
}

export function isAtlasMemoryType(value: unknown): value is AtlasMemoryType {
  return typeof value === "string" &&
    ATLAS_MEMORY_TYPES.some((type) => type === value);
}

export function isStrictIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value;
}

export function normalizeAtlasMemoryTopic(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

export function isAtlasMemoryItem(value: unknown): value is AtlasMemoryItem {
  if (!isRecord(value)) return false;

  const expectedKeys = value.supersedesMemoryId === undefined
    ? ["id", "type", "topic", "content", "source", "createdAt", "updatedAt", "status"]
    : ["id", "type", "topic", "content", "source", "createdAt", "updatedAt", "status", "supersedesMemoryId"];

  return hasExactKeys(value, expectedKeys) &&
    typeof value.id === "string" && value.id.trim().length > 0 &&
    isAtlasMemoryType(value.type) &&
    typeof value.topic === "string" && value.topic.trim().length > 0 &&
    value.topic.length <= ATLAS_MEMORY_MAX_TOPIC_LENGTH &&
    typeof value.content === "string" && value.content.trim().length > 0 &&
    value.content.length <= ATLAS_MEMORY_MAX_CONTENT_LENGTH &&
    value.source === "explicit_user_statement" &&
    isStrictIsoTimestamp(value.createdAt) &&
    isStrictIsoTimestamp(value.updatedAt) &&
    (value.status === "active" || value.status === "superseded") &&
    (value.supersedesMemoryId === undefined ||
      (typeof value.supersedesMemoryId === "string" &&
        value.supersedesMemoryId.trim().length > 0 &&
        value.supersedesMemoryId !== value.id));
}

export function isAtlasMemoryCollection(
  value: unknown
): value is readonly AtlasMemoryItem[] {
  if (!Array.isArray(value) || value.length > ATLAS_MEMORY_MAX_ITEMS ||
      !value.every(isAtlasMemoryItem)) return false;

  const ids = new Set<string>();
  const activeConflicts = new Set<string>();

  for (const item of value) {
    if (ids.has(item.id)) return false;
    ids.add(item.id);

    if (item.status === "active") {
      const key = `${item.type}:${normalizeAtlasMemoryTopic(item.topic)}`;
      if (activeConflicts.has(key)) return false;
      activeConflicts.add(key);
    }
  }

  return value.every((item) =>
    item.supersedesMemoryId === undefined || ids.has(item.supersedesMemoryId));
}

export function isAtlasMemoryEnvelope(value: unknown): value is AtlasMemoryEnvelope {
  return isRecord(value) && hasExactKeys(value, ["version", "items"]) &&
    value.version === ATLAS_MEMORY_VERSION && isAtlasMemoryCollection(value.items);
}
