import { AtlasPermissionEngine } from "../actions/permissionEngine.ts";
import type { AtlasActionAdapter, AtlasActionProposal, AtlasTrustedMutationResult } from "../actions/types.ts";
import { AtlasConnectorRegistry, getConnectorCapabilityForAction } from "./registry.ts";

export function createConnectorActionAdapter(registry: AtlasConnectorRegistry): AtlasActionAdapter {
  return {
    async execute(proposal: AtlasActionProposal): Promise<AtlasTrustedMutationResult> {
      const capability = getConnectorCapabilityForAction(proposal.type);
      if (!capability) return { executed: false, reason: "The action is not a connector capability." };
      const definition = registry.lookup(capability);
      const permission = new AtlasPermissionEngine().evaluate(proposal.type);
      if (!definition || !definition.enabledByDefault || permission.decision === "forbidden" || permission.risk !== definition.permissionTier || proposal.risk !== permission.risk) {
        return { executed: false, reason: "The connector capability is not permitted." };
      }
      const result = await registry.execute({ version: "1.0.0", requestId: proposal.id, connectorId: definition.connectorId, capability, payload: structuredClone(proposal.payload) });
      return result.status === "success" ? { executed: true } : { executed: false, reason: result.safeError };
    },
  };
}

export function createCompositeAtlasActionAdapter(lifeOS: AtlasActionAdapter, connectors: AtlasActionAdapter): AtlasActionAdapter {
  return { execute: (proposal) => getConnectorCapabilityForAction(proposal.type) ? connectors.execute(proposal) : lifeOS.execute(proposal) };
}
