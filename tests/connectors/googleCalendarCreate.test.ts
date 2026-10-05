import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assertWritableCalendar, calendarEventFingerprint, calendarWallTimeToRFC3339, parseCalendarEventPayload, type CalendarEventPayload } from "../../src/connectors/calendar/eventProposal.ts";
import { getConnectorCapabilityDefinition } from "../../src/atlas/connectors/registry.ts";
import { AtlasPermissionEngine } from "../../src/atlas/actions/permissionEngine.ts";
import { buildGoogleAuthorizationUrl, exchangeGoogleCode, refreshGoogleToken, GOOGLE_CALENDAR_WRITE_SCOPE } from "../../supabase/functions/google-calendar/googleApi.ts";
import { executeCalendarCreation, googleEventBody, insertApprovedGoogleEvent, type CalendarCreationDependencies } from "../../supabase/functions/google-calendar/createEvent.ts";
import { createGoogleCalendarHandler } from "../../supabase/functions/google-calendar/handler.ts";
import { parseGoogleCalendarResponse, type ExternalCalendarEvent } from "../../src/connectors/googleCalendar/types.ts";
import { calendarApprovalRecovery } from "../../src/connectors/calendar/approvalRecovery.ts";

const payload: CalendarEventPayload = { calendarId: "owner@example.test", title: "Test event", start: "2026-10-10T16:00:00+05:30", end: "2026-10-10T17:00:00+05:30", allDay: false, timezone: "Asia/Kolkata", location: "Room", description: "Test" };
const eventId = "abcdef0123456789";
const event: ExternalCalendarEvent = { provider: "google-calendar", externalId: eventId, calendarId: payload.calendarId, calendarName: "Calendar", title: payload.title, start: { kind: "dateTime", dateTime: payload.start, timezone: "Asia/Calcutta" }, end: { kind: "dateTime", dateTime: payload.end, timezone: "Asia/Calcutta" }, allDay: false, location: "Room", description: "Test", status: "confirmed" };
const json = (value: unknown, status=200) => new Response(JSON.stringify(value), { status });

test("Google create capability requires exact explicit approval; reads remain read-only", () => {
  assert.equal(getConnectorCapabilityDefinition("calendar.events.create")?.permissionTier,"CONFIRM_REQUIRED");
  assert.equal(getConnectorCapabilityDefinition("calendar.events.create")?.approvalRequired,true);
  assert.equal(new AtlasPermissionEngine().evaluate("calendar.events.create").decision,"approval-required");
  for(const capability of ["calendar.accounts.read","calendar.calendars.read","calendar.events.read"]) assert.equal(getConnectorCapabilityDefinition(capability)?.permissionTier,"READ_ONLY");
});
test("strict normalization and fingerprint are stable across property order", async () => {
  assert.equal(await calendarEventFingerprint(payload),await calendarEventFingerprint(Object.fromEntries(Object.entries(payload).reverse())));
  assert.deepEqual(parseCalendarEventPayload({...payload,title:" Test event "}),parseCalendarEventPayload(payload));
});
for (const [key,value] of Object.entries({ title:"Changed", calendarId:"other", start:"2026-10-10T16:01:00+05:30", end:"2026-10-10T17:01:00+05:30", timezone:"Asia/Colombo", location:"Other room", description:"Other description" })) {
  test(`changed ${key} invalidates approval`,async()=>assert.notEqual(await calendarEventFingerprint(payload),await calendarEventFingerprint({...payload,[key]:value})));
}
test("all-day approval differs and uses exclusive end dates",async()=>{
  const allDay=parseCalendarEventPayload({...payload,allDay:true,start:"2026-10-10",end:"2026-10-11"});
  assert.notEqual(await calendarEventFingerprint(allDay),await calendarEventFingerprint(payload));
  assert.deepEqual(googleEventBody(allDay,eventId,"hash").start,{date:"2026-10-10"});
  assert.deepEqual(googleEventBody(allDay,eventId,"hash").end,{date:"2026-10-11"});
  assert.throws(()=>parseCalendarEventPayload({...allDay,end:allDay.start}));
});
for (const extra of ["approved","executed","risk","requiresApproval","attendees","recurrence","conferenceData","script"]) test(`untrusted ${extra} field rejected`,()=>assert.throws(()=>parseCalendarEventPayload({...payload,[extra]:true})));
test("invalid dates/times, empty title, missing timezone and end <= start fail",()=>{
  for(const change of [{title:" "},{end:payload.start},{end:"2026-10-09T17:00:00+05:30"},{start:"2026-02-30T16:00:00+05:30"},{start:"2026-10-10T16:00:00"},{start:"2026-10-10T24:00:00+05:30"},{timezone:undefined},{timezone:"Not/AZone"},{timezone:"UTC"}]) assert.throws(()=>parseCalendarEventPayload({...payload,...change}));
});
test("timezone conversion preserves date boundaries and rejects DST gaps/folds",()=>{
  assert.equal(calendarWallTimeToRFC3339("2026-10-10T00:15","Asia/Kolkata"),"2026-10-10T00:15:00+05:30");
  assert.equal(calendarWallTimeToRFC3339("2026-07-01T12:00","America/New_York"),"2026-07-01T12:00:00-04:00");
  assert.throws(()=>calendarWallTimeToRFC3339("2026-03-08T02:30","America/New_York"));
  assert.throws(()=>calendarWallTimeToRFC3339("2026-11-01T01:30","America/New_York"));
});
test("missing scope/read-only/missing calendar/disconnect cannot write",()=>{
  for(const [calendars,connected,grant] of [[[{externalId:payload.calendarId,accessRole:"reader"}],true,true],[[],true,true],[[{externalId:payload.calendarId,accessRole:"owner"}],false,true],[[{externalId:payload.calendarId,accessRole:"owner"}],true,false]] as const) assert.throws(()=>assertWritableCalendar(payload,calendars,connected,grant));
});
test("write scope is requested only through explicit re-consent",()=>{
  const input={clientId:"mock",redirectUri:"http://localhost/callback",state:"state",codeChallenge:"challenge"};
  assert.equal(new URL(buildGoogleAuthorizationUrl(input)).searchParams.get("scope")?.includes(GOOGLE_CALENDAR_WRITE_SCOPE),false);
  assert.equal(new URL(buildGoogleAuthorizationUrl({...input,requestWrite:true})).searchParams.get("scope")?.includes(GOOGLE_CALENDAR_WRITE_SCOPE),true);
});
test("missing token scope never manufactures a write grant, refresh preserves verified grant",async()=>{
  const fetcher: typeof fetch=async()=>json({access_token:"mock",refresh_token:"mock",expires_in:3600});
  assert.deepEqual((await exchangeGoogleCode(fetcher,{clientId:"mock",clientSecret:"mock",code:"mock",verifier:"mock",redirectUri:"http://localhost"})).scopes,[]);
  assert.deepEqual((await refreshGoogleToken(fetcher,{clientId:"mock",clientSecret:"mock",refreshToken:"mock",previousScopes:[GOOGLE_CALENDAR_WRITE_SCOPE]})).scopes,[GOOGLE_CALENDAR_WRITE_SCOPE]);
});
async function transportInput() {
  const normalized=parseCalendarEventPayload(payload);
  return {accessToken:"mock-token",scopes:[GOOGLE_CALENDAR_WRITE_SCOPE],payload:normalized,eventId,fingerprint:await calendarEventFingerprint(normalized)};
}
test("server builds only event fields, verifies exact provider receipt",async()=>{
  const input=await transportInput(); const requests: {url:string;body?:unknown}[]=[];
  const fetcher:typeof fetch=async(url,init)=>{
    requests.push({url:String(url),...(init?.body?{body:JSON.parse(String(init.body))}:{})});
    return String(url).includes("calendarList")?json({id:payload.calendarId,summary:"Calendar",accessRole:"owner"}):json({...googleEventBody(input.payload,eventId,input.fingerprint),status:"confirmed"});
  };
  const result=await insertApprovedGoogleEvent(fetcher,input);
  assert.equal(result.externalId,eventId); assert.equal(requests.length,2);
  assert.match(requests[1]!.url,/sendUpdates=none/);
  assert.equal("attendees" in (requests[1]!.body as object),false);
  assert.equal("xpAwarded" in result,false); assert.equal("completed" in result,false);
});
test("409 retry resolves only matching Google event, never fabricates evidence",async()=>{
  const input=await transportInput();let posts=0;
  const fetcher:typeof fetch=async(url,init)=>String(url).includes("calendarList")?json({id:payload.calendarId,summary:"Calendar",accessRole:"owner"}):init?.method==="POST"?(posts++,json({},409)):json({...googleEventBody(input.payload,eventId,input.fingerprint),status:"confirmed"});
  assert.equal((await insertApprovedGoogleEvent(fetcher,input)).externalId,eventId);assert.equal(posts,1);
  await assert.rejects(insertApprovedGoogleEvent(async(url)=>String(url).includes("calendarList")?json({id:payload.calendarId,summary:"Calendar",accessRole:"owner"}):json({id:eventId,summary:"fake"}),input));
});
test("HTTP/provider/network/malformed failures never confirm creation",async()=>{
  const input=await transportInput();
  for(const status of [400,401,403,404,500,503]) await assert.rejects(insertApprovedGoogleEvent(async()=>json({private:"vendor body"},status),input),/authorization_revoked|calendar_not_writable|provider_failure/);
  await assert.rejects(insertApprovedGoogleEvent(async()=>{throw new DOMException("timeout","TimeoutError");},input));
  await assert.rejects(insertApprovedGoogleEvent(async()=>new Response("invalid JSON"),input));
});
test("durable completion journal returns same event and audit without replay",async()=>{
  let completed=false,inserts=0,audits=0;
  const dependencies:CalendarCreationDependencies={claim:async()=>completed?"completed":"claimed",read:async()=>({event_id:eventId,audit_row_id:"audit",event_receipt:completed?event:null,calendar_id:payload.calendarId}),insert:async()=>{inserts++;return event;},finish:async()=>{audits++;completed=true;return "audit";}};
  const first=await executeCalendarCreation(payload,dependencies);
  assert.deepEqual(await executeCalendarCreation(payload,dependencies),first);
  assert.equal(inserts,1);assert.equal(audits,1);
});
test("in-flight duplicate and failed insert never create a success audit",async()=>{
  let audits=0;const dependencies:CalendarCreationDependencies={claim:async()=>"pending",read:async()=>({event_id:eventId,audit_row_id:"audit",event_receipt:null,calendar_id:payload.calendarId}),insert:async()=>{throw new Error("failure");},finish:async()=>{audits++;return "audit";}};
  await assert.rejects(executeCalendarCreation(payload,dependencies));
  await assert.rejects(executeCalendarCreation(payload,{...dependencies,claim:async()=>"claimed"}));assert.equal(audits,0);
});
test("wrong calendar journal fails before connector invocation",async()=>{
  let calls=0;
  await assert.rejects(executeCalendarCreation(payload,{claim:async()=>"claimed",read:async()=>({event_id:eventId,audit_row_id:"audit",event_receipt:null,calendar_id:"another-account"}),insert:async()=>{calls++;return event;},finish:async()=>"audit"}));assert.equal(calls,0);
});
test("strict creation receipt parser rejects missing audit, malformed and extra fields",()=>{
  const receipt={status:"connected",accountLabel:"test",createdEvent:event,auditRowId:"12345678-1234-1234-1234-123456789012"};
  assert.equal(parseGoogleCalendarResponse(receipt).status,"connected");
  assert.throws(()=>parseGoogleCalendarResponse({...receipt,auditRowId:undefined}));
  assert.throws(()=>parseGoogleCalendarResponse({...receipt,secret:"mock"}));
});
test("authenticated write handlers reject forged approval/user scope",async()=>{
  const seen:string[]=[];
  const empty=async()=>({status:"disconnected" as const});
  const handler=createGoogleCalendarHandler({authenticate:async(token)=>({userId:token}),status:empty,begin:empty,complete:empty,read:empty,disconnect:empty,prepare:async(user)=>{seen.push(user);return {status:"disconnected"};}});
  const request=(body:unknown)=>new Request("https://example.test",{method:"POST",headers:{Authorization:"Bearer user-a"},body:JSON.stringify(body)});
  assert.equal((await handler(request({action:"prepare",payload}))).status,200);
  assert.deepEqual(seen,["user-a"]);
  assert.equal((await handler(request({action:"prepare",payload,userId:"user-b"}))).status,400);
  assert.equal((await handler(request({action:"create",payload,approved:false,approvalId:"12345678-1234-1234-1234-123456789012",fingerprint:"a".repeat(64)}))).status,400);
});
test("server approval journal has locked browser privileges and atomic zero-XP audit",()=>{
  const sql=readFileSync(new URL("../../supabase/migrations/20261005010000_google_calendar_event_approvals.sql",import.meta.url),"utf8");
  assert.match(sql,/force row level security/);assert.match(sql,/revoke all.*from public, anon, authenticated/);
  assert.match(sql,/where id=p_id and user_id=p_user_id for update/);
  assert.match(sql,/insert into public.execution_records/);assert.match(sql,/'calendar.events.create'.*\),0,/s);
  assert.match(sql,/if r.state='completed' then return r.audit_row_id/);
  assert.doesNotMatch(sql,/delete from|update public\.(tasks|habits|profiles|captures)/i);
});

test("reload recovery keeps one exact receipt per account and never grants execution",async()=>{
  const values=new Map<string,string>();
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
  const proposal={version:"1.0.0" as const,approvalId:"12345678-1234-1234-1234-123456789012",fingerprint:await calendarEventFingerprint(payload),payload,calendarName:"Calendar",permission:"CONFIRM_REQUIRED" as const};
  const accountA=calendarApprovalRecovery(storage,"a");accountA.save(proposal);
  assert.deepEqual(await calendarApprovalRecovery(storage,"a").load(),proposal);
  assert.equal(await calendarApprovalRecovery(storage,"b").load(),null);
  assert.equal(values.size,1);assert.equal("approved" in (await accountA.load())!,false);
  accountA.save({...proposal,payload:{...payload,title:"Changed"}});assert.equal(await accountA.load(),null);
  accountA.clear();assert.equal(await accountA.load(),null);
});
test("malformed or oversized recovery receipts fail closed",async()=>{
  for(const raw of ["malformed","null","[]","x".repeat(10_001),JSON.stringify({approved:true})]){
    const store=calendarApprovalRecovery({getItem:()=>raw,setItem:()=>{},removeItem:()=>{}},"a");
    assert.equal(await store.load(),null);
  }
});
test("interrupted finalization retries same external identity and writes one audit",async()=>{
  let finished=false;let attempts=0;let externalEvents=0;let audits=0;
  const ids:string[]=[];
  const dependencies:CalendarCreationDependencies={claim:async()=>finished?"completed":"claimed",read:async()=>({event_id:eventId,audit_row_id:"audit",event_receipt:finished?event:null,calendar_id:payload.calendarId}),insert:async id=>{ids.push(id);externalEvents=1;return event;},finish:async()=>{if(++attempts===1)throw new Error("interrupted");finished=true;audits++;return "audit";}};
  await assert.rejects(executeCalendarCreation(payload,dependencies));
  await executeCalendarCreation(payload,dependencies);await executeCalendarCreation(payload,dependencies);
  assert.deepEqual(ids,[eventId,eventId]);assert.equal(externalEvents,1);assert.equal(audits,1);
});
test("refresh failures cannot fabricate access or execute a write",async()=>{
  await assert.rejects(refreshGoogleToken(async()=>json({},401),{clientId:"mock",clientSecret:"mock",refreshToken:"mock",previousScopes:[GOOGLE_CALENDAR_WRITE_SCOPE]}),/authorization_revoked/);
});
test("client preview/cancel path is separate from explicit approved execution",()=>{
  const ui=readFileSync(new URL("../../src/components/calendar/CreateGoogleCalendarEvent.tsx",import.meta.url),"utf8");
  assert.match(ui,/async function preview\(\)[\s\S]*calendar.prepareEvent\(payload\)/);
  assert.match(ui,/Approve & create event/);assert.match(ui,/Nothing is created until you approve/);
  const context=readFileSync(new URL("../../src/connectors/googleCalendar/GoogleCalendarContext.tsx",import.meta.url),"utf8");
  assert.match(context,/pendingApprovals.current.add/);assert.match(context,/run !== generation.current/);
  assert.match(context,/approved: true/);assert.doesNotMatch(context,/useTasks|useHabit|usePlanning|updateProfile|appendExecution|awardXP/);
});
