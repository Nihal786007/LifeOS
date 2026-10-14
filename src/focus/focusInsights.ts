import { selectFocusEvidence, type FocusEvidenceSource } from "./focusEvidence.ts";
import { attentionCategories, UNCATEGORIZED } from "../insights/attentionLedger.ts";

export type FocusPeriod = "today" | "week" | "month";
export interface FocusHistoryItem {
  sessionId: string; executionId: number; taskId: number; title: string;
  currentTaskTitle: string | null; goalLabel: string; categoryId: string;
  durationMs: number; startedAt: string; endedAt: string;
}
export interface FocusInsightsReport {
  period: FocusPeriod; timezone: string; startDate: string; endDate: string;
  totalMs: number; sessionsCompleted: number; sessions: FocusHistoryItem[];
  daily: { date: string; durationMs: number; sessions: number }[];
  goals: { id: string; label: string; durationMs: number }[];
  observations: string[]; excluded: number; previousRecordedMs: number;
}

export function focusDate(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(instant);
  const part = (type: string) => parts.find(p=>p.type===type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function calendarDate(date: string, offset = 0) {
  const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate()+offset); return value.toISOString().slice(0,10);
}
/** Resolve real local midnights, not fixed 24-hour/DST intervals. */
function midnight(date: string, timezone: string) {
  const target = Date.parse(`${date}T00:00:00Z`);
  let candidate = target;
  const formatter = new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
  for(let i=0;i<6;i++) {
    const parts=formatter.formatToParts(new Date(candidate)); const get=(type:string)=>parts.find(p=>p.type===type)!.value;
    const wall=Date.parse(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`);
    const adjustment=target-wall; if(adjustment===0)return candidate; candidate+=adjustment;
  }
  throw new Error("Focus calendar boundary is unavailable in this timezone.");
}
export function focusPeriodWindow(period: FocusPeriod, now: Date, timezone: string) {
  const today=focusDate(now,timezone); let start=today; let end=calendarDate(today,1);
  if(period==="week") {const weekday=new Date(`${today}T00:00:00Z`).getUTCDay();start=calendarDate(today,-(weekday+6)%7);end=calendarDate(start,7);}
  if(period==="month") {start=today.slice(0,7)+"-01"; const next=new Date(`${start}T00:00:00Z`);next.setUTCMonth(next.getUTCMonth()+1);end=next.toISOString().slice(0,10);}
  return {startDate:start,endDate:calendarDate(end,-1),startMs:midnight(start,timezone),endMs:midnight(end,timezone)};
}

/** Read-only composition over the supplied account's ledger and current links.
 * No storage, clock reads, active-session state, providers or mutation methods.
 * History has no title/goal snapshot: labels are explicitly current links.
 * A whole session must fit its period (Reality Mirror policy). Accepted
 * overnight sessions within a week/month belong wholly to their completion
 * day, since historical pause intervals cannot be reconstructed.
 */
export function buildFocusInsights(state: FocusEvidenceSource, period: FocusPeriod, now: Date, timezone: string): FocusInsightsReport {
  const window=focusPeriodWindow(period,now,timezone);
  const categories=attentionCategories(state); const active=new Set(categories.map(c=>c.id));
  const {ledger,excluded}=selectFocusEvidence(state,active,window.startMs,window.endMs,now.getTime());
  const sessions=ledger.map(entry=>{
    const task=state.tasks.find(t=>t.id===entry.taskId);
    return {...entry,title:"Focus session",currentTaskTitle:task?.title??null,goalLabel:entry.categoryId===UNCATEGORIZED?"Other focus":categories.find(c=>c.id===entry.categoryId)!.label};
  }).sort((a,b)=>Date.parse(b.endedAt)-Date.parse(a.endedAt)||a.sessionId.localeCompare(b.sessionId));
  const daily: FocusInsightsReport["daily"]=[];
  for(let date=window.startDate;date<=window.endDate;date=calendarDate(date,1)) {
    const entries=sessions.filter(s=>focusDate(new Date(Date.parse(s.endedAt)-1),timezone)===date);
    daily.push({date,durationMs:entries.reduce((sum,s)=>sum+s.durationMs,0),sessions:entries.length});
  }
  const goals=categories.map(c=>({id:c.id,label:c.id===UNCATEGORIZED?"Other focus":c.label,durationMs:sessions.filter(s=>s.categoryId===c.id).reduce((sum,s)=>sum+s.durationMs,0)})).filter(g=>g.durationMs>0).sort((a,b)=>b.durationMs-a.durationMs||a.id.localeCompare(b.id));
  const totalMs=sessions.reduce((sum,s)=>sum+s.durationMs,0);
  const previousReference=new Date(window.startMs-1);
  const previous=focusPeriodWindow(period,previousReference,timezone);
  const previousEvidence=selectFocusEvidence(state,active,previous.startMs,previous.endMs,now.getTime());
  const previousRecordedMs=previousEvidence.ledger.reduce((sum,s)=>sum+s.durationMs,0);
  const observations:string[]=[];
  if(sessions.length>=2&&previousEvidence.ledger.length>=2&&totalMs>previousRecordedMs) observations.push(`You recorded more focus time ${period==="today"?"today than yesterday":period==="week"?"so far this week than last week":"so far this month than last month"}.`);
  if(sessions.length>=2&&goals[0]&&goals[0].id!==UNCATEGORIZED&&(!goals[1]||goals[0].durationMs>goals[1].durationMs)) observations.push(`Most recorded focus in this period went toward ${goals[0].label}.`);
  return {period,timezone,startDate:window.startDate,endDate:window.endDate,totalMs,sessionsCompleted:sessions.length,sessions,daily,goals,observations:observations.slice(0,2),excluded,previousRecordedMs};
}

export function formatFocusDuration(ms: number): string {
  if(ms>0&&ms<1000)return "Less than 1s";
  const seconds=Math.floor(ms/1000);const minutes=Math.floor(seconds/60);const hours=Math.floor(minutes/60);
  if(hours)return `${hours}h ${minutes%60}m`;
  if(minutes)return `${minutes}m${seconds%60?` ${seconds%60}s`:""}`;
  return `${seconds}s`;
}
