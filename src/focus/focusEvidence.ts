import type { ExecutionRecord } from "../shared/execution";
import type { TaskRelationshipState } from "../engines/TaskRelationshipEngine";
import { TaskRelationshipEngine } from "../engines/TaskRelationshipEngine.ts";
import { isFocusCompletionRecord } from "./focusAudit.ts";

export interface FocusEvidenceSource extends TaskRelationshipState { executionRecords: readonly ExecutionRecord[] }
export interface FocusEvidenceEntry {
  sessionId: string; executionId: number; recordIndex: number; taskId: number;
  categoryId: string; durationMs: number; startedAt: string; endedAt: string;
}

/** Shared measured-evidence selector. Extracted unchanged from Reality Mirror.
 * Whole sessions must fit the window: pause totals cannot be split across its
 * boundaries. Identical audit copies count once; conflicting copies and both
 * overlapping sessions are excluded. No historical relationship inference.
 */
export function selectFocusEvidence(state: FocusEvidenceSource, activeCategories: ReadonlySet<string>, startMs: number, endMs: number, nowMs: number) {
  const groups = new Map<string, FocusEvidenceEntry[]>();
  let excluded = 0;
  state.executionRecords.forEach((record,recordIndex)=>{
    if (!isFocusCompletionRecord(record) || record.metadata?.source !== "focus_mode") return;
    const m = record.metadata!;
    const start = typeof m.startedAt === "string" ? Date.parse(m.startedAt) : NaN;
    const end = typeof m.endedAt === "string" ? Date.parse(m.endedAt) : NaN;
    if (Number.isFinite(end) && (end <= startMs || start >= endMs)) return;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < startMs || end > endMs || end > nowMs || end <= start || !Number.isSafeInteger(m.durationMs) || Number(m.durationMs) <= 0 || Number(m.durationMs) > end-start || !Number.isSafeInteger(m.taskId) || m.taskId !== record.entityId || typeof m.focusSessionId !== "string" || !m.focusSessionId || Date.parse(record.createdAt) !== end) { excluded++; return; }
    const relationship = TaskRelationshipEngine.resolve(state, Number(m.taskId));
    const goalId = relationship?.lifeGoal?.id;
    const candidate = goalId === undefined ? "uncategorized" : `goal:${goalId}`;
    const entry: FocusEvidenceEntry = { sessionId: m.focusSessionId, executionId: record.id, recordIndex, taskId: Number(m.taskId), categoryId: activeCategories.has(candidate)?candidate:"uncategorized", durationMs: Number(m.durationMs), startedAt: String(m.startedAt), endedAt: String(m.endedAt) };
    groups.set(entry.sessionId,[...(groups.get(entry.sessionId)??[]),entry]);
  });
  const candidates: FocusEvidenceEntry[] = [];
  for (const group of groups.values()) {
    const first = group[0];
    if (group.some(e=>e.taskId!==first.taskId || e.durationMs!==first.durationMs || e.startedAt!==first.startedAt || e.endedAt!==first.endedAt)) { excluded += group.length; continue; }
    candidates.push(first);
  }
  const ledger = candidates.filter((entry,i)=>!candidates.some((other,j)=>i!==j && Date.parse(entry.startedAt)<Date.parse(other.endedAt) && Date.parse(other.startedAt)<Date.parse(entry.endedAt)))
    .sort((a,b)=>a.startedAt.localeCompare(b.startedAt)||a.sessionId.localeCompare(b.sessionId));
  excluded += candidates.length-ledger.length;
  return { ledger, excluded };
}
