import type {
  Capture,
  UserProfile,
} from "../../shared/types";

import type {
  CaptureRepository,
  ProfileRepository,
} from "./profileCaptureRepositories";

export interface ProfileCaptureStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ProfileCaptureStorageEventTarget {
  addEventListener(type: "storage", listener: EventListener): void;
  removeEventListener(type: "storage", listener: EventListener): void;
}

const PROFILE_STORAGE_KEY = "lifeos-profile";
const CAPTURE_STORAGE_KEY = "lifeos-captures";

export type CaptureSourceSnapshot =
  | { status: "missing"; captures: [] }
  | { status: "valid"; captures: Capture[] }
  | { status: "invalid"; captures: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isUserProfile(value: unknown): value is UserProfile {
  return isRecord(value);
}

function isCapture(value: unknown): value is Capture {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "number" &&
    Number.isFinite(value.id) &&
    typeof value.text === "string" &&
    typeof value.createdAt === "string"
  );
}

function isCaptureCollection(value: unknown): value is Capture[] {
  return Array.isArray(value) && value.every(isCapture);
}

function subscribeToStorageKey(
  storageEvents: ProfileCaptureStorageEventTarget | undefined,
  key: string,
  listener: () => void
): () => void {
  if (!storageEvents) return () => undefined;

  const handleStorage: EventListener = (event) => {
    const storageEvent = event as StorageEvent;
    if (storageEvent.key === key) listener();
  };

  storageEvents.addEventListener("storage", handleStorage);
  return () => storageEvents.removeEventListener("storage", handleStorage);
}

export class LocalStorageProfileRepository implements ProfileRepository {
  private readonly storage: ProfileCaptureStorage;
  private readonly storageEvents?: ProfileCaptureStorageEventTarget;

  constructor(
    storage: ProfileCaptureStorage,
    storageEvents?: ProfileCaptureStorageEventTarget
  ) {
    this.storage = storage;
    this.storageEvents = storageEvents;
  }

  load(): UserProfile | null {
    const saved = this.storage.getItem(PROFILE_STORAGE_KEY);
    if (!saved) return null;

    try {
      const parsed: unknown = JSON.parse(saved);
      return isUserProfile(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  save(profile: UserProfile): void {
    this.storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }

  subscribe(listener: () => void): () => void {
    return subscribeToStorageKey(
      this.storageEvents,
      PROFILE_STORAGE_KEY,
      listener
    );
  }
}

export class LocalStorageCaptureRepository implements CaptureRepository {
  private readonly storage: ProfileCaptureStorage;
  private readonly storageEvents?: ProfileCaptureStorageEventTarget;

  constructor(
    storage: ProfileCaptureStorage,
    storageEvents?: ProfileCaptureStorageEventTarget
  ) {
    this.storage = storage;
    this.storageEvents = storageEvents;
  }

  load(): Capture[] {
    const snapshot = this.inspect();
    return snapshot.status === "valid" ? snapshot.captures : [];
  }

  inspect(): CaptureSourceSnapshot {
    const saved = this.storage.getItem(CAPTURE_STORAGE_KEY);
    if (saved === null) return { status: "missing", captures: [] };

    try {
      const parsed: unknown = JSON.parse(saved);
      return isCaptureCollection(parsed)
        ? { status: "valid", captures: parsed }
        : { status: "invalid", captures: [] };
    } catch {
      return { status: "invalid", captures: [] };
    }
  }

  save(captures: Capture[]): void {
    this.storage.setItem(CAPTURE_STORAGE_KEY, JSON.stringify(captures));
  }

  subscribe(listener: () => void): () => void {
    return subscribeToStorageKey(
      this.storageEvents,
      CAPTURE_STORAGE_KEY,
      listener
    );
  }
}
