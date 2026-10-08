import { useState } from "react";
import Button from "../ui/Button";
import { useAtlasCanonicalState } from "../../atlas/state/useAtlasCanonicalState";
import { useGoogleCalendar } from "../../connectors/googleCalendar/GoogleCalendarContext";
import { readAttentionPreferences } from "../../insights/attentionPreferences";
import { analyzeOpportunityCost } from "../../decisions/opportunityCostEngine";

// Native datetime-local has no offset selector. Reject skipped/repeated wall
// times rather than quietly choosing one DST occurrence for the user.
function deviceInstant(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  const wall = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  if (!Number.isFinite(date.getTime()) || wall(date) !== value) return "invalid";
  for (let minutes = -180; minutes <= 180; minutes += 15) {
    if (minutes && wall(new Date(date.getTime() + minutes * 60000)) === value) return "invalid";
  }
  return date.toISOString();
}

export default function OpportunityCostSection({ accountId }: { accountId: string }) {
  const state = useAtlasCanonicalState();
  const { connection, readModel } = useGoogleCalendar();
  const [draft, setDraft] = useState({ title: "", date: "", start: "", end: "", duration: "", goal: "" });
  const [submitted, setSubmitted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  function edit(field: keyof typeof draft, value: string) { setDraft(d => ({ ...d, [field]: value })); setSubmitted(false); }
  const timed = !!(draft.start || draft.end);
  const result = submitted ? analyzeOpportunityCost({ state, now,
    allocation: readAttentionPreferences(window.localStorage, accountId),
    calendar: { connected: connection.state === "connected", readModel },
    proposed: { title: draft.title.trim(), ...(timed ? { startAt: deviceInstant(draft.start), endAt: deviceInstant(draft.end) } : draft.date ? { date: draft.date } : {}),
      ...(draft.duration ? { durationMinutes: Number(draft.duration) } : {}), ...(draft.goal ? { linkedGoalId: Number(draft.goal) } : {}) },
  }) : null;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <section aria-labelledby="opportunity-title" className="lifeos-surface-panel space-y-5 p-5 sm:p-6">
    <header><p className="lifeos-page-eyebrow">Considering something new?</p><h2 id="opportunity-title" className="mt-2 text-xl font-semibold text-lifeos-text">Understand the trade-off</h2><p className="mt-2 text-sm leading-6 text-lifeos-text-secondary">See recorded conflicts and possible trade-offs. Nothing is scheduled or changed.</p></header>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); setNow(new Date()); setSubmitted(true); }}>
      <label className="block text-sm text-lifeos-text-secondary">What do you want to do?<input className="lifeos-field mt-2 w-full" value={draft.title} maxLength={120} onChange={e => edit("title", e.target.value)} placeholder="Work on LifeOS" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0 text-sm text-lifeos-text-secondary">Start (optional)<input type="datetime-local" className="lifeos-field mt-2 w-full min-w-0" value={draft.start} onChange={e => edit("start", e.target.value)} /></label>
        <label className="block min-w-0 text-sm text-lifeos-text-secondary">End (optional)<input type="datetime-local" className="lifeos-field mt-2 w-full min-w-0" value={draft.end} onChange={e => edit("end", e.target.value)} /></label>
      </div>
      <p className="text-xs leading-5 text-lifeos-muted">Times use this device’s timezone: {timezone}. Use the next date for overnight plans. Skipped or repeated daylight-saving times cannot be resolved here.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {!timed && <label className="block min-w-0 text-sm text-lifeos-text-secondary">Date without a time (optional)<input type="date" className="lifeos-field mt-2 w-full min-w-0" value={draft.date} onChange={e => edit("date", e.target.value)} /></label>}
        <label className="block text-sm text-lifeos-text-secondary">Duration in minutes (optional)<input type="number" min="1" max="44640" className="lifeos-field mt-2 w-full" value={draft.duration} onChange={e => edit("duration", e.target.value)} /></label>
      </div>
      <label className="block text-sm text-lifeos-text-secondary">Related Life Goal (optional)<select className="lifeos-field mt-2 w-full" value={draft.goal} onChange={e => edit("goal", e.target.value)}><option value="">No related goal</option>{state.lifeGoals.filter(g => !g.completed).map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
      {!state.lifeGoals.some(g => !g.completed) && <p className="text-sm text-lifeos-muted">No active Life Goals are recorded. You can still check schedule evidence.</p>}
      <Button type="submit">Check trade-offs</Button>
    </form>
    {result && <div aria-live="polite" className="space-y-4 border-t border-lifeos-divider pt-4">
      {result.errors.length ? <ul role="alert" className="list-disc space-y-2 pl-5 text-sm text-lifeos-danger">{result.errors.map(e => <li key={e}>{e}</li>)}</ul> : <>
        <p className="lifeos-page-eyebrow">Your trade-offs</p>
        <div className="grid gap-4 lg:grid-cols-3">{[
          { title: "Schedule", items: result.conflicts, empty: timed && connection.state === "connected" ? "No recorded schedule conflicts found in loaded timed events. Your actual availability may differ." : "Not enough schedule evidence to assess conflicts." },
          { title: "Priorities", items: result.possibleTradeoffs, empty: "No supported priority trade-off found. This does not prove your priorities are balanced." },
          { title: "Workload", items: result.pressure, empty: "No applicable Task or Habit pressure is recorded." },
        ].map(group => <article key={group.title} className="min-w-0 rounded-xl border border-lifeos-border p-4"><h3 className="font-semibold text-lifeos-text">{group.title}</h3>{group.items.length ? <><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-lifeos-text-secondary">{group.items.slice(0, 3).map(e => <li key={e.id} className="break-words">{e.explanation}</li>)}</ul>{group.items.length > 3 && <p className="mt-2 text-xs text-lifeos-muted">More recorded items are available in View details.</p>}</> : <p className="mt-2 text-sm leading-6 text-lifeos-text-secondary">{group.empty}</p>}</article>)}</div>
        <h3 className="font-semibold text-lifeos-text">Your options</h3><ul className="list-disc space-y-2 pl-5 text-sm text-lifeos-text-secondary">{result.alternatives.map(a => <li key={a}>{a}</li>)}</ul>
        <details><summary className="cursor-pointer rounded py-2 font-semibold text-lifeos-text">View details</summary>
          <p className="mt-2 text-sm text-lifeos-text-secondary">Proposed duration: {result.durationMinutes === null ? "unknown" : `${result.durationMinutes} minutes`}. Unique recorded overlap: {result.overlapMinutes} minutes.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-lifeos-text-secondary">{result.conflicts.map(e => <li key={e.id}>{e.explanation} Overlap: {e.overlapMinutes} minutes.</li>)}{result.possibleTradeoffs.map(e => <li key={e.id}>{e.explanation}</li>)}{result.pressure.map(e => <li key={e.id}>{e.explanation}</li>)}{result.limitations.map(l => <li key={l}>{l}</li>)}</ul>
        </details>
        <p className="text-xs text-lifeos-muted">Suggestions only. No task, event, Focus session, memory, or XP is created.</p>
      </>}
    </div>}
  </section>;
}
