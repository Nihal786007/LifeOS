import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { UNCATEGORIZED, attentionCategories, buildAttentionReport, validateAllocation, type AttentionSource, type IntendedAllocation } from "./attentionLedger";
import { readAttentionPreferences, saveAttentionPreferences } from "./attentionPreferences";

function duration(ms: number) { const minutes = Math.floor(ms/60_000); return `${Math.floor(minutes/60)}h ${minutes%60}m`; }
function areaName(id: string, label: string) { return id === UNCATEGORIZED ? "Other focus" : label; }
function AccountMirror({state,accountId,onCreateLifeGoal}: {state: AttentionSource;accountId: string;onCreateLifeGoal?: () => void}) {
  const [allocation,setAllocation] = useState(()=>readAttentionPreferences(window.localStorage,accountId));
  const [draft,setDraft] = useState<Record<string,string>>(()=>Object.fromEntries(allocation?.shares.map(s=>[s.categoryId,String(s.percent)])??[]));
  const [feedback,setFeedback] = useState("");
  const [otherOnlySetup,setOtherOnlySetup] = useState(false);
  const report = buildAttentionReport(state,allocation,new Date());
  const categories = attentionCategories(state);
  const hasLifeGoals = categories.some(category => category.id !== UNCATEGORIZED);
  const showAllocationForm = hasLifeGoals || otherOnlySetup;
  const draftTotal = categories.reduce((sum,c)=>sum+(Number(draft[c.id])||0),0);
  const remaining = Math.round((100-draftTotal)*10)/10;
  const allocationHint = remaining > 0 ? `You have ${remaining}% left to assign.` : remaining < 0 ? `Remove ${Math.abs(remaining)}% to bring your total to 100%.` : "All 100% assigned.";
  // Presentation bands only; the underlying score, coverage and insight rules
  // remain unchanged. Small samples never receive a week-balance verdict.
  const hasComparison = report.alignment !== null && report.totalMs >= 7_200_000;
  const balance = !hasComparison ? "Still taking shape" : report.alignment! >= 90 ? "Great" : report.alignment! >= 75 ? "Good" : report.alignment! >= 50 ? "Okay" : "Off track";
  const planned = [...report.rows].filter(row => (row.intended ?? 0) > 0).sort((a,b)=>(b.intended ?? 0)-(a.intended ?? 0)||a.id.localeCompare(b.id)).slice(0,3);
  const focused = [...report.rows].filter(row => row.durationMs > 0).sort((a,b)=>b.durationMs-a.durationMs||a.id.localeCompare(b.id)).slice(0,3);
  const mismatch = report.insights.find(insight => insight.id === "top-mismatch");
  const largestGap = hasComparison ? [...report.rows].sort((a,b)=>Math.abs(b.actual!-b.intended!)-Math.abs(a.actual!-a.intended!)||a.id.localeCompare(b.id))[0] : undefined;
  const nameOf = (id: string) => { const row=report.rows.find(item=>item.id===id); return row ? areaName(row.id,row.label) : "Other focus"; };
  const difference = !hasComparison ? null : mismatch
    ? `You planned to focus most on ${nameOf(mismatch.categoryIds[0])}, but more of your recorded focus went to ${nameOf(mismatch.categoryIds[1])}.`
    : largestGap && Math.abs(largestGap.actual!-largestGap.intended!) >= 0.05
      ? `${areaName(largestGap.id,largestGap.label)} received ${largestGap.actual!>largestGap.intended! ? "more" : "less"} of your recorded focus than you planned.`
      : "Your recorded focus closely matches what you said matters most.";
  function save() {
    const value: IntendedAllocation = {version:1,updatedAt:new Date().toISOString(),shares:categories.map(c=>({categoryId:c.id,percent:draft[c.id]?.trim()?Number(draft[c.id]):0}))};
    const error = validateAllocation(value,categories);
    if (error) {setFeedback("Choose how much focus each area should receive. Your shares must add up to 100%.");return;}
    try {saveAttentionPreferences(window.localStorage,accountId,value);setAllocation(value);setFeedback("What matters most is saved for this account on this device.");}
    catch {setFeedback("Your priorities could not be saved. Your previous choices are unchanged.");}
  }
  return <section aria-labelledby="reality-mirror-title" className="lifeos-surface-panel p-4 sm:p-6 space-y-4">
    <div><p className="lifeos-page-eyebrow">This week</p><h2 id="reality-mirror-title" className="text-xl font-bold text-lifeos-text">Reality Mirror</h2><p className="text-sm text-lifeos-text-secondary">Does your focus reflect what matters to you?</p></div>
    {report.totalMs===0 ? <p className="text-sm text-lifeos-text-secondary">Use Focus Mode a few times this week and LifeOS will show where your attention is going.</p> : <>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-lifeos-text-secondary">Week balance</p><p className="text-2xl font-semibold text-lifeos-text">{balance}</p></div><div><p className="text-sm text-lifeos-text-secondary">How much LifeOS recorded</p><p className="text-lg font-semibold text-lifeos-text">{duration(report.totalMs)} of focus</p></div></div>
      {!hasComparison && <p className="text-sm text-lifeos-text-secondary">{report.allocationError ? "Choose what matters most in View details to compare it with your focus." : "A few more Focus sessions will help this comparison take shape."}</p>}
    </>}
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-lifeos-border p-4"><h3 className="font-semibold text-lifeos-text">What matters most</h3>{!hasLifeGoals ? <><p className="mt-2 text-sm text-lifeos-text-secondary">Reality Mirror uses active Life Goals to define what matters most. Create a Life Goal to start choosing your priorities.</p>{onCreateLifeGoal && <button type="button" onClick={onCreateLifeGoal} className="mt-3 rounded-xl border border-lifeos-border bg-lifeos-selected px-4 py-3 font-semibold focus-visible:outline focus-visible:outline-2">Create Life Goal</button>}{planned.length>0 && <p className="mt-2 text-sm text-lifeos-text-secondary">You’re currently tracking Other focus only.</p>}</> : planned.length ? <ol className="mt-2 list-decimal pl-5 space-y-1 text-sm text-lifeos-text-secondary">{planned.map(row=><li key={row.id} className="break-words">{areaName(row.id,row.label)}</li>)}</ol> : <p className="mt-2 text-sm text-lifeos-text-secondary">Choose your priorities in View details.</p>}</div>
      <div className="rounded-xl border border-lifeos-border p-4"><h3 className="font-semibold text-lifeos-text">Where your focus went</h3>{focused.length ? <ol className="mt-2 list-decimal pl-5 space-y-1 text-sm text-lifeos-text-secondary">{focused.map(row=><li key={row.id} className="break-words">{areaName(row.id,row.label)}</li>)}</ol> : <p className="mt-2 text-sm text-lifeos-text-secondary">Your completed Focus sessions will appear here.</p>}</div>
    </div>
    {difference && <p className="rounded-xl bg-lifeos-selected p-4 text-sm text-lifeos-text">{difference}</p>}
    <details className="border-t border-lifeos-divider pt-3">
      <summary className="cursor-pointer py-2 font-semibold focus-visible:outline focus-visible:outline-2">View details</summary>
      <p className="text-sm text-lifeos-text-secondary py-3">{report.weekStart} – {report.weekEnd}. {hasLifeGoals ? "Choose what matters most by sharing 100% across your areas." : "Add active Life Goals to compare your priorities with your focus."} Changes compare your current choices with this week's recorded focus. Saved only for this account on this device.</p>
      <p className="text-sm text-lifeos-text-secondary mb-3">Week balance: {report.alignment===null?"Not available":`${report.alignment.toFixed(1)}%`} · How much LifeOS recorded: {duration(report.totalMs)}. This covers Focus sessions, not your whole week.</p>
      {report.allocationError && (hasLifeGoals || allocation) && <p role="status" className="text-sm text-lifeos-text-secondary mb-3">{allocation ? "Your saved choices need reviewing because an area is no longer active. Nothing has been redistributed." : "Choose what matters most to start comparing."}</p>}
      {!hasLifeGoals && <div className="mb-4 text-sm text-lifeos-text-secondary"><p>If you prefer not to use Life Goals, you can track uncategorized focus only. This won’t distinguish different priorities.</p><button type="button" onClick={()=>{setOtherOnlySetup(!otherOnlySetup);if(!otherOnlySetup)setDraft({...draft,[UNCATEGORIZED]:"100"});}} aria-expanded={otherOnlySetup} className="mt-2 rounded-lg border border-lifeos-border px-3 py-2 focus-visible:outline focus-visible:outline-2">{otherOnlySetup ? "Close Other focus setup" : "Track Other focus only"}</button></div>}
      {showAllocationForm && <form onSubmit={e=>{e.preventDefault();save();}} className="space-y-4">
        {report.rows.map(row=><div key={row.id} className="grid gap-3 border-b border-lifeos-divider pb-3 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)]">
          <p className="break-words font-semibold">{areaName(row.id,row.label)}</p>
          <label className="text-sm text-lifeos-text-secondary">What matters most (%)<input type="number" min="0" max="100" step="0.1" aria-label={`${areaName(row.id,row.label)} planned focus percent`} value={draft[row.id]??""} onChange={e=>setDraft({...draft,[row.id]:e.target.value})} className="w-full rounded-lg border border-lifeos-border bg-lifeos-surface px-3 py-2 text-lifeos-text"/></label>
          <div aria-label={`${areaName(row.id,row.label)}: planned ${row.intended===null?"not configured":row.intended.toFixed(1)+" percent"}, recorded focus ${row.actual===null?"not available":row.actual.toFixed(1)+" percent"}`}>
            <p className="text-sm">What matters most: {row.intended===null?"—":`${row.intended.toFixed(1)}%`}</p><div aria-hidden="true" className="h-2 rounded bg-lifeos-hover"><div className="h-2 rounded bg-lifeos-accent" style={{width:`${row.intended??0}%`}}/></div>
            <p className="mt-2 text-sm">Where your focus went: {row.actual===null?"—":`${row.actual.toFixed(1)}%`} · {duration(row.durationMs)}</p><div aria-hidden="true" className="h-2 rounded bg-lifeos-hover"><div className="h-2 rounded border border-lifeos-text bg-lifeos-text-secondary" style={{width:`${row.actual??0}%`}}/></div>
          </div>
        </div>)}
        <p role="status" className="text-sm text-lifeos-text-secondary">{allocationHint}</p>
        <button type="submit" className="rounded-xl border border-lifeos-border bg-lifeos-selected px-4 py-3 font-semibold focus-visible:outline focus-visible:outline-2">Save what matters most</button>
        {feedback && <p role="status" className="text-sm">{feedback}</p>}
      </form>}
      <details className="mt-4"><summary className="cursor-pointer py-2">Recorded sessions &amp; limitations</summary><ul className="list-disc pl-5 text-sm text-lifeos-text-secondary space-y-2"><li>Only completed Focus sessions count. Scheduled Google events, habits and task counts do not represent time spent.</li><li>Areas follow current planning links. Missing or inactive links appear as Other focus.</li>{report.excluded>0 && <li>{report.excluded} records were left out because their timing was incomplete, overlapping or crossed a week boundary.</li>}</ul>
        <p className="mt-3 text-sm">{report.ledger.length} completed Focus sessions</p><ul className="text-xs space-y-2 mt-2">{report.ledger.map(entry=><li key={entry.sessionId} className="break-words">{nameOf(entry.categoryId)} · {duration(entry.durationMs)} · {new Date(entry.startedAt).toLocaleString()} → {new Date(entry.endedAt).toLocaleString()} · Execution record {entry.executionId}, session {entry.sessionId}</li>)}</ul>
      </details>
    </details>
  </section>;
}
export default function RealityMirror({state,onCreateLifeGoal}: {state: AttentionSource;onCreateLifeGoal?: () => void}) {
  const {identity} = useAuth();
  return identity ? <AccountMirror key={identity.userId} accountId={identity.userId} state={state} onCreateLifeGoal={onCreateLifeGoal}/> : null;
}
