import type { Capture } from "../../shared/types";

export interface CaptureDeletionState {
  ownerId: string | null;
  scope: object | null;
  ready: boolean;
  captures: readonly Capture[];
}

export interface CaptureDeletionTarget {
  readonly ownerId: string;
  readonly scope: object;
  readonly id: number;
  readonly text: string;
  readonly createdAt: string;
}

/** One explicit confirmation authorizes one exact, unchanged Capture only. */
export class CaptureDeletionGuard {
  private pending: CaptureDeletionTarget | null = null;
  private submitting = false;

  select(id: number, state: CaptureDeletionState): CaptureDeletionTarget | null {
    this.pending = null;
    if (this.submitting || !state.ready || !state.ownerId || !state.scope) return null;
    const matches = state.captures.filter(capture => capture.id === id);
    if (matches.length !== 1) return null;
    this.pending = Object.freeze({
      ownerId: state.ownerId, scope: state.scope,
      id: matches[0].id, text: matches[0].text, createdAt: matches[0].createdAt,
    });
    return this.pending;
  }

  isCurrent(target: CaptureDeletionTarget | null, state: CaptureDeletionState): boolean {
    if (!target || this.pending !== target || !state.ready ||
      state.ownerId !== target.ownerId || state.scope !== target.scope) return false;
    const matches = state.captures.filter(capture => capture.id === target.id);
    return matches.length === 1 && matches[0].text === target.text &&
      matches[0].createdAt === target.createdAt;
  }

  cancel(): void { this.pending = null; }

  async confirm(target: CaptureDeletionTarget, state: CaptureDeletionState, remove: (id: number) => Promise<void>): Promise<boolean> {
    if (this.submitting || !this.isCurrent(target, state)) {
      this.cancel();
      return false;
    }
    // Consume approval synchronously, before entering the trusted async path.
    this.pending = null;
    this.submitting = true;
    try { await remove(target.id); return true; }
    finally { this.submitting = false; }
  }
}
