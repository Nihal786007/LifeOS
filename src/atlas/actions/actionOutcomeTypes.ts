import type { AtlasActionType } from "./types.ts";

export type AtlasNotStartedCategory = "permission-denied" | "approval-invalid" | "reference-invalid" |
  "account-stale" | "cancelled" | "duplicate-submission" | "proposal-stale" | "preflight-error";
export interface AtlasAttemptIdentity {
  version: "1.0.0";
  actionId: string;
  actionType: AtlasActionType | "unsupported";
  ownerUserId: string | null;
  attemptId: string;
  preparedAt: string;
}
type NotStarted = { status: "not-started"; category: AtlasNotStartedCategory };
type InFlight = { status: "in-flight"; startedAt: string };
type Succeeded = { status: "succeeded"; startedAt: string; completedAt: string; confirmation: "adapter-acknowledged" | "canonical-accepted" };
type Failed = { status: "failed"; startedAt: string; completedAt: string; category: "adapter-declined" };
type Unknown = { status: "unknown"; startedAt: string; completedAt: string;
  category: "adapter-exception" | "adapter-uncertain" | "malformed-adapter-result" };
export type AtlasSuccessAudit = { status: "pending" } | { status: "not-configured" } |
  { status: "confirmed"; recordIds: readonly number[] } |
  { status: "unconfirmed"; category: "append-error" | "receipt-unconfirmed" };

/** Shared DTO only: no frontend parser, context, transport, or runtime imports. */
export type AtlasActionOutcome = AtlasAttemptIdentity & (
  | { operation: NotStarted | InFlight | Failed | Unknown; audit: { status: "not-required" } }
  | { operation: Succeeded; audit: AtlasSuccessAudit }
);
