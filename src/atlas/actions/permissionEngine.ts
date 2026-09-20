import type { AtlasActionRisk, AtlasActionType } from "./types.ts";

export interface AtlasPermissionDecision {
  risk: AtlasActionRisk;
  decision: "allowed" | "approval-required" | "forbidden";
  reason: string;
}

const SUPPORTED_WRITES = new Set<AtlasActionType>([
  "task.create",
  "task.update",
  "task.complete",
  "habit.create",
  "habit.update",
  "capture.create",
  "planning.weekly_focus.create",
  "planning.task.schedule",
]);

export class AtlasPermissionEngine {
  evaluate(actionType: string): AtlasPermissionDecision {
    if (actionType === "reasoning.read") {
      return {
        risk: "READ_ONLY",
        decision: "allowed",
        reason: "Read-only ATLAS reasoning does not mutate LifeOS.",
      };
    }

    if (SUPPORTED_WRITES.has(actionType as AtlasActionType)) {
      return {
        risk: "CONFIRM_REQUIRED",
        decision: "approval-required",
        reason: "This action changes canonical LifeOS data and requires explicit user approval.",
      };
    }

    return {
      risk: "FORBIDDEN",
      decision: "forbidden",
      reason: "This action is outside the approved LifeOS action boundary.",
    };
  }
}
