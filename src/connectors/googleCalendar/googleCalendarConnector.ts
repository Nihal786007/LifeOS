import type { AtlasConnector, AtlasConnectorConnectionState, AtlasConnectorRequest, AtlasConnectorResult } from "../../atlas/connectors/types.ts";
import type { GoogleCalendarConnectionState, GoogleCalendarResponse, GoogleCalendarTransport } from "./types.ts";

export class GoogleCalendarConnector implements AtlasConnector {
  readonly id = "google-calendar" as const;
  readonly capabilities = ["calendar.accounts.read", "calendar.calendars.read", "calendar.events.read", "calendar.events.create"] as const;
  private state: GoogleCalendarConnectionState = "disconnected";
  private readonly transport: GoogleCalendarTransport;

  constructor(transport: GoogleCalendarTransport) {
    this.transport = transport;
  }

  setConnectionState(state: GoogleCalendarConnectionState): void { this.state = state; }

  connectionState(): AtlasConnectorConnectionState {
    if (this.state === "network-failure" || this.state === "provider-failure" || this.state === "revoked") return "error";
    return this.state === "expired" ? "expired" : this.state;
  }

  async execute(request: AtlasConnectorRequest): Promise<AtlasConnectorResult> {
    if (!this.capabilities.includes(request.capability as typeof this.capabilities[number])) {
      return { status: "failed", requestId: request.requestId, safeError: "The connector capability is unsupported." };
    }
    const response: GoogleCalendarResponse = await this.transport.request(request.capability === "calendar.events.create"
      ? { ...(request.payload as import("./types.ts").GoogleCalendarWriteCommand & { action: "create" }), action: "create" }
      : request.capability === "calendar.events.read"
      ? { action: "read", ...(request.payload as { windowStart: string; windowEnd: string; timezone: string }) }
      : { action: "status" });
    if (response.status === "connected") return { status: "success", requestId: request.requestId, data: response };
    const safeError = response.status === "disconnected"
      ? "Google Calendar is not connected."
      : response.status === "authorization-required"
        ? "Google Calendar authorization is required."
        : response.safeError;
    return { status: "unavailable", requestId: request.requestId, safeError };
  }
}
