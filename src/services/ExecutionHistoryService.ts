// ==========================================
// LifeOS Execution History Service
// Version: 2.0
// ==========================================
//
// Single persistent ledger for LifeOS
// execution/domain events.
//
// Responsibilities:
// - Read execution history
// - Persist execution history
// - Append execution records
// - Clear execution history
// - Derive total XP from history
// - Notify read models when history changes
//
// IMPORTANT:
// This service is the ONLY persistent writer
// for execution history.
// ==========================================

import type { ExecutionRecord } from "../shared/execution";
import type {
  AsyncExecutionHistoryRepository,
  ExecutionHistoryPersistencePhase,
  ExecutionHistoryRepositoryEvent,
} from "../data/execution/asyncExecutionHistoryRepository";
import type { ExecutionHistoryRepository } from "../data/execution/executionHistoryRepository";

type CompatibleRepository = AsyncExecutionHistoryRepository | ExecutionHistoryRepository;

function isAsyncRepository(
  repository: CompatibleRepository
): repository is AsyncExecutionHistoryRepository {
  return "initialize" in repository;
}

function cloneRecords(records: readonly ExecutionRecord[]): ExecutionRecord[] {
  return structuredClone([...records]);
}

function recordsMatch(
  left: readonly ExecutionRecord[],
  right: readonly ExecutionRecord[]
): boolean {
  return left.length === right.length && left.every((record, index) =>
    valuesMatch(record, right[index]));
}

function valuesMatch(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length && left.every((value, index) => valuesMatch(value, right[index]));
  }
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) {
    return false;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && valuesMatch(leftRecord[key], rightRecord[key]));
}

export class ExecutionHistoryService {
  private static repository: CompatibleRepository | null = null;
  private static records: ExecutionRecord[] = [];
  private static phase: ExecutionHistoryPersistencePhase = "uninitialized";
  private static persistenceError: Error | null = null;
  private static initialization?: Promise<ExecutionRecord[]>;
  private static repositoryUnsubscribe: () => void = () => undefined;
  private static readonly listeners = new Set<() => void>();
  private static mutationVersion = 0;
  private static repositoryGeneration = 0;
  private static expectedSnapshot: ExecutionRecord[] | null = null;

  static configureRepository(repository: CompatibleRepository): void {
    if (this.repository === repository) return;
    this.repositoryGeneration += 1;
    const generation = this.repositoryGeneration;

    this.repositoryUnsubscribe();
    this.repositoryUnsubscribe = () => undefined;
    this.repository = repository;
    this.records = [];
    this.phase = "uninitialized";
    this.persistenceError = null;
    this.initialization = undefined;
    this.mutationVersion = 0;
    this.expectedSnapshot = null;

    // Retain compatibility for isolated synchronous repository tests.
    if (!isAsyncRepository(repository)) {
      this.records = repository.load();
      this.phase = "hydrated";
      this.repositoryUnsubscribe = repository.subscribe(() => {
        if (this.repository !== repository || this.repositoryGeneration !== generation) return;
        this.records = repository.load();
        this.notify();
      });
    }
  }

  static releaseRepository(repository: CompatibleRepository): void {
    if (this.repository !== repository) return;
    this.repositoryGeneration += 1;
    this.repositoryUnsubscribe();
    this.repositoryUnsubscribe = () => undefined;
    this.repository = null;
    this.records = [];
    this.phase = "uninitialized";
    this.persistenceError = null;
    this.initialization = undefined;
    this.mutationVersion = 0;
    this.expectedSnapshot = null;
  }

  static initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<ExecutionRecord[]> {
    if (this.phase === "hydrated") return Promise.resolve(this.getAll());
    if (this.initialization) return this.initialization;

    const repository = this.getRepository();
    if (!isAsyncRepository(repository)) return Promise.resolve(this.getAll());
    const generation = this.repositoryGeneration;
    const ownsRepository = () => this.repository === repository && this.repositoryGeneration === generation;

    this.initialization = repository.initialize((phase) => {
      if (!ownsRepository()) return;
      this.phase = phase;
      onPhase?.(phase);
    }).then((records) => {
      if (!ownsRepository()) throw new Error("Execution History initialization account scope changed");
      this.records = cloneRecords(records);
      this.phase = "hydrated";
      this.persistenceError = null;
      this.repositoryUnsubscribe = repository.subscribe((event) => {
        if (ownsRepository()) this.handleRepositoryEvent(event);
      });
      return this.getAll();
    }).catch((error: unknown) => {
      const resolved = error instanceof Error ? error : new Error(String(error));
      if (ownsRepository()) {
        this.phase = "error";
        this.persistenceError = resolved;
      }
      throw resolved;
    });

    return this.initialization;
  }

  private static getRepository(): CompatibleRepository {
    if (!this.repository) {
      throw new Error(
        "ExecutionHistoryService must be configured by DataServicesProvider"
      );
    }
    return this.repository;
  }

  private static requireHydrated(): void {
    if (this.phase !== "hydrated") {
      throw new Error("Execution History persistence is not hydrated");
    }
  }

  static getPersistenceState(): {
    phase: ExecutionHistoryPersistencePhase;
    error: Error | null;
  } {
    return { phase: this.phase, error: this.persistenceError };
  }

  static getAll(): ExecutionRecord[] {
    this.requireHydrated();
    return cloneRecords(this.records);
  }

  static save(records: ExecutionRecord[]): void {
    this.requireHydrated();
    const snapshot = cloneRecords(records);
    this.applyOptimistic(snapshot);
    const repository = this.getRepository();
    if (isAsyncRepository(repository)) {
      this.persist(snapshot, () => repository.replace(snapshot));
    } else {
      repository.save(snapshot);
    }
  }

  /** Fence a delayed producer to the repository it was authorized to use.
   * Keep the check and dispatch synchronous; never redirect to a new account. */
  static appendForRepository(
    repository: CompatibleRepository,
    records: ExecutionRecord[]
  ): ExecutionRecord[] {
    if (this.repository !== repository) {
      throw new Error("Execution History account scope is no longer current");
    }
    return this.append(records);
  }

  static append(records: ExecutionRecord[]): ExecutionRecord[] {
    this.requireHydrated();
    if (records.length === 0) return this.getAll();
    const added = cloneRecords(records);
    const snapshot = [...added, ...this.records];
    this.applyOptimistic(snapshot);
    const repository = this.getRepository();
    if (isAsyncRepository(repository)) {
      this.persist(snapshot, () => repository.append(added));
    } else {
      repository.append(added);
    }
    return this.getAll();
  }

  static async appendConfirmedForRepository(
    repository: CompatibleRepository, records: ExecutionRecord[]
  ): Promise<ExecutionRecord[]> {
    if (this.repository !== repository) throw new Error("Execution History account scope is no longer current");
    return this.appendConfirmed(records);
  }

  static async appendConfirmed(records: ExecutionRecord[]): Promise<ExecutionRecord[]> {
    this.requireHydrated();
    if (records.length === 0) return this.getAll();

    const previous = this.getAll();
    const repository = this.getRepository();
    const generation = this.repositoryGeneration;
    const added = cloneRecords(records);
    const expected = [...added, ...previous];
    const version = ++this.mutationVersion;
    this.applyOptimistic(expected);

    try {
      if (this.repository !== repository || generation !== this.repositoryGeneration) {
        throw new Error("Execution History account scope changed");
      }
      const persisted = isAsyncRepository(repository)
        ? await repository.append(added)
        : repository.append(added);

      if (this.repository !== repository || generation !== this.repositoryGeneration || version !== this.mutationVersion) {
        throw new Error("Execution History confirmation was superseded by another mutation");
      }
      if (!recordsMatch(persisted, expected)) {
        throw new Error("Execution History persistence returned an unexpected snapshot");
      }

      this.expectedSnapshot = null;
      this.records = cloneRecords(persisted);
      this.persistenceError = null;
      return this.getAll();
    } catch (error) {
      if (this.repository === repository && generation === this.repositoryGeneration && version === this.mutationVersion) {
        this.expectedSnapshot = null;
        this.records = previous;
        this.persistenceError = error instanceof Error ? error : new Error(String(error));
        this.notify();
      }
      throw error;
    }
  }

  static remove(id: number): ExecutionRecord[] {
    this.requireHydrated();
    const snapshot = this.records.filter((record) => record.id !== id);
    if (snapshot.length === this.records.length) return this.getAll();
    this.applyOptimistic(snapshot);
    const repository = this.getRepository();
    if (isAsyncRepository(repository)) {
      this.persist(snapshot, () => repository.remove(id));
    } else {
      repository.remove(id);
    }
    return this.getAll();
  }

  static getTotalXP(): number {
    return this.getAll().reduce((total, record) => {
      const xp = Number(record.xpAwarded);
      return Number.isFinite(xp) && xp > 0 ? total + xp : total;
    }, 0);
  }

  static clear(): void {
    this.requireHydrated();
    if (this.records.length === 0) return;
    const snapshot: ExecutionRecord[] = [];
    this.applyOptimistic(snapshot);
    const repository = this.getRepository();
    if (isAsyncRepository(repository)) {
      this.persist(snapshot, async () => {
        await repository.clear();
        return [];
      });
    } else {
      repository.clear();
    }
  }

  static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static applyOptimistic(records: ExecutionRecord[]): void {
    this.records = cloneRecords(records);
    this.expectedSnapshot = cloneRecords(records);
    this.persistenceError = null;
    this.notify();
  }

  private static persist(
    expected: ExecutionRecord[],
    operation: () => Promise<ExecutionRecord[]>
  ): void {
    const repository = this.getRepository();
    const generation = this.repositoryGeneration;
    const version = ++this.mutationVersion;
    const ownsMutation = () => this.repository === repository &&
      this.repositoryGeneration === generation && version === this.mutationVersion;
    void operation().then((persisted) => {
      if (!ownsMutation()) return;
      if (!recordsMatch(persisted, expected)) {
        throw new Error("Execution History persistence returned an unexpected snapshot");
      }
      this.expectedSnapshot = null;
      this.records = cloneRecords(persisted);
      this.persistenceError = null;
    }).catch((error: unknown) => {
      if (!ownsMutation()) return;
      this.expectedSnapshot = null;
      this.persistenceError = error instanceof Error ? error : new Error(String(error));
      console.error("Execution History persistence failed", this.persistenceError);
      this.notify();
    });
  }

  private static handleRepositoryEvent(event: ExecutionHistoryRepositoryEvent): void {
    if (event.type === "error") {
      this.persistenceError = event.error;
      console.error("Execution History persistence watch failed", event.error);
      this.notify();
      return;
    }

    if (
      this.expectedSnapshot !== null &&
      !recordsMatch(event.records, this.expectedSnapshot)
    ) return;

    this.expectedSnapshot = null;
    if (recordsMatch(event.records, this.records)) return;
    this.records = cloneRecords(event.records);
    this.persistenceError = null;
    this.notify();
  }

  private static notify(): void {
    for (const listener of this.listeners) listener();
  }
}
