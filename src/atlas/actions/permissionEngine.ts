import type { AtlasActionRisk, AtlasActionType } from "./types.ts";
import { getConnectorCapabilityDefinition, getConnectorCapabilityForAction } from "../connectors/registry.ts";

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

    const capability = getConnectorCapabilityForAction(actionType as AtlasActionType);
    const connectorPolicy = capability ? getConnectorCapabilityDefinition(capability) : undefined;
    if (connectorPolicy) {
      if (connectorPolicy.permissionTier === "FORBIDDEN" || !connectorPolicy.enabledByDefault) {
        return { risk: "FORBIDDEN", decision: "forbidden", reason: "This connector capability is disabled or forbidden." };
      }
      return {
        risk: connectorPolicy.permissionTier,
        decision: connectorPolicy.approvalRequired ? "approval-required" : "allowed",
        reason: connectorPolicy.approvalRequired
          ? "This connector action requires explicit approval."
          : "This connector action is read-only and permitted by the deterministic policy.",
      };
    }

    return {
      risk: "FORBIDDEN",
      decision: "forbidden",
      reason: "This action is outside the approved LifeOS action boundary.",
    };
  }
}
