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
  return JSON.stringify(left) === JSON.stringify(right);
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
  private static expectedSnapshot: ExecutionRecord[] | null = null;

  static configureRepository(repository: CompatibleRepository): void {
    if (this.repository === repository) return;

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
        this.records = repository.load();
        this.notify();
      });
    }
  }

  static initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<ExecutionRecord[]> {
    if (this.phase === "hydrated") return Promise.resolve(this.getAll());
    if (this.initialization) return this.initialization;

    const repository = this.getRepository();
    if (!isAsyncRepository(repository)) return Promise.resolve(this.getAll());

    this.initialization = repository.initialize((phase) => {
      this.phase = phase;
      onPhase?.(phase);
    }).then((records) => {
      this.records = cloneRecords(records);
      this.phase = "hydrated";
      this.persistenceError = null;
      this.repositoryUnsubscribe = repository.subscribe((event) =>
        this.handleRepositoryEvent(event));
      return this.getAll();
    }).catch((error: unknown) => {
      const resolved = error instanceof Error ? error : new Error(String(error));
      this.phase = "error";
      this.persistenceError = resolved;
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
    const version = ++this.mutationVersion;
    void operation().then((persisted) => {
      if (version !== this.mutationVersion) return;
      if (!recordsMatch(persisted, expected)) {
        throw new Error("Execution History persistence returned an unexpected snapshot");
      }
      this.expectedSnapshot = null;
      this.records = cloneRecords(persisted);
      this.persistenceError = null;
    }).catch((error: unknown) => {
      if (version !== this.mutationVersion) return;
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
