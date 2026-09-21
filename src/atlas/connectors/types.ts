import type { AtlasActionRisk } from "../actions/types.ts";

export type AtlasConnectorId =
  | "calendar"
  | "email"
  | "messaging"
  | "finance"
  | "files"
  | "github"
  | "music"
  | "maps"
  | "reminders";

export type AtlasConnectorCapability =
  | "calendar.read"
  | "calendar.event.create"
  | "email.read"
  | "email.draft"
  | "email.send"
  | "messaging.message.prepare"
  | "messaging.message.send"
  | "finance.balance.read"
  | "finance.transactions.read"
  | "finance.spending.summary"
  | "finance.transfer"
  | "files.read"
  | "files.delete"
  | "github.read"
  | "music.read"
  | "maps.read"
  | "reminders.read";

export type AtlasConnectorConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "expired"
  | "error"
  | "disabled";

export type AtlasConnectorOperationClass = "read" | "write";

export interface AtlasConnectorCapabilityDefinition {
  connectorId: AtlasConnectorId;
  capability: AtlasConnectorCapability;
  operation: AtlasConnectorOperationClass;
  permissionTier: AtlasActionRisk;
  approvalRequired: boolean;
  enabledByDefault: boolean;
}

export interface AtlasConnectorRequest {
  version: "1.0.0";
  requestId: string;
  connectorId: AtlasConnectorId;
  capability: AtlasConnectorCapability;
  payload: unknown;
}

export type AtlasConnectorResult =
  | { status: "success"; requestId: string; data?: unknown }
  | { status: "unavailable"; requestId: string; safeError: string }
  | { status: "failed"; requestId: string; safeError: string };

export interface AtlasConnector {
  readonly id: AtlasConnectorId;
  readonly capabilities: readonly AtlasConnectorCapability[];
  connectionState(): AtlasConnectorConnectionState;
  execute(request: AtlasConnectorRequest): Promise<AtlasConnectorResult>;
}

export type AtlasConnectorPolicyPreference = "allow" | "ask" | "blocked";

export interface AtlasConnectorPolicyPreferences {
  readonly [capability: string]: AtlasConnectorPolicyPreference | undefined;
}
