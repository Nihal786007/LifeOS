import type { SupabaseClient } from "@supabase/supabase-js";
import type { HostedAtlasRequest } from "./contract";

export const DEFAULT_HOSTED_ATLAS_TIMEOUT_MS = 25_000 as const;
export const DEFAULT_HOSTED_ATLAS_FUNCTION_NAME = "atlas-reason" as const;

export interface HostedAtlasTransport {
  send(request: HostedAtlasRequest): Promise<unknown>;
}

export interface SupabaseHostedAtlasTransportOptions {
  client: SupabaseClient;
  supabaseUrl: string;
  publishableKey: string;
  functionName?: string;
  timeoutMs?: number;
  fetchImplementation?: typeof fetch;
}

export class SupabaseHostedAtlasTransport implements HostedAtlasTransport {
  private readonly client: SupabaseClient;
  private readonly functionName: string;
  private readonly timeoutMs: number;
  private readonly endpoint: string;
  private readonly publishableKey: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: SupabaseHostedAtlasTransportOptions) {
    this.client = options.client;
    this.functionName = options.functionName ?? DEFAULT_HOSTED_ATLAS_FUNCTION_NAME;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_HOSTED_ATLAS_TIMEOUT_MS;
    this.publishableKey = options.publishableKey.trim();
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    const baseUrl = new URL(options.supabaseUrl);
    if (baseUrl.protocol !== "https:" &&
        !(baseUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(baseUrl.hostname))) {
      throw new Error("Hosted ATLAS requires a secure Supabase origin.");
    }
    this.endpoint = `${baseUrl.origin}/functions/v1/${encodeURIComponent(this.functionName)}`;
    if (!this.publishableKey) throw new Error("Hosted ATLAS publishable key is unavailable.");
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new Error("Hosted ATLAS timeout must be a positive integer.");
    }
  }

  async send(request: HostedAtlasRequest): Promise<unknown> {
    const { data, error } = await this.client.auth.getSession();
    const accessToken = data.session?.access_token;
    if (error || !accessToken) throw new Error("Hosted ATLAS requires an authenticated session.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImplementation(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: this.publishableKey,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Hosted ATLAS endpoint returned HTTP ${response.status}.`);
      try {
        return await response.json();
      } catch {
        throw new Error("Hosted ATLAS endpoint returned malformed JSON.");
      }
    } catch (failure) {
      if (controller.signal.aborted) {
        throw new Error(`Hosted ATLAS timed out after ${this.timeoutMs} ms.`, {
          cause: failure,
        });
      }
      throw failure;
    } finally {
      clearTimeout(timer);
    }
  }
}
