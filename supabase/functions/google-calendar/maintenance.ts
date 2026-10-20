/** Alternative deployment handler: deliberately has no operational dependencies.
 * JWT validation remains enabled at the Supabase gateway, not implemented here.
 * This handler starts no work; it cannot cancel work dispatched by older workers.
 */
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function googleCalendarMaintenanceHandler(request: Request): Response {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }
  if (!/^Bearer\s+\S+\s*$/i.test(request.headers.get("Authorization") ?? "")) {
    return new Response(JSON.stringify({ error: "authentication_required" }), { status: 401, headers });
  }
  return new Response(JSON.stringify({
    status: "maintenance",
    error: "calendar_maintenance",
    operationStarted: false,
    automaticRetry: false,
    safeError: "Google Calendar is paused for maintenance. This request started no new Calendar work. An earlier operation may still be settling.",
  }), { status: 503, headers });
}
