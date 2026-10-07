import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import RealityMirror from "../insights/RealityMirror";
import { readAttentionPreferences } from "../insights/attentionPreferences";
import { buildWeeklyReviewSummary, reviewFocusDuration } from "./weeklyReviewIntelligence";
import type { ReviewInsight } from "./weeklyReviewIntelligence";
import type { ReviewSourceState } from "./reviewEngine";

function InsightGroup({ title, items, empty }: { title: string; items: ReviewInsight[]; empty: string }) {
  return <section className="min-w-0 rounded-xl border border-lifeos-border p-4">
    <h3 className="font-semibold text-lifeos-text">{title}</h3>
    {items.length ? <ul className="mt-3 list-disc space-y-3 pl-5 text-sm leading-6 text-lifeos-text-secondary">
      {items.map(item => <li key={item.id} className="break-words">{item.text}</li>)}
    </ul> : <p className="mt-3 text-sm leading-6 text-lifeos-text-secondary">{empty}</p>}
  </section>;
}

interface Props { state: ReviewSourceState; referenceDate: Date; now: Date; onCreateLifeGoal?: () => void }
function AccountWeeklyReview({ state, referenceDate, now, accountId, onCreateLifeGoal }: Props & { accountId: string }) {
  const [allocation, setAllocation] = useState(() => readAttentionPreferences(window.localStorage, accountId));
  const summary = useMemo(() => buildWeeklyReviewSummary(state, allocation, referenceDate, now), [state, allocation, referenceDate, now]);
  const { review, attention, habits } = summary.details;
  const currentWeek = referenceDate >= new Date(`${review.range.startDate}T00:00:00`)
    && now >= new Date(`${review.range.startDate}T00:00:00`) && now <= new Date(`${review.range.endDate}T23:59:59.999`);
  return <section aria-labelledby="weekly-intelligence-title" className="lifeos-surface-panel space-y-5 p-4 sm:p-6">
    <div><p className="lifeos-page-eyebrow">Your week</p><h2 id="weekly-intelligence-title" className="text-xl font-bold text-lifeos-text">A moment to reflect</h2>
      <p className="mt-2 text-sm leading-6 text-lifeos-text-secondary">{summary.evidenceCoverage.message}</p></div>
    <div className="grid gap-4 xl:grid-cols-3">
      <InsightGroup title="Went well" items={summary.wins} empty="No completed activity to highlight yet." />
      <InsightGroup title="Needs attention" items={summary.needsAttention} empty="No unfinished commitments or focus differences to highlight." />
      <InsightGroup title="For next week" items={summary.nextWeekSuggestions} empty="No changes suggested from the available evidence." />
    </div>
    <p className="text-xs leading-5 text-lifeos-text-secondary">Suggestions are options to consider. Nothing is scheduled or changed automatically.</p>
    <details className="border-t border-lifeos-divider pt-3">
      <summary className="cursor-pointer rounded-lg py-2 font-semibold text-lifeos-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-lifeos-accent">View details</summary>
      <dl className="my-4 grid gap-4 sm:grid-cols-2 text-sm">
        <div><dt className="text-lifeos-text-secondary">Tasks completed</dt><dd className="font-semibold text-lifeos-text">{review.tasks.completed}</dd></div>
        <div><dt className="text-lifeos-text-secondary">Recorded focus</dt><dd className="font-semibold text-lifeos-text">{reviewFocusDuration(attention.totalMs)} · {attention.ledger.length} sessions</dd></div>
        <div><dt className="text-lifeos-text-secondary">XP earned</dt><dd className="font-semibold text-lifeos-text">{review.xpEarned} · from the execution ledger</dd></div>
        <div><dt className="text-lifeos-text-secondary">Dated planning focus</dt><dd className="break-words text-lifeos-text">{review.planning.focus ?? "No dated focus available."}</dd></div>
      </dl>
      {habits.length > 0 && <section className="mb-4"><h3 className="font-semibold text-lifeos-text">Scheduled habits</h3><ul className="mt-2 space-y-2 text-sm text-lifeos-text-secondary">{habits.map(h => <li key={h.id} className="break-words">{h.name}: {h.completed} of {h.scheduled} scheduled check-ins · {h.missedClosedDays} missed on finished days</li>)}</ul></section>}
      <section><h3 className="font-semibold text-lifeos-text">What supports this review</h3><ul className="mt-2 space-y-2 text-sm text-lifeos-text-secondary">{[...summary.wins, ...summary.needsAttention].map(item => <li key={item.id} className="break-words">{item.evidence.map(e => e.label).join(" · ")}: {item.text}</li>)}</ul></section>
      <section className="mt-4"><h3 className="font-semibold text-lifeos-text">What LifeOS cannot tell</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-lifeos-text-secondary">{summary.evidenceCoverage.limitations.map(text => <li key={text}>{text.replaceAll("Uncategorized", "Other focus")}</li>)}</ul></section>
      {currentWeek ? <div className="mt-5"><RealityMirror state={{ tasks: state.tasks, lifeGoals: state.lifeGoals, monthlyTargets: state.monthlyOutcomes, weeklyTargets: state.weeklyFocuses, executionRecords: state.executionRecords }} onCreateLifeGoal={onCreateLifeGoal} onAllocationChange={setAllocation} /></div>
        : <section className="mt-5"><h3 className="font-semibold text-lifeos-text">Recorded focus compared with current priorities</h3><ul className="mt-2 space-y-2 text-sm text-lifeos-text-secondary">{attention.rows.map(row => <li key={row.id} className="break-words">{row.id === "uncategorized" ? "Other focus" : row.label}: planned {row.intended === null ? "unavailable" : `${row.intended.toFixed(1)}%`} · recorded {row.actual === null ? "unavailable" : `${row.actual.toFixed(1)}%`}</li>)}</ul><p className="mt-2 text-sm text-lifeos-text-secondary">Past priority allocations and planning relationships were not recorded.</p></section>}
    </details>
  </section>;
}
export default function WeeklyReviewPanel(props: Props) {
  const { identity } = useAuth();
  return identity ? <AccountWeeklyReview key={identity.userId} accountId={identity.userId} {...props} /> : null;
}
