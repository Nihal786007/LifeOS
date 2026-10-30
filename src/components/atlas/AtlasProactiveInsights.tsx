import {
  FaChevronDown,
  FaSatelliteDish,
  FaShieldHalved,
} from "react-icons/fa6";

import {
  formatAtlasEvidenceValue,
  presentAtlasEvidence,
} from "../../atlas/interaction/evidencePresentation";
import type {
  AtlasProactiveInsight,
  AtlasProactiveInsightReport,
  AtlasProactiveSeverity,
} from "../../atlas/proactive/types";
import type {
  AtlasReasoningContext,
} from "../../atlas/reasoning/types";

interface AtlasProactiveInsightsProps {
  report: AtlasProactiveInsightReport;
  context: AtlasReasoningContext;
}

const SEVERITY_STYLES: Readonly<
  Record<AtlasProactiveSeverity, string>
> = {
  important:
    "border-lifeos-danger/20 bg-lifeos-danger/[0.05] text-lifeos-danger",
  attention:
    "border-lifeos-warning/20 bg-lifeos-warning/[0.05] text-lifeos-warning",
  info:
    "border-lifeos-accent/15 bg-lifeos-accent/[0.04] text-lifeos-accent",
};

function SignalCard({
  insight,
  context,
}: {
  insight: AtlasProactiveInsight;
  context: AtlasReasoningContext;
}) {
  return (
    <article
      className={`rounded-2xl border p-4 ${SEVERITY_STYLES[insight.severity]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">
            {insight.type}
          </p>
          <h3 className="mt-1 font-semibold text-lifeos-text">
            {insight.title}
          </h3>
        </div>
        <span className="rounded-full border border-current/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
          {insight.severity}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-lifeos-text-secondary">
        {insight.summary}
      </p>

      <details className="group mt-3 border-t border-current/10 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">
          <span className="flex items-center gap-2">
            <FaShieldHalved />
            Grounded evidence · {insight.evidence.length}
          </span>
          <FaChevronDown className="transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-2">
          {insight.evidence.map((citation, index) => {
            const evidence = presentAtlasEvidence(
              context,
              citation
            );

            return (
              <div
                key={`${citation.source}:${citation.path}:${index}`}
                className="rounded-xl bg-lifeos-app/50 p-3"
              >
                <p className="text-xs font-semibold text-lifeos-text-secondary">
                  {evidence.summary}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-lifeos-muted">
                  {citation.explanation}
                </p>
                <p className="mt-2 break-all font-mono text-[11px] text-lifeos-muted">
                  {citation.source}.{citation.path} ·{" "}
                  {formatAtlasEvidenceValue(evidence.value)}
                </p>
              </div>
            );
          })}
        </div>
      </details>
    </article>
  );
}

export default function AtlasProactiveInsights({
  report,
  context,
}: AtlasProactiveInsightsProps) {
  return (
    <section className="rounded-[var(--lifeos-radius-surface)] border border-lifeos-border bg-lifeos-surface/70 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FaSatelliteDish className="text-lifeos-accent" />
          <h2 className="font-bold text-lifeos-text">ATLAS Signals</h2>
        </div>
        <span className="rounded-full border border-lifeos-border bg-lifeos-app px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-lifeos-muted">
          Live · Deterministic
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {report.insights.length > 0 ? (
          report.insights.map((insight) => (
            <SignalCard
              key={insight.id}
              insight={insight}
              context={context}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-lifeos-border p-5 text-sm text-lifeos-muted">
            No important signals right now. ATLAS will surface a
            grounded change here when the current state supports it.
          </div>
        )}
      </div>
    </section>
  );
}
