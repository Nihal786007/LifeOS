import assert from "node:assert/strict";
import test from "node:test";

import { AtlasActionExecutor } from "../../src/atlas/actions/actionExecutor.ts";
import { interpretAtlasActionRequest } from "../../src/atlas/actions/actionIntent.ts";
import { createAtlasActionCandidateRequest } from "../../src/atlas/actions/candidate.ts";
import { AtlasPermissionEngine } from "../../src/atlas/actions/permissionEngine.ts";
import { createAtlasActionProposal, createAtlasProposalFingerprint, parseAtlasActionProposalDraft } from "../../src/atlas/actions/proposal.ts";
import type { AtlasActionApproval, AtlasActionEntitySnapshot, AtlasActionProposal } from "../../src/atlas/actions/types.ts";
import { createAtlasActionAuditWriter } from "../../src/atlas/actions/lifeOSActionAdapter.ts";
import { createConnectorActionAdapter } from "../../src/atlas/connectors/connectorActionAdapter.ts";
import { MockCalendarConnector, MockConnectorCandidateRouter, MockFinanceReadConnector, MockMessagingConnector } from "../../src/atlas/connectors/mockConnectors.ts";
import { AtlasConnectorRegistry, getConnectorCapabilityDefinition } from "../../src/atlas/connectors/registry.ts";
import type { AtlasConnector } from "../../src/atlas/connectors/types.ts";

const NOW = "2026-09-21T10:00:00.000Z";
const TODAY = new Date(2026, 8, 21, 10, 0, 0);
const EMPTY: AtlasActionEntitySnapshot = { taskIds: [], completedTaskIds: [], habitIds: [], monthlyOutcomeIds: [], weeklyFocusIds: [] };
const INTENT = { tasks: [], habits: [], monthlyOutcomes: [], weeklyFocuses: [] };

function proposal(type: unknown, idSuffix = "0001") {
  return createAtlasActionProposal(type, {
    id: `atlas-action:123e4567-e89b-42d3-a456-42661417${idSuffix}`,
    createdAt: NOW,
  });
}

function approvalFor(value: AtlasActionProposal): AtlasActionApproval {
  return {
    version: "1.1.0",
    actionId: value.id,
    decision: "approved",
    source: "user",
    decidedAt: NOW,
    proposalFingerprint: createAtlasProposalFingerprint(value),
  };
}

function registry() {
  const calendar = new MockCalendarConnector();
  const messaging = new MockMessagingConnector();
  const finance = new MockFinanceReadConnector();
  return { calendar, messaging, finance, registry: new AtlasConnectorRegistry([calendar, messaging, finance]) };
}

test("registers connectors and resolves deterministic capability metadata", () => {
  const setup = registry();
  assert.equal(setup.registry.isRegistered("calendar.read"), true);
  assert.equal(setup.registry.isRegistered("messaging.message.send"), true);
  assert.equal(setup.registry.isRegistered("finance.balance.read"), true);
  assert.deepEqual(getConnectorCapabilityDefinition("calendar.event.create"), {
    connectorId: "calendar", capability: "calendar.event.create", operation: "write",
    permissionTier: "CONFIRM_REQUIRED", approvalRequired: true, enabledByDefault: true,
  });
  assert.throws(() => new AtlasConnectorRegistry([setup.calendar, setup.calendar]), /already registered/);
});

test("connection and unsupported capability failures remain structured and opaque", async () => {
  const setup = registry();
  setup.calendar.setConnectionState("disconnected");
  const disconnected = await setup.registry.execute({ version: "1.0.0", requestId: "r1", connectorId: "calendar", capability: "calendar.read", payload: {} });
  assert.deepEqual(disconnected, { status: "unavailable", requestId: "r1", safeError: "The connector is not connected." });
  const unsupported = await setup.registry.execute({ version: "1.0.0", requestId: "r2", connectorId: "calendar", capability: "finance.balance.read", payload: {} });
  assert.deepEqual(unsupported, { status: "failed", requestId: "r2", safeError: "The connector capability is unsupported." });
  assert.equal(JSON.stringify(disconnected).includes("token"), false);
});

test("mock write results explicitly deny external delivery or event creation", async () => {
  const calendar = new MockCalendarConnector();
  const messaging = new MockMessagingConnector();
  assert.deepEqual(await calendar.execute({ version: "1.0.0", requestId: "calendar-sim", connectorId: "calendar", capability: "calendar.event.create", payload: { title: "Test" } }), {
    status: "success", requestId: "calendar-sim", data: { simulated: true, externalEventCreated: false },
  });
  assert.deepEqual(await messaging.execute({ version: "1.0.0", requestId: "message-sim", connectorId: "messaging", capability: "messaging.message.send", payload: { recipient: "Test", content: "Test" } }), {
    status: "success", requestId: "message-sim", data: { simulated: true, externalMessageSent: false },
  });
});

test("permission tiers are deterministic and connector-aware", () => {
  const engine = new AtlasPermissionEngine();
  assert.deepEqual(engine.evaluate("calendar.read"), {
    risk: "READ_ONLY", decision: "allowed", reason: "This connector action is read-only and permitted by the deterministic policy.",
  });
  assert.equal(engine.evaluate("calendar.event.create").decision, "approval-required");
  assert.equal(engine.evaluate("messaging.message.send").risk, "CONFIRM_REQUIRED");
  assert.equal(engine.evaluate("finance.balance.read").decision, "allowed");
  assert.equal(engine.evaluate("finance.transfer").decision, "forbidden");
  assert.equal(engine.evaluate("account.password.change").decision, "forbidden");
});

test("calendar read is allowed while event creation executes only after approval", async () => {
  const setup = registry();
  const audits: unknown[] = [];
  const executor = new AtlasActionExecutor(createConnectorActionAdapter(setup.registry), {
    record: async (entry) => { audits.push(entry); return [101]; },
  });
  const read = proposal({ type: "calendar.read", title: "Show calendar", payload: {} }, "0001");
  assert.equal((await executor.executeApprovedAction({ proposal: read, snapshot: EMPTY })).status, "executed");
  assert.equal(setup.calendar.requests.length, 1);

  const create = proposal({ type: "calendar.event.create", title: "Create SAT event", payload: { title: "SAT study", date: "2026-09-22" } }, "0002");
  assert.equal((await executor.executeApprovedAction({ proposal: create, snapshot: EMPTY })).status, "rejected");
  assert.equal(setup.calendar.requests.length, 1, "zero connector writes before approval");
  assert.equal((await executor.executeApprovedAction({ proposal: create, approval: approvalFor(create), snapshot: EMPTY })).status, "executed");
  assert.equal(setup.calendar.requests.length, 2);
  assert.deepEqual(audits[1], {
    actionId: create.id, actionType: "calendar.event.create", approvedAt: NOW,
    approvalRequired: true, source: "atlas", connectorId: "calendar",
    capability: "calendar.event.create", resultStatus: "executed",
  });
});

test("message approval binds the exact recipient and content", async () => {
  const setup = registry();
  const executor = new AtlasActionExecutor(createConnectorActionAdapter(setup.registry));
  const original = proposal({ type: "messaging.message.send", title: "Message Arjun", payload: { recipient: "Arjun", content: "I'll be late" } }, "0003");
  const approval = approvalFor(original);

  const changedContent = { ...original, payload: { recipient: "Arjun", content: "I'll be very late" } } as AtlasActionProposal;
  const changedRecipient = { ...original, payload: { recipient: "Riya", content: "I'll be late" } } as AtlasActionProposal;
  assert.equal((await executor.executeApprovedAction({ proposal: changedContent, approval, snapshot: EMPTY })).status, "rejected");
  assert.equal((await executor.executeApprovedAction({ proposal: changedRecipient, approval, snapshot: EMPTY })).status, "rejected");
  assert.equal(setup.messaging.requests.length, 0);
  assert.equal((await executor.executeApprovedAction({ proposal: original, approval, snapshot: EMPTY })).status, "executed");
  assert.deepEqual(setup.messaging.requests[0]?.payload, { recipient: "Arjun", content: "I'll be late" });
});

test("finance remains read-only and transfer never reaches a connector", async () => {
  const setup = registry();
  const executor = new AtlasActionExecutor(createConnectorActionAdapter(setup.registry));
  const balance = proposal({ type: "finance.balance.read", title: "Read balance", payload: {} }, "0004");
  assert.equal((await executor.executeApprovedAction({ proposal: balance, snapshot: EMPTY })).status, "executed");
  assert.equal(setup.finance.requests.length, 1);
  assert.throws(() => parseAtlasActionProposalDraft({ type: "finance.transfer", title: "Transfer", payload: { amount: 500 } }), /not supported/);
  assert.equal(setup.finance.requests.length, 1);
});

test("connector cannot claim approval or lower its deterministic risk", async () => {
  const setup = registry();
  const executor = new AtlasActionExecutor(createConnectorActionAdapter(setup.registry));
  const create = proposal({ type: "calendar.event.create", title: "Create event", payload: { title: "SAT", date: "2026-09-22" } }, "0005");
  const forged = { ...create, risk: "READ_ONLY", requiresApproval: false } as AtlasActionProposal;
  assert.equal((await executor.executeApprovedAction({ proposal: forged, snapshot: EMPTY })).status, "rejected");
  assert.equal(setup.calendar.requests.length, 0);
  assert.throws(() => parseAtlasActionProposalDraft({ type: "calendar.event.create", title: "Create", payload: { title: "SAT", date: "2026-09-22" }, risk: "READ_ONLY" }), /unsupported fields/);
});

test("connector failure is safely surfaced without provider internals", async () => {
  const failing: AtlasConnector = {
    id: "calendar",
    capabilities: ["calendar.read"],
    connectionState: () => "connected",
    execute: async () => { throw new Error("secret vendor token=do-not-leak"); },
  };
  const executor = new AtlasActionExecutor(createConnectorActionAdapter(new AtlasConnectorRegistry([failing])));
  const read = proposal({ type: "calendar.read", title: "Read calendar", payload: {} }, "0006");
  const result = await executor.executeApprovedAction({ proposal: read, snapshot: EMPTY });
  assert.deepEqual(result, { status: "rejected", actionId: read.id, reason: "The connector action failed safely." });
  assert.equal(JSON.stringify(result).includes("do-not-leak"), false);
});

test("canonical audit writer records connector metadata without parallel storage", async () => {
  const records: unknown[] = [];
  const writer = createAtlasActionAuditWriter({ append: (items) => records.push(...items), createId: () => 701, now: () => NOW });
  await writer.record({ actionId: "atlas-action:123e4567-e89b-42d3-a456-426614170007", actionType: "calendar.event.create", approvalRequired: true, approvedAt: NOW, source: "atlas", connectorId: "calendar", capability: "calendar.event.create", resultStatus: "executed" });
  assert.equal((records[0] as { title: string }).title, "ATLAS mock connector simulated");
  assert.deepEqual((records[0] as { metadata: unknown }).metadata, {
    source: "atlas", atlasActionId: "atlas-action:123e4567-e89b-42d3-a456-426614170007",
    actionType: "calendar.event.create", approvalRequired: true, approvedAt: NOW,
    connectorId: "calendar", capability: "calendar.event.create", resultStatus: "executed",
  });
});

test("deterministic mock runtime covers calendar, messaging, and finance safety", () => {
  const calendarRead = interpretAtlasActionRequest("Show my calendar", { snapshot: INTENT, now: TODAY });
  const calendarCreate = interpretAtlasActionRequest("Create SAT study event tomorrow", { snapshot: INTENT, now: TODAY });
  const message = interpretAtlasActionRequest("Message Arjun I'll be late", { snapshot: INTENT, now: TODAY });
  const transfer = interpretAtlasActionRequest("Transfer ₹500", { snapshot: INTENT, now: TODAY });
  assert.equal(calendarRead.status, "proposal");
  assert.equal(calendarCreate.status, "proposal");
  assert.equal(message.status, "proposal");
  if (message.status === "proposal") assert.deepEqual(message.draft.payload, { recipient: "Arjun", content: "I'll be late" });
  assert.equal(transfer.status, "forbidden");
});

test("recognized mock connector intents use deterministic candidates without calling Ollama", async () => {
  let fallbackCalls = 0;
  const routed = new MockConnectorCandidateRouter({
    id: "test-local-provider",
    generate: async () => { fallbackCalls += 1; return { status: "none" }; },
  });
  const connectorIntent = interpretAtlasActionRequest("Show my calendar", { snapshot: INTENT, now: TODAY });
  assert.equal(connectorIntent.status, "proposal");
  const connectorRequest = createAtlasActionCandidateRequest("Show my calendar", connectorIntent, INTENT, TODAY);
  const connectorResult = await routed.generate(connectorRequest);
  assert.equal(connectorResult.status, "candidate");
  assert.equal(fallbackCalls, 0);

  const taskIntent = interpretAtlasActionRequest("Create a task to study SAT tomorrow", { snapshot: INTENT, now: TODAY });
  const taskRequest = createAtlasActionCandidateRequest("Create a task to study SAT tomorrow", taskIntent, INTENT, TODAY);
  assert.equal((await routed.generate(taskRequest)).status, "none");
  assert.equal(fallbackCalls, 1);
});

test("controlled mock request path executes only permitted, approval-bound connector actions", async () => {
  const setup = registry();
  const audits: unknown[] = [];
  const executor = new AtlasActionExecutor(createConnectorActionAdapter(setup.registry), {
    record: async (entry) => { audits.push(entry); return []; },
  });
  const fromRequest = (text: string, suffix: string): AtlasActionProposal => {
    const intent = interpretAtlasActionRequest(text, { snapshot: INTENT, now: TODAY });
    assert.equal(intent.status, "proposal");
    if (intent.status !== "proposal") throw new Error("Expected a mock proposal.");
    return proposal(intent.draft, suffix);
  };

  const calendarRead = fromRequest("Show my calendar", "0010");
  assert.equal((await executor.executeApprovedAction({ proposal: calendarRead, snapshot: EMPTY })).status, "executed");
  assert.deepEqual(setup.calendar.requests[0]?.payload, {});

  const event = fromRequest("Create SAT study event tomorrow", "0011");
  assert.equal(setup.calendar.requests.length, 1);
  assert.equal((await executor.executeApprovedAction({ proposal: event, snapshot: EMPTY })).status, "rejected");
  assert.equal(setup.calendar.requests.length, 1);
  assert.equal((await executor.executeApprovedAction({ proposal: event, approval: approvalFor(event), snapshot: EMPTY })).status, "executed");
  assert.equal((await executor.executeApprovedAction({ proposal: event, approval: approvalFor(event), snapshot: EMPTY })).status, "rejected");
  assert.equal(setup.calendar.requests.length, 2);
  assert.deepEqual(setup.calendar.requests[1]?.payload, { title: "SAT study", date: "2026-09-22" });

  const message = fromRequest("Message Arjun I'll be late", "0012");
  const messageApproval = approvalFor(message);
  assert.equal((await executor.executeApprovedAction({ proposal: message, snapshot: EMPTY })).status, "rejected");
  const changedMessage = { ...message, payload: { recipient: "Arjun", content: "I'll be very late" } } as AtlasActionProposal;
  assert.equal((await executor.executeApprovedAction({ proposal: changedMessage, approval: messageApproval, snapshot: EMPTY })).status, "rejected");
  assert.equal(setup.messaging.requests.length, 0);
  assert.equal((await executor.executeApprovedAction({ proposal: message, approval: messageApproval, snapshot: EMPTY })).status, "executed");
  assert.deepEqual(setup.messaging.requests[0]?.payload, { recipient: "Arjun", content: "I'll be late" });

  const financeRead = fromRequest("Show my balance", "0013");
  assert.equal((await executor.executeApprovedAction({ proposal: financeRead, snapshot: EMPTY })).status, "executed");
  assert.equal(setup.finance.requests.length, 1);
  assert.equal(interpretAtlasActionRequest("Transfer ₹500", { snapshot: INTENT, now: TODAY }).status, "forbidden");
  assert.equal(setup.finance.requests.length, 1);
  assert.equal(audits.length, 4);
});
