import { AtlasAIOrchestrator } from "../../src/atlas/orchestration/AtlasAIOrchestrator.ts";
import { DeterministicFakeAtlasAIProvider } from "../../src/atlas/providerConformance/fakeProvider.ts";
import { createAtlasAIRequest } from "../../src/atlas/reasoning/atlasAIProvider.ts";
import type { AtlasCanonicalState } from "../../src/atlas/state/types.ts";

export const HOSTED_TEST_STATE: AtlasCanonicalState = {
  capturedAt: "2026-09-17T12:00:00.000Z",
  tasks: [], habitDefinitions: [], habitCompletions: [], lifeGoals: [],
  monthlyTargets: [], weeklyTargets: [], executionHistory: [], captures: [],
  profile: {
    name: "ATLAS Tester", occupation: "Engineer", timezone: "Asia/Kolkata",
    theme: "dark", atlasPersonality: "Professional", level: 1, xp: 0,
  },
};

export function hostedTestContext() {
  return new AtlasAIOrchestrator(new DeterministicFakeAtlasAIProvider())
    .buildDeterministicPackage(HOSTED_TEST_STATE).reasoningContext;
}

export function hostedTestRequest(requestId = "hosted-test-001") {
  return createAtlasAIRequest({
    requestId,
    purpose: "grounded-answer",
    prompt: "What should I focus on today and why?",
    context: hostedTestContext(),
  });
}
