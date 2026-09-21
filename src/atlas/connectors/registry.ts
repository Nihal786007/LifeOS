import type { AtlasActionType } from "../actions/types.ts";
import type {
  AtlasConnector,
  AtlasConnectorCapability,
  AtlasConnectorCapabilityDefinition,
  AtlasConnectorPolicyPreference,
  AtlasConnectorPolicyPreferences,
  AtlasConnectorRequest,
  AtlasConnectorResult,
} from "./types.ts";

export const ATLAS_CONNECTOR_CAPABILITIES: readonly AtlasConnectorCapabilityDefinition[] = [
  { connectorId: "calendar", capability: "calendar.read", operation: "read", permissionTier: "READ_ONLY", approvalRequired: false, enabledByDefault: true },
  { connectorId: "calendar", capability: "calendar.event.create", operation: "write", permissionTier: "CONFIRM_REQUIRED", approvalRequired: true, enabledByDefault: true },
  { connectorId: "email", capability: "email.read", operation: "read", permissionTier: "READ_ONLY", approvalRequired: false, enabledByDefault: false },
  { connectorId: "email", capability: "email.draft", operation: "write", permissionTier: "LOW_RISK_WRITE", approvalRequired: true, enabledByDefault: false },
  { connectorId: "email", capability: "email.send", operation: "write", permissionTier: "CONFIRM_REQUIRED", approvalRequired: true, enabledByDefault: false },
  { connectorId: "messaging", capability: "messaging.message.prepare", operation: "write", permissionTier: "LOW_RISK_WRITE", approvalRequired: true, enabledByDefault: true },
  { connectorId: "messaging", capability: "messaging.message.send", operation: "write", permissionTier: "CONFIRM_REQUIRED", approvalRequired: true, enabledByDefault: true },
  { connectorId: "finance", capability: "finance.balance.read", operation: "read", permissionTier: "READ_ONLY", approvalRequired: false, enabledByDefault: true },
  { connectorId: "finance", capability: "finance.transactions.read", operation: "read", permissionTier: "READ_ONLY", approvalRequired: false, enabledByDefault: true },
  { connectorId: "finance", capability: "finance.spending.summary", operation: "read", permissionTier: "READ_ONLY", approvalRequired: false, enabledByDefault: true },
  { connectorId: "finance", capability: "finance.transfer", operation: "write", permissionTier: "FORBIDDEN", approvalRequired: true, enabledByDefault: false },
  { connectorId: "files", capability: "files.read", operation: "read", permissionTier: "READ_ONLY", approvalRequired: false, enabledByDefault: false },
  { connectorId: "files", capability: "files.delete", operation: "write", permissionTier: "FORBIDDEN", approvalRequired: true, enabledByDefault: false },
  { connectorId: "github", capability: "github.read", operation: "read", permissionTier: "READ_ONLY", approvalRequired: false, enabledByDefault: false },
  { connectorId: "music", capability: "music.read", operation: "read", permissionTier: "READ_ONLY", approvalRequired: false, enabledByDefault: false },
  { connectorId: "maps", capability: "maps.read", operation: "read", permissionTier: "READ_ONLY", approvalRequired: false, enabledByDefault: false },
  { connectorId: "reminders", capability: "reminders.read", operation: "read", permissionTier: "READ_ONLY", approvalRequired: false, enabledByDefault: false },
] as const;

const ACTION_CAPABILITIES: Partial<Record<AtlasActionType, AtlasConnectorCapability>> = {
  "calendar.read": "calendar.read",
  "calendar.event.create": "calendar.event.create",
  "messaging.message.prepare": "messaging.message.prepare",
  "messaging.message.send": "messaging.message.send",
  "finance.balance.read": "finance.balance.read",
  "finance.transactions.read": "finance.transactions.read",
  "finance.spending.summary": "finance.spending.summary",
};

export function getConnectorCapabilityDefinition(capability: string): AtlasConnectorCapabilityDefinition | undefined {
  return ATLAS_CONNECTOR_CAPABILITIES.find((entry) => entry.capability === capability);
}

export function getConnectorCapabilityForAction(actionType: AtlasActionType): AtlasConnectorCapability | undefined {
  return ACTION_CAPABILITIES[actionType];
}

export class AtlasConnectorRegistry {
  private readonly connectors = new Map<string, AtlasConnector>();
  private readonly preferences: AtlasConnectorPolicyPreferences;

  constructor(connectors: readonly AtlasConnector[], preferences: AtlasConnectorPolicyPreferences = {}) {
    this.preferences = { ...preferences };
    for (const connector of connectors) {
      if (this.connectors.has(connector.id)) throw new Error(`Connector ${connector.id} is already registered.`);
      if (connector.capabilities.some((capability) => getConnectorCapabilityDefinition(capability)?.connectorId !== connector.id)) {
        throw new Error(`Connector ${connector.id} declares an unsupported capability.`);
      }
      this.connectors.set(connector.id, connector);
    }
  }

  lookup(capability: AtlasConnectorCapability): AtlasConnectorCapabilityDefinition | undefined {
    const definition = getConnectorCapabilityDefinition(capability);
    if (!definition) return undefined;
    const preference = this.preferenceFor(capability);
    return { ...definition, enabledByDefault: preference !== "blocked", approvalRequired: preference === "ask" ? true : definition.approvalRequired };
  }

  preferenceFor(capability: AtlasConnectorCapability): AtlasConnectorPolicyPreference {
    const definition = getConnectorCapabilityDefinition(capability);
    if (!definition || definition.permissionTier === "FORBIDDEN") return "blocked";
    return this.preferences[capability] ?? (definition.enabledByDefault ? (definition.approvalRequired ? "ask" : "allow") : "blocked");
  }

  isRegistered(capability: AtlasConnectorCapability): boolean {
    const definition = getConnectorCapabilityDefinition(capability);
    if (!definition) return false;
    const connector = this.connectors.get(definition.connectorId);
    return Boolean(connector?.capabilities.includes(capability));
  }

  async execute(request: AtlasConnectorRequest): Promise<AtlasConnectorResult> {
    const definition = getConnectorCapabilityDefinition(request.capability);
    if (!definition || definition.connectorId !== request.connectorId) {
      return { status: "failed", requestId: request.requestId, safeError: "The connector capability is unsupported." };
    }
    if (this.preferenceFor(request.capability) === "blocked") {
      return { status: "failed", requestId: request.requestId, safeError: "The connector capability is disabled." };
    }
    const connector = this.connectors.get(request.connectorId);
    if (!connector || !connector.capabilities.includes(request.capability)) {
      return { status: "unavailable", requestId: request.requestId, safeError: "The connector is unavailable." };
    }
    if (connector.connectionState() !== "connected") {
      return { status: "unavailable", requestId: request.requestId, safeError: "The connector is not connected." };
    }
    try {
      return await connector.execute(structuredClone(request));
    } catch {
      return { status: "failed", requestId: request.requestId, safeError: "The connector action failed safely." };
    }
  }
}
