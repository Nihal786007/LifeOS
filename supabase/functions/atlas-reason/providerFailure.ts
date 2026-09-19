import type { HostedAtlasProviderFamily } from "../../../src/atlas/providers/hosted/contract.ts";

export type HostedProviderFailureCategory =
  | "authentication"
  | "permission"
  | "model_not_found_or_unavailable"
  | "quota_exhausted"
  | "rate_limited"
  | "invalid_request_or_schema"
  | "provider_server_error"
  | "timeout"
  | "unknown_provider_failure";

export interface HostedProviderFailureDetails {
  provider: HostedAtlasProviderFamily;
  category: HostedProviderFailureCategory;
  upstreamHttpStatus?: number;
  googleStatus?: string;
  reason?: string;
  fieldViolationPaths?: readonly string[];
  rateLimitRemaining?: number;
}

export class HostedProviderFailure extends Error {
  readonly provider: HostedAtlasProviderFamily;
  readonly category: HostedProviderFailureCategory;
  readonly upstreamHttpStatus?: number;
  readonly googleStatus?: string;
  readonly reason?: string;
  readonly fieldViolationPaths?: readonly string[];
  readonly rateLimitRemaining?: number;

  constructor(details: HostedProviderFailureDetails) {
    super("Hosted provider request failed safely.");
    this.name = "HostedProviderFailure";
    this.provider = details.provider;
    this.category = details.category;
    this.upstreamHttpStatus = details.upstreamHttpStatus;
    this.googleStatus = details.googleStatus;
    this.reason = details.reason;
    this.fieldViolationPaths = details.fieldViolationPaths === undefined
      ? undefined : [...details.fieldViolationPaths];
    this.rateLimitRemaining = details.rateLimitRemaining;
  }
}

export function normalizeHostedProviderHttpFailure(
  status: number
): HostedProviderFailureCategory {
  if (status === 400 || status === 422) return "invalid_request_or_schema";
  if (status === 401) return "authentication";
  if (status === 402) return "quota_exhausted";
  if (status === 403) return "permission";
  if (status === 404) return "model_not_found_or_unavailable";
  if (status === 408) return "timeout";
  if (status === 429) return "rate_limited";
  if (status >= 500 && status <= 599) return "provider_server_error";
  return "unknown_provider_failure";
}

export function isHostedProviderFailure(
  failure: unknown
): failure is HostedProviderFailure {
  return failure instanceof HostedProviderFailure;
}
