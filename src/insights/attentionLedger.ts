import type { ExecutionRecord } from "../shared/execution";
import type { TaskRelationshipState } from "../engines/TaskRelationshipEngine";
import { TaskRelationshipEngine } from "../engines/TaskRelationshipEngine.ts";
import { isFocusCompletionRecord } from "../focus/focusAudit.ts";

export const UNCATEGORIZED = "uncategorized";
export interface AttentionCategory { id: string; label: string }
export interface IntendedAllocation { version: 1; updatedAt: string; shares: { categoryId: string; percent: number }[] }
export interface AttentionSource extends TaskRelationshipState { executionRecords: readonly ExecutionRecord[] }
export interface AttentionEntry {
  sessionId: string; executionId: number; recordIndex: number; taskId: number;
  categoryId: string; durationMs: number; startedAt: string; endedAt: string;
}
export interface AttentionComparison extends AttentionCategory { durationMs: number; actual: number | null; intended: number | null }
export interface AttentionReport {
  version: "1.0"; weekStart: string; weekEnd: string; totalMs: number;
  coverage: "None" | "Very limited" | "Limited" | "Moderate" | "Stronger signal";
  alignment: number | null; allocationError: string | null;
  rows: AttentionComparison[]; ledger: AttentionEntry[];
  insights: { id: string; text: string; categoryIds: string[] }[];
  excluded: number; limitations: string[];
}

export function attentionCategories(state: TaskRelationshipState): AttentionCategory[] {
  // LifeGoal has no archive flag. Completed goals are inactive for allocation.
  return [...state.lifeGoals.filter(goal => !goal.completed).sort((a,b)=>a.id-b.id)
    .map(goal=>({ id: `goal:${goal.id}`, label: goal.title })), {id: UNCATEGORIZED, label: "Uncategorized"}];
}
export function validateAllocation(value: unknown, categories?: readonly AttentionCategory[]): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Configure your intended allocation.";
  const v = value as IntendedAllocation;
  if (Object.keys(v).sort().join(",") !== "shares,updatedAt,version" || v.version !== 1 || typeof v.updatedAt !== "string" || !Number.isFinite(Date.parse(v.updatedAt)) || !Array.isArray(v.shares) || v.shares.length === 0 || v.shares.length > 100) return "Invalid allocation format.";
  const seen = new Set<string>();
  for (const share of v.shares) {
    if (!share || Object.keys(share).sort().join(",") !== "categoryId,percent" || typeof share.categoryId !== "string" || !/^(uncategorized|goal:\d+)$/.test(share.categoryId) || seen.has(share.categoryId) || !Number.isFinite(share.percent) || share.percent < 0 || share.percent > 100) return "Use unique categories and percentages between 0 and 100.";
    seen.add(share.categoryId);
    if (categories && !categories.some(c=>c.id===share.categoryId)) return "A saved category is no longer active. Review your allocation; shares have not been redistributed.";
  }
  return Math.abs(v.shares.reduce((sum,s)=>sum+s.percent,0)-100) < 1e-8 ? null : "Intended shares must total 100%.";
}
function localDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
export function attentionWeek(reference: Date) {
  // Same local Monday–Sunday semantics as Reviews and Analytics V2; calendar
  // arithmetic preserves DST boundaries (never add a fixed 168-hour interval).
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  start.setDate(start.getDate() - (start.getDay()+6)%7);
  const end = new Date(start); end.setDate(end.getDate()+7);
  const sunday = new Date(end); sunday.setDate(sunday.getDate()-1);
  return { start, end, weekStart: localDate(start), weekEnd: localDate(sunday) };
}
export function trackingCoverage(ms: number): AttentionReport["coverage"] {
  const hours = ms/3_600_000;
  return hours === 0 ? "None" : hours < 2 ? "Very limited" : hours < 5 ? "Limited" : hours <= 15 ? "Moderate" : "Stronger signal";
}
export function buildAttentionReport(state: AttentionSource, allocation: IntendedAllocation | null, now: Date): AttentionReport {
  const week = attentionWeek(now);
  const categories = attentionCategories(state);
  const active = new Set(categories.map(c=>c.id));
  const groups = new Map<string, AttentionEntry[]>();
  let excluded = 0;
  state.executionRecords.forEach((record,recordIndex)=>{
    if (!isFocusCompletionRecord(record) || record.metadata?.source !== "focus_mode") return;
    const m = record.metadata!;
    const start = typeof m.startedAt === "string" ? Date.parse(m.startedAt) : NaN;
    const end = typeof m.endedAt === "string" ? Date.parse(m.endedAt) : NaN;
    if (Number.isFinite(end) && (end <= week.start.getTime() || start >= week.end.getTime())) return;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < week.start.getTime() || end > week.end.getTime() || end > now.getTime() || end <= start || !Number.isSafeInteger(m.durationMs) || Number(m.durationMs) <= 0 || Number(m.durationMs) > end-start || !Number.isSafeInteger(m.taskId) || m.taskId !== record.entityId || typeof m.focusSessionId !== "string" || !m.focusSessionId || Date.parse(record.createdAt) !== end) { excluded++; return; }
    const relationship = TaskRelationshipEngine.resolve(state, Number(m.taskId));
    const goalId = relationship?.lifeGoal?.id;
    const candidate = goalId === undefined ? UNCATEGORIZED : `goal:${goalId}`;
    const entry: AttentionEntry = { sessionId: m.focusSessionId, executionId: record.id, recordIndex, taskId: Number(m.taskId), categoryId: active.has(candidate)?candidate:UNCATEGORIZED, durationMs: Number(m.durationMs), startedAt: String(m.startedAt), endedAt: String(m.endedAt) };
    groups.set(entry.sessionId,[...(groups.get(entry.sessionId)??[]),entry]);
  });
  const candidates: AttentionEntry[] = [];
  for (const group of groups.values()) {
    const first = group[0];
    if (group.some(e=>e.taskId!==first.taskId || e.durationMs!==first.durationMs || e.startedAt!==first.startedAt || e.endedAt!==first.endedAt)) { excluded += group.length; continue; }
    candidates.push(first); // Independent execution IDs do not define session identity.
  }
  // Overlapping sessions cannot be apportioned with pause totals alone. Omit
  // both rather than count simultaneous tracked time twice or guess a split.
  const ledger = candidates.filter((entry,i)=>!candidates.some((other,j)=>i!==j && Date.parse(entry.startedAt)<Date.parse(other.endedAt) && Date.parse(other.startedAt)<Date.parse(entry.endedAt)))
    .sort((a,b)=>a.startedAt.localeCompare(b.startedAt)||a.sessionId.localeCompare(b.sessionId));
  excluded += candidates.length-ledger.length;
  const totalMs = ledger.reduce((sum,e)=>sum+e.durationMs,0);
  const allocationError = validateAllocation(allocation,categories);
  const rows = categories.map(c=>{
    const durationMs = ledger.filter(e=>e.categoryId===c.id).reduce((sum,e)=>sum+e.durationMs,0);
    return {...c,durationMs,actual:totalMs>0?durationMs/totalMs*100:null,intended:allocationError?null:allocation!.shares.find(s=>s.categoryId===c.id)?.percent??0};
  });
  // Total variation distance: 100 - half the sum of percentage-point gaps.
  const alignment = !allocationError && totalMs>0 ? Math.max(0,Math.min(100,100-rows.reduce((sum,r)=>sum+Math.abs(r.actual!-r.intended!),0)/2)) : null;
  const insights: AttentionReport["insights"] = [];
  if (alignment !== null && totalMs>=2*3_600_000) {
    const intendedRank = [...rows].sort((a,b)=>b.intended!-a.intended!||a.id.localeCompare(b.id));
    const actualRank = [...rows].sort((a,b)=>b.actual!-a.actual!||a.id.localeCompare(b.id));
    if (intendedRank.length>1 && intendedRank[0].intended!>intendedRank[1].intended! && actualRank[0].actual!>actualRank[1].actual! && intendedRank[0].id!==actualRank[0].id) insights.push({id:"top-mismatch",text:`${intendedRank[0].label} had the highest declared share, but ${actualRank[0].label} received the most tracked focus.`,categoryIds:[intendedRank[0].id,actualRank[0].id]});
    const gaps = [...rows].sort((a,b)=>(b.actual!-b.intended!)-(a.actual!-a.intended!)||a.id.localeCompare(b.id));
    for (const [id,row] of [["over",gaps[0]],["under",gaps[gaps.length-1]]] as const) {
      const delta = row.actual!-row.intended!;
      if (Math.abs(delta)<0.05) continue;
      insights.push({id,text:`${row.label} received ${Math.abs(delta).toFixed(1)} percentage points ${delta>0?"more":"less"} tracked focus than intended.`,categoryIds:[row.id]});
    }
  }
  return {version:"1.0",weekStart:week.weekStart,weekEnd:week.weekEnd,totalMs,coverage:trackingCoverage(totalMs),alignment,allocationError,rows,ledger,insights:insights.slice(0,3),excluded,limitations:["Current intended allocation compared with this week's measured focus; not your total real-world time.","Categories use current planning links; deleted, completed, or missing links become Uncategorized. Historical allocations and relationship snapshots are unavailable.","Tasks, habits and Google Calendar commitments are not measured focus and are not counted.",...(excluded?[`${excluded} ambiguous, invalid, overlapping or cross-week focus records excluded; pause timing cannot be reconstructed.`]:[])]};
}
