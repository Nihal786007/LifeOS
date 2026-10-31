import { AtlasActionExecutor, getAtlasActionReferenceProblem } from "./actionExecutor.ts";
import { createAtlasProposalFingerprint } from "./proposal.ts";
import { createAtlasAttempt, notStartedResult } from "./actionOutcome.ts";
import type { AtlasNotStartedCategory } from "./actionOutcome.ts";
import type {
  AtlasActionAdapter, AtlasActionApproval, AtlasActionAuditWriter,
  AtlasActionEntitySnapshot, AtlasActionExecutionResult, AtlasActionProposal,
} from "./types.ts";

export interface AtlasActionRequestTicket {
  readonly ownerUserId: string;
  readonly generation: number;
}

export interface AtlasActionLifecycleBindings {
  ownerUserId: string;
  adapter: AtlasActionAdapter;
  auditWriter: AtlasActionAuditWriter;
  snapshot: AtlasActionEntitySnapshot;
}

/** One committed account scope / hook lifetime, never a durable execution ledger. */
export class AtlasActionLifecycle {
  private generation = 0;
  private bindings: AtlasActionLifecycleBindings | null = null;
  private ticket: AtlasActionRequestTicket | null = null;
  private pending: { ticket: AtlasActionRequestTicket; id: string; fingerprint: string } | null = null;
  private readonly submitted = new Set<string>();
  private readonly operations = new Map<string, AtlasActionLifecycleBindings>();
  private readonly executor: AtlasActionExecutor;
  private readonly ownerUserId: string | null;

  constructor(ownerUserId: string | null) {
    this.ownerUserId = ownerUserId;
    this.executor = new AtlasActionExecutor({
      execute: (proposal, attempt) => {
        const operation = this.operations.get(proposal.id);
        if (!operation) return Promise.resolve({ executed: false });
        return operation.adapter.execute(proposal, attempt);
      },
    }, {
      // An operation already started must never switch its audit writer to another account.
      record: (entry) => {
        const operation = this.operations.get(entry.actionId);
        if (!operation) throw new Error("Action execution scope is unavailable.");
        return operation.auditWriter.record(entry);
      },
    });
  }

  updateBindings(bindings: AtlasActionLifecycleBindings | null): void {
    if (!this.ownerUserId || bindings?.ownerUserId !== this.ownerUserId) {
      this.bindings = null;
      this.invalidate();
      return;
    }
    this.bindings = bindings;
  }

  invalidate(): void {
    this.generation += 1;
    this.ticket = null;
    this.pending = null;
  }

  deactivate(): void {
    this.bindings = null;
    this.invalidate();
  }

  beginRequest(): AtlasActionRequestTicket | null {
    if (!this.bindings || this.operations.size > 0) return null;
    this.invalidate();
    this.ticket = Object.freeze({ ownerUserId: this.bindings.ownerUserId, generation: this.generation });
    return this.ticket;
  }

  isCurrent(ticket: AtlasActionRequestTicket): boolean {
    return this.bindings !== null && ticket === this.ticket &&
      ticket.ownerUserId === this.bindings.ownerUserId && ticket.generation === this.generation;
  }

  isActive(): boolean {
    return this.bindings !== null;
  }

  isExecuting(): boolean {
    return this.operations.size > 0;
  }

  outcomeFor(actionId: string) { return this.executor.getOutcome(actionId); }

  rejectBeforeStart(proposal: AtlasActionProposal, category: AtlasNotStartedCategory, reason: string) {
    return notStartedResult(createAtlasAttempt(proposal, this.ownerUserId), category, reason);
  }

  isProposalCurrent(proposal: AtlasActionProposal): boolean {
    return this.pending !== null && this.isCurrent(this.pending.ticket) &&
      this.pending.id === proposal.id && this.pending.fingerprint === createAtlasProposalFingerprint(proposal);
  }

  canExecute(proposal: AtlasActionProposal): boolean {
    return this.isProposalCurrent(proposal) && !this.submitted.has(proposal.id);
  }

  bindProposal(ticket: AtlasActionRequestTicket, proposal: AtlasActionProposal): boolean {
    if (!this.isCurrent(ticket) || !this.bindings ||
        getAtlasActionReferenceProblem(proposal, this.bindings.snapshot)) return false;
    this.pending = { ticket, id: proposal.id, fingerprint: createAtlasProposalFingerprint(proposal) };
    return true;
  }

  async execute(proposal: AtlasActionProposal, approval: AtlasActionApproval): Promise<AtlasActionExecutionResult> {
    const pending = this.pending;
    const operation = this.bindings;
    if (!pending || !operation || !this.isCurrent(pending.ticket) ||
        pending.id !== proposal.id || pending.fingerprint !== createAtlasProposalFingerprint(proposal) ||
        this.submitted.has(proposal.id)) {
      return this.rejectBeforeStart(proposal, this.submitted.has(proposal.id) ? "duplicate-submission" : "proposal-stale",
        "This action is stale or has already been submitted. Prepare it again.");
    }
    // Synchronous latch: a second click cannot race React's state update.
    this.submitted.add(proposal.id);
    this.operations.set(proposal.id, operation);
    try {
      return await this.executor.executeApprovedAction({
        proposal, approval, snapshot: operation.snapshot,
        executionScope: {
          ownerUserId: operation.ownerUserId,
          isCurrent: () => this.isCurrent(pending.ticket) && this.bindings === operation,
          readSnapshot: () => operation.snapshot,
        },
      });
    } finally {
      this.operations.delete(proposal.id);
    }
  }
}
