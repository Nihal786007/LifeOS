import { DeterministicMockAtlasActionCandidateProvider } from "../actions/candidate.ts";
import type { AtlasActionCandidateGenerationResult, AtlasActionCandidateProvider, AtlasActionCandidateRequest } from "../actions/candidate.ts";
import { getConnectorCapabilityForAction } from "./registry.ts";
import type { AtlasConnector, AtlasConnectorCapability, AtlasConnectorConnectionState, AtlasConnectorRequest, AtlasConnectorResult } from "./types.ts";

export class MockConnectorCandidateRouter implements AtlasActionCandidateProvider {
  readonly id = "mock-connectors-with-local-fallback";
  private readonly mock = new DeterministicMockAtlasActionCandidateProvider();
  private readonly fallback: AtlasActionCandidateProvider;

  constructor(fallback: AtlasActionCandidateProvider) { this.fallback = fallback; }

  generate(request: AtlasActionCandidateRequest): Promise<AtlasActionCandidateGenerationResult> {
    const singleType = request.allowedActionTypes.length === 1 ? request.allowedActionTypes[0] : undefined;
    return singleType && getConnectorCapabilityForAction(singleType)
      ? this.mock.generate(request)
      : this.fallback.generate(request);
  }
}

abstract class DeterministicMockConnector implements AtlasConnector {
  abstract readonly id: AtlasConnector["id"];
  abstract readonly capabilities: readonly AtlasConnectorCapability[];
  readonly requests: AtlasConnectorRequest[] = [];
  private state: AtlasConnectorConnectionState;

  constructor(state: AtlasConnectorConnectionState = "connected") { this.state = state; }

  connectionState(): AtlasConnectorConnectionState { return this.state; }
  setConnectionState(state: AtlasConnectorConnectionState): void { this.state = state; }

  async execute(request: AtlasConnectorRequest): Promise<AtlasConnectorResult> {
    this.requests.push(structuredClone(request));
    return this.resultFor(request);
  }

  protected abstract resultFor(request: AtlasConnectorRequest): AtlasConnectorResult;
}

export class MockCalendarConnector extends DeterministicMockConnector {
  readonly id = "calendar" as const;
  readonly capabilities = ["calendar.read", "calendar.event.create"] as const;
  protected resultFor(request: AtlasConnectorRequest): AtlasConnectorResult {
    return request.capability === "calendar.read"
      ? { status: "success", requestId: request.requestId, data: { events: [] } }
      : { status: "success", requestId: request.requestId, data: { simulated: true, externalEventCreated: false } };
  }
}

export class MockMessagingConnector extends DeterministicMockConnector {
  readonly id = "messaging" as const;
  readonly capabilities = ["messaging.message.prepare", "messaging.message.send"] as const;
  protected resultFor(request: AtlasConnectorRequest): AtlasConnectorResult {
    return { status: "success", requestId: request.requestId, data: request.capability === "messaging.message.prepare" ? { simulated: true, externalMessagePrepared: false } : { simulated: true, externalMessageSent: false } };
  }
}

export class MockFinanceReadConnector extends DeterministicMockConnector {
  readonly id = "finance" as const;
  readonly capabilities = ["finance.balance.read", "finance.transactions.read", "finance.spending.summary"] as const;
  protected resultFor(request: AtlasConnectorRequest): AtlasConnectorResult {
    return { status: "success", requestId: request.requestId, data: { available: true } };
  }
}
