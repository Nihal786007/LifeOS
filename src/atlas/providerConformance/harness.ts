// ==========================================
// LifeOS ATLAS Provider Conformance Harness
// ==========================================

import type {
  AtlasAIProvider,
  AtlasAIRequest,
  AtlasAIResponse,
} from "../reasoning/atlasAIProvider";

import type {
  AtlasProviderInvocationResult,
  AtlasProviderValidationError,
} from "./types";

import {
  validateAtlasAIRequest,
  validateAtlasAIResponse,
  validateProviderDescriptor,
} from "./validation.ts";

function preservedLimitations(
  request: AtlasAIRequest,
  response?: unknown
): string[] {
  const limitations = request.context.limitations.map(
    (limitation) => limitation.reason
  );

  if (
    typeof response === "object" &&
    response !== null &&
    "limitations" in response &&
    Array.isArray(response.limitations)
  ) {
    response.limitations.forEach((item) => {
      if (
        typeof item === "string" &&
        item.trim().length > 0 &&
        !limitations.includes(item)
      ) {
        limitations.push(item);
      }
    });
  }

  return limitations;
}

function providerFailure(
  request: AtlasAIRequest,
  message: string
): AtlasProviderInvocationResult {
  return {
    status: "provider-error",
    errors: [
      {
        code: "provider-failure",
        path: "provider.reason",
        message,
      },
    ],
    limitations: preservedLimitations(request),
  };
}

export async function runAtlasProviderConformance(
  provider: AtlasAIProvider,
  request: AtlasAIRequest
): Promise<AtlasProviderInvocationResult> {
  const descriptorValidation =
    validateProviderDescriptor(
      provider.descriptor
    );

  const requestValidation =
    validateAtlasAIRequest(request);

  const preflightErrors = [
    ...descriptorValidation.errors,
    ...requestValidation.errors,
  ];

  if (preflightErrors.length > 0) {
    return {
      status: "validation-error",
      errors: preflightErrors,
      limitations: preservedLimitations(request),
    };
  }

  const isolatedRequest =
    structuredClone(request);

  const requestBefore = JSON.stringify(
    isolatedRequest
  );

  let response: AtlasAIResponse;

  try {
    response = await provider.reason(
      isolatedRequest
    );
  } catch (failure) {
    return providerFailure(
      request,
      failure instanceof Error
        ? failure.message
        : "Provider failed without a structured error."
    );
  }

  const errors: AtlasProviderValidationError[] = [
    ...validateAtlasAIResponse(
      response,
      request,
      provider.descriptor
    ).errors,
  ];

  if (
    JSON.stringify(isolatedRequest) !==
    requestBefore
  ) {
    errors.push({
      code: "request-mutated",
      path: "request",
      message:
        "Provider mutated its isolated request or reasoning context.",
    });
  }

  if (errors.length > 0) {
    const isOnlyEmptyResponse = errors.every(
      (item) => item.code === "empty-response"
    );

    return {
      status: isOnlyEmptyResponse
        ? "empty-response"
        : "validation-error",
      provider: structuredClone(
        provider.descriptor
      ),
      errors,
      limitations: preservedLimitations(
        request,
        response
      ),
    };
  }

  return {
    status: "success",
    provider: structuredClone(
      provider.descriptor
    ),
    response: structuredClone(response),
    errors: [],
    limitations: preservedLimitations(
      request,
      response
    ),
  };
}
