import { useState } from "react";
import Button from "../components/ui/Button";
import { useAuth } from "../auth/AuthContext";
import { useAtlasCanonicalState } from "../atlas/state/useAtlasCanonicalState";
import { useGoogleCalendar } from "../connectors/googleCalendar/GoogleCalendarContext";
import { readAttentionPreferences } from "../insights/attentionPreferences";
import { compareDecisions, DECISION_WEIGHTS } from "../decisions/decisionEngine";
import type { DecisionOption, DecisionReference } from "../decisions/decisionEngine";

interface Draft { label: string; link: string; start: string; end: string }
const blank = (): Draft => ({ label: "", link: "", start: "", end: "" });
function iso(value: string): string { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toISOString() : value; }

function AccountDecisions({ accountId }: { accountId: string }) {
  const state = useAtlasCanonicalState();
  const { connection, readModel } = useGoogleCalendar();
  const [kind, setKind] = useState<DecisionOption["kind"]>("task");
  const [drafts, setDrafts] = useState<Draft[]>([blank(), blank()]);
  const [submitted, setSubmitted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const choices = [
    ...state.tasks.filter(t => !t.completed).map(t => ({ value: `task:${t.id}`, kind: "task", label: t.title })),
    ...state.lifeGoals.filter(g => !g.completed).map(g => ({ value: `goal:${g.id}`, kind: "goal", label: g.title })),
    ...state.weeklyTargets.filter(w => !w.completed).map(w => ({ value: `weekly-focus:${w.id}`, kind: "weekly-focus", label: w.title })),
  ];
  const options: DecisionOption[] = drafts.map((draft, i) => {
    const selection = choices.find(c => c.value === draft.link);
    const [refKind, id] = draft.link.split(":");
    return { id: `option-${i + 1}`, kind, label: kind === "commitment" ? draft.label.trim() : selection?.label ?? "",
      ...(draft.link ? { reference: { kind: refKind as DecisionReference["kind"], entityId: Number(id) } } : {}),
      ...(draft.start || draft.end ? { window: { start: iso(draft.start), end: iso(draft.end) } } : {}) };
  });
  // Recompute against live read-only state: deleted references never retain an
  // old recommendation. Account remount discards all ephemeral input/results.
  const result = submitted ? compareDecisions({ state, options, now, allocation: readAttentionPreferences(window.localStorage, accountId), calendar: { connected: connection.state === "connected", readModel } }) : null;
  const recommended = result?.comparisons.find(c => c.optionId === result.recommendedOptionId);
  function edit(index: number, patch: Partial<Draft>) {
    setDrafts(current => current.map((draft, i) => i === index ? { ...draft, ...patch } : draft)); setSubmitted(false);
  }
  return <div className="space-y-6">
    <header className="lifeos-surface-panel p-5 sm:p-7">
      <p className="lifeos-page-eyebrow">Pause · Compare · Decide</p>
      <h1 className="mt-2 text-3xl font-bold text-lifeos-text">Decisions</h1>
      <p className="mt-2 text-sm leading-6 text-lifeos-text-secondary">Compare your options using what LifeOS has recorded. You keep the final say.</p>
    </header>
    <form className="lifeos-surface-panel space-y-5 p-5 sm:p-6" onSubmit={event => { event.preventDefault(); setNow(new Date()); setSubmitted(true); }}>
      <h2 className="text-lg font-semibold text-lifeos-text">Compare options</h2>
      <label className="block text-sm text-lifeos-text-secondary">What are you comparing?
        <select className="lifeos-field mt-2 w-full" value={kind} onChange={e => { setKind(e.target.value as DecisionOption["kind"]); setDrafts([blank(), blank()]); setSubmitted(false); }}>
          <option value="task">Tasks</option><option value="goal">Life Goals</option><option value="weekly-focus">Weekly Focus</option><option value="commitment">Commitments</option>
        </select>
      </label>
      {kind !== "commitment" && !choices.some(c => c.kind === kind) && <p className="lifeos-empty-state">No active {kind === "task" ? "tasks" : kind === "goal" ? "Life Goals" : "Weekly Focus items"} to compare. You can compare unlinked commitments instead; LifeOS will state what is unknown.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {drafts.map((draft, i) => <fieldset key={i} className="min-w-0 space-y-3 rounded-xl border border-lifeos-border p-4">
          <legend className="px-2 font-semibold text-lifeos-text">Option {String.fromCharCode(65 + i)}</legend>
          {kind === "commitment" && <label className="block text-sm text-lifeos-text-secondary">Name<input className="lifeos-field mt-2 w-full" value={draft.label} maxLength={120} onChange={e => edit(i, { label: e.target.value })} placeholder={i === 0 ? "SAT practice" : "Project work"} /></label>}
          <label className="block text-sm text-lifeos-text-secondary">{kind === "commitment" ? "Link to an existing item (optional)" : "Choose an existing item"}
            <select className="lifeos-field mt-2 w-full" value={draft.link} onChange={e => edit(i, { link: e.target.value })}>
              <option value="">{kind === "commitment" ? "Unlinked — limited evidence" : "Choose an item"}</option>
              {choices.filter(c => kind === "commitment" || c.kind === kind).map(c => <option key={c.value} value={c.value}>{kind === "commitment" ? `${c.kind}: ` : ""}{c.label}</option>)}
            </select>
          </label>
          {kind === "commitment" && <details><summary className="cursor-pointer py-2 text-sm text-lifeos-text-secondary">Time window (optional)</summary>
            <p className="mb-2 text-xs leading-5 text-lifeos-muted">Entered in this device's local timezone. No duration or availability is inferred.</p>
            <label className="block text-sm text-lifeos-text-secondary">Start<input type="datetime-local" className="lifeos-field mt-1 w-full min-w-0" value={draft.start} onChange={e => edit(i, { start: e.target.value })} /></label>
            <label className="mt-2 block text-sm text-lifeos-text-secondary">End<input type="datetime-local" className="lifeos-field mt-1 w-full min-w-0" value={draft.end} onChange={e => edit(i, { end: e.target.value })} /></label>
          </details>}
        </fieldset>)}
      </div>
      <div className="flex flex-wrap gap-3">
        {kind === "task" && drafts.length === 2 && <Button type="button" variant="secondary" onClick={() => { setDrafts([...drafts, blank()]); setSubmitted(false); }}>Add third task</Button>}
        {drafts.length === 3 && <Button type="button" variant="secondary" onClick={() => { setDrafts(drafts.slice(0, 2)); setSubmitted(false); }}>Remove third option</Button>}
        <Button type="submit">Compare</Button>
      </div>
    </form>
    {result && <section aria-labelledby="decision-result" className="lifeos-surface-panel space-y-4 p-5 sm:p-6" aria-live="polite">
      <p className="lifeos-page-eyebrow">{result.coverage === "supported" ? "Based on current recorded evidence" : "Based on limited LifeOS data"}</p>
      <h2 id="decision-result" className="break-words text-xl font-semibold text-lifeos-text">{recommended ? `Best fit right now: ${recommended.label}` : "No forced winner"}</h2>
      <p className="text-sm leading-6 text-lifeos-text-secondary">{result.explanation}</p>
      {result.errors.length > 0 && <ul role="alert" className="list-disc space-y-2 pl-5 text-sm text-lifeos-danger">{result.errors.map(error => <li key={error}>{error}</li>)}</ul>}
      <div className="grid gap-4 lg:grid-cols-2">{result.comparisons.map(c => <article key={c.optionId} className="min-w-0 rounded-xl border border-lifeos-border p-4">
        <h3 className="break-words font-semibold text-lifeos-text">{c.label}</h3>
        <h4 className="mt-3 text-sm font-semibold text-lifeos-text">Why it fits</h4>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-lifeos-text-secondary">{c.positives.length ? c.positives.map((e, i) => <li key={i}>{e.explanation}</li>) : <li>No supported priority advantage is recorded.</li>}</ul>
        <h4 className="mt-3 text-sm font-semibold text-lifeos-text">Trade-offs & unknowns</h4>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-lifeos-text-secondary">{[...c.tradeoffs.map(e => e.explanation), ...c.context.filter(e => e.label === "Recent recorded Focus").map(e => e.explanation), ...c.limitations].map((text, i) => <li key={i}>{text}</li>)}</ul>
      </article>)}</div>
      {result.comparisons.length > 0 && <details className="border-t border-lifeos-divider pt-3"><summary className="cursor-pointer rounded py-2 font-semibold text-lifeos-text">View details</summary>
        <p className="mt-3 text-xs leading-6 text-lifeos-muted">Priority: High +{DECISION_WEIGHTS.high}, Medium +{DECISION_WEIGHTS.medium}, Low +{DECISION_WEIGHTS.low}. Overdue +3; due today +2 (not both). Highest declared focus share +3; Mirror under-attention +2, over-attention −1; timed calendar overlap −3. Focus momentum and weekly load add no points. These rules compare current evidence, not future outcomes.</p>
        {result.comparisons.map(c => <section key={c.optionId} className="mt-4"><h3 className="font-semibold text-lifeos-text">{c.label} · score {c.score}</h3><ul className="mt-2 space-y-2 text-sm leading-6 text-lifeos-text-secondary">{[...c.positives, ...c.tradeoffs, ...c.context].map((e, i) => <li key={i} className="break-words">{e.label}: {e.explanation} {e.label === "Declared focus share" ? `(${e.value}%)` : ""} · {e.points > 0 ? "+" : ""}{e.points} points</li>)}</ul></section>)}
      </details>}
      <p className="text-xs leading-5 text-lifeos-muted">Nothing is created, scheduled, completed, or remembered by this comparison.</p>
    </section>}
  </div>;
}
export default function Decisions() {
  const { identity } = useAuth();
  return identity ? <AccountDecisions key={identity.userId} accountId={identity.userId} /> : null;
}
