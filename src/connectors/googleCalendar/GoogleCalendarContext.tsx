import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { useAuth } from "../../auth/AuthContext";
import { supabaseClient } from "../../auth/supabaseClient";
import { AtlasConnectorRegistry } from "../../atlas/connectors/registry";
import { GoogleCalendarConnector } from "./googleCalendarConnector";
import type {
  GoogleCalendarCommand,
  GoogleCalendarConnection,
  GoogleCalendarReadModel,
  GoogleCalendarResponse,
  GoogleCalendarTransport,
} from "./types";
import { parseGoogleCalendarCallback, parseGoogleCalendarResponse } from "./types";
import type { GoogleCalendarWriteCommand } from "./types";
import { assertWritableCalendar, calendarEventFingerprint, type CalendarEventPayload, type CalendarEventProposal } from "../calendar/eventProposal";
import { browserCalendarApprovalRecovery } from "../calendar/approvalRecovery";

const EMPTY_READ_MODEL: GoogleCalendarReadModel = { calendars: [], events: [], fetchedAt: null, windowStart: null, windowEnd: null };

interface GoogleCalendarContextValue {
  connection: GoogleCalendarConnection;
  readModel: GoogleCalendarReadModel;
  refresh(): Promise<void>;
  connect(requestWrite?: boolean): Promise<void>;
  disconnect(): Promise<void>;
  prepareEvent(payload: CalendarEventPayload): Promise<CalendarEventProposal>;
  approveEvent(proposal: CalendarEventProposal): Promise<string>;
  recoveryProposal: CalendarEventProposal | null;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextValue | null>(null);

class SupabaseGoogleCalendarTransport implements GoogleCalendarTransport {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }
  async request(command: GoogleCalendarCommand | GoogleCalendarWriteCommand): Promise<GoogleCalendarResponse> {
    const { data, error } = await this.client.functions.invoke("google-calendar", { body: command, signal: AbortSignal.timeout(55_000) });
    if (error) throw new Error("Google Calendar service is unavailable.");
    return parseGoogleCalendarResponse(data);
  }
}

function localWindow(): { windowStart: string; windowEnd: string; timezone: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 31);
  return {
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

function cleanCallbackUrl(): void {
  const url = new URL(location.href);
  ["code", "state", "scope", "authuser", "prompt", "error"].forEach((key) => url.searchParams.delete(key));
  history.replaceState(null, "", `/${url.search}${url.hash}`);
}

export function GoogleCalendarProvider({ children, client = supabaseClient }: { children: ReactNode; client?: SupabaseClient | null }) {
  const auth = useAuth();
  const userId = auth.identity?.userId;
  const [connection, setConnection] = useState<GoogleCalendarConnection>({ state: "disconnected" });
  const [readModel, setReadModel] = useState<GoogleCalendarReadModel>(EMPTY_READ_MODEL);
  const [recoveryProposal, setRecoveryProposal] = useState<CalendarEventProposal | null>(null);
  const generation = useRef(0);
  const pendingApprovals = useRef(new Set<string>());
  const transport = useMemo(() => client ? new SupabaseGoogleCalendarTransport(client) : null, [client]);
  const connector = useMemo(() => transport ? new GoogleCalendarConnector(transport) : null, [transport]);
  const registry = useMemo(() => connector ? new AtlasConnectorRegistry([connector]) : null, [connector]);

  const applyResponse = useCallback((response: GoogleCalendarResponse) => {
    if (response.status !== "connected") {
      const nextConnection: GoogleCalendarConnection = response.status === "disconnected"
        ? { state: "disconnected" }
        : response.status === "authorization-required"
          ? { state: "disconnected", safeError: "Google Calendar authorization is required." }
          : { state: response.status, safeError: response.safeError };
      setConnection(nextConnection);
      setReadModel(EMPTY_READ_MODEL);
      setRecoveryProposal(null);
      connector?.setConnectionState(nextConnection.state);
      return;
    }
    setConnection({ state: "connected", accountLabel: response.accountLabel, canCreate: response.canCreate === true });
    connector?.setConnectionState("connected");
    if (response.calendars && response.events) {
      setReadModel({ calendars: response.calendars, events: response.events, fetchedAt: response.fetchedAt ?? new Date().toISOString(), windowStart: response.windowStart ?? null, windowEnd: response.windowEnd ?? null });
    }
  }, [connector]);

  const refresh = useCallback(async () => {
    if (!registry || !connector) return;
    const run = generation.current;
    try {
      connector.setConnectionState("connected");
      const window = localWindow();
      const result = await registry.execute({ version: "1.0.0", requestId: crypto.randomUUID(), connectorId: "google-calendar", capability: "calendar.events.read", payload: window });
      if (result.status !== "success") throw new Error(result.safeError);
      if (run !== generation.current) return;
      applyResponse(result.data as GoogleCalendarResponse);
    } catch (error) {
      if (run !== generation.current) return;
      setConnection({ state: "network-failure", safeError: error instanceof Error ? error.message : "Google Calendar could not be refreshed." });
    }
  }, [applyResponse, connector, registry]);

  useEffect(() => {
    const run = ++generation.current;
    void (async () => {
      if (run !== generation.current) return;
      setConnection({ state: userId && transport ? "connecting" : "disconnected" });
      setReadModel(EMPTY_READ_MODEL);
      setRecoveryProposal(null);
      connector?.setConnectionState("disconnected");
      if (!userId || !transport) return;
      const recovery = await browserCalendarApprovalRecovery(userId).load();
      if (run !== generation.current) return;
      setRecoveryProposal(recovery);
      const callback = parseGoogleCalendarCallback(location.pathname, location.search);
      if (callback.status === "cancelled") {
        cleanCallbackUrl();
        if (run === generation.current) setConnection({ state: "disconnected", safeError: "Google Calendar authorization was cancelled or denied." });
        return;
      }
      if (callback.status === "invalid") {
        cleanCallbackUrl();
        if (run === generation.current) setConnection({ state: "provider-failure", safeError: "Google Calendar returned an invalid authorization response." });
        return;
      }
      const response = callback.status === "complete"
        ? await transport.request({ action: "complete", code: callback.code, state: callback.state, redirectUri: `${location.origin}/google-calendar-callback` })
        : await transport.request({ action: "status" });
      if (callback.status !== "none") cleanCallbackUrl();
      if (run !== generation.current) return;
      applyResponse(response);
      if (response.status === "connected") await refresh();
    })().catch(() => {
      if (run === generation.current) setConnection({ state: "network-failure", safeError: "Google Calendar connection could not be verified." });
    });
    return () => { generation.current += 1; };
  }, [applyResponse, connector, refresh, transport, userId]);

  const connect = useCallback(async (requestWrite = false) => {
    if (!transport) return;
    setConnection({ state: "connecting" });
    try {
      const redirectUri = `${location.origin}/google-calendar-callback`;
      const response = await transport.request({ action: "begin", redirectUri, requestWrite });
      if (response.status !== "authorization-required") throw new Error("Google authorization could not start.");
      location.assign(response.authorizationUrl);
    } catch (error) {
      setConnection({ state: "provider-failure", safeError: error instanceof Error ? error.message : "Google authorization could not start." });
    }
  }, [transport]);

  const disconnect = useCallback(async () => {
    if (!transport) return;
    generation.current += 1;
    setConnection({ state: "connecting" });
    try {
      const response = await transport.request({ action: "disconnect" });
      applyResponse(response);
    } catch {
      setConnection({ state: "network-failure", safeError: "Google Calendar could not be disconnected safely." });
    }
  }, [applyResponse, transport]);

  const prepareEvent = useCallback(async (payload: CalendarEventPayload) => {
    if (!transport || !userId) throw new Error("Sign in and connect Google Calendar first.");
    const run = generation.current;
    assertWritableCalendar(payload, readModel.calendars, connection.state === "connected", connection.canCreate === true);
    const response = await transport.request({ action: "prepare", payload });
    if (run !== generation.current || response.status !== "connected" || !response.proposal || await calendarEventFingerprint(response.proposal.payload) !== await calendarEventFingerprint(payload)) throw new Error("The event preview could not be verified. Please try again.");
    return structuredClone(response.proposal);
  }, [connection, readModel.calendars, transport, userId]);

  const approveEvent = useCallback(async (proposal: CalendarEventProposal) => {
    if (!registry || !userId) throw new Error("Sign in and connect Google Calendar first.");
    if (pendingApprovals.current.has(proposal.approvalId)) throw new Error("This event is already being submitted.");
    const run = generation.current;
    assertWritableCalendar(proposal.payload, readModel.calendars, connection.state === "connected", connection.canCreate === true);
    pendingApprovals.current.add(proposal.approvalId);
    try {
      if (await calendarEventFingerprint(proposal.payload) !== proposal.fingerprint) throw new Error("Event details changed. Preview and approve them again.");
      if (run !== generation.current) throw new Error("The account or connection changed. Preview the event again.");
      // Persist identity before dispatch, not permission to run automatically on reload.
      browserCalendarApprovalRecovery(userId).save(proposal);
      setRecoveryProposal(structuredClone(proposal));
      const result = await registry.execute({ version: "1.0.0", requestId: proposal.approvalId, connectorId: "google-calendar", capability: "calendar.events.create", payload: { action: "create", approvalId: proposal.approvalId, fingerprint: proposal.fingerprint, payload: proposal.payload, approved: true } });
      if (run !== generation.current) throw new Error("The account or connection changed. Check Google Calendar before trying again.");
      if (result.status !== "success") throw new Error(`${result.safeError} Creation is not confirmed; check Google Calendar before retrying this same approval.`);
      const response = parseGoogleCalendarResponse(result.data);
      if (response.status !== "connected" || !response.createdEvent || !response.auditRowId) throw new Error("Creation is not confirmed. Retry only this same approval.");
      browserCalendarApprovalRecovery(userId).clear();
      setRecoveryProposal(null);
      await refresh();
      return response.createdEvent.externalId;
    } finally { pendingApprovals.current.delete(proposal.approvalId); }
  }, [connection, readModel.calendars, refresh, registry, userId]);

  const value = useMemo(() => ({ connection, readModel, refresh, connect, disconnect, prepareEvent, approveEvent, recoveryProposal }), [connect, connection, disconnect, readModel, refresh, prepareEvent, approveEvent, recoveryProposal]);
  return <GoogleCalendarContext.Provider value={value}>{children}</GoogleCalendarContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGoogleCalendar(): GoogleCalendarContextValue {
  const value = useContext(GoogleCalendarContext);
  if (!value) throw new Error("useGoogleCalendar must be used inside GoogleCalendarProvider");
  return value;
}
