import { googleCalendarMaintenanceHandler } from "./maintenance.ts";

// Alternative entrypoint only. The normal index.ts is intentionally unchanged.
Deno.serve(googleCalendarMaintenanceHandler);
