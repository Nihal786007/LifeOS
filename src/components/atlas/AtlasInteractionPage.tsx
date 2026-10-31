import {
  useState,
} from "react";

import {
  FaArrowRight,
  FaBolt,
  FaBullseye,
  FaChevronDown,
  FaCircleCheck,
  FaListOl,
  FaPaperPlane,
  FaRobot,
  FaShieldHalved,
  FaSpinner,
  FaTriangleExclamation,
  FaXmark,
} from "react-icons/fa6";

import type {
  AtlasAIOrchestrator,
} from "../../atlas/orchestration/AtlasAIOrchestrator";

import type {
  AtlasRankedTask,
} from "../../atlas/priority/types";

import {
  useAtlasInteraction,
} from "../../atlas/interaction/useAtlasInteraction";

import {
  formatAtlasEvidenceValue,
  presentAtlasEvidence,
} from "../../atlas/interaction/evidencePresentation";

import AtlasMemoryPanel from "./AtlasMemoryPanel";
import AtlasProactiveInsights from "./AtlasProactiveInsights";
import AtlasActionProposalCard from "./AtlasActionProposalCard";
import { useAtlasActions } from "../../atlas/actions/useAtlasActions";

const DEFAULT_PROMPT =
  "What should I focus on today and why?";

interface AtlasInteractionPageProps {
  orchestrator: AtlasAIOrchestrator;
}

function SectionLabel({
  children,
}: {
  children: string;
}) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-accent">
      {children}
    </p>
  );
}

function getManualPriorityLabel(
  priority: AtlasRankedTask
): string {
  const reason = priority.contributions.find(
    (item) => item.ruleId === "task-priority"
  )?.reason;
  const value = reason?.match(
    /^Marked as (low|medium|high) priority\.$/i
  )?.[1];

  if (!value) {
    return "Not explicitly set";
  }

  return `${value[0]?.toUpperCase()}${value.slice(1)}`;
}

export default function AtlasInteractionPage({
  orchestrator,
}: AtlasInteractionPageProps) {
  const {
    state,
    deterministic,
    proactive,
    memory,
    ask,
    cancel,
  } = useAtlasInteraction(orchestrator);

  const [question, setQuestion] =
    useState(DEFAULT_PROMPT);
  const actions = useAtlasActions();

  const brief = deterministic.dailyBrief;
  const priorities = brief.topPriorities;
  const response = state.result?.provider;
  const isLoading = state.status === "loading";

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      <header className="lifeos-page-header relative overflow-hidden">

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-lifeos-accent/20 bg-lifeos-accent/10 text-2xl text-lifeos-accent shadow-lg shadow-lifeos-accent/10">
              <FaRobot />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="lifeos-page-title !mt-0">
                  Ask ATLAS
                </h1>
                <span className="rounded-full border border-lifeos-success/20 bg-lifeos-success/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-success">
                  Local · Grounded
                </span>
              </div>

              <p className="lifeos-page-description">
                Grounded intelligence that can prepare reviewable actions from your goals,
                plans, tasks, habits, execution history, and
                verified ATLAS evidence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-lifeos-border bg-lifeos-surface px-4 py-3">
            <FaShieldHalved className="text-lifeos-accent" />
            <div>
              <p className="text-xs font-semibold text-lifeos-text">
                Permission-controlled actions
              </p>
              <p className="text-[11px] text-lifeos-text-secondary">
                No mutation without explicit approval
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-7 xl:grid-cols-[0.9fr_1.3fr]">
        <section className="space-y-5">
          <div className="lifeos-surface-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <SectionLabel>Daily brief</SectionLabel>
              <span className="rounded-full border border-lifeos-border bg-lifeos-app px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-text-secondary">
                Deterministic
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-lifeos-accent/15 bg-gradient-to-br from-lifeos-accent/10 to-lifeos-accent/5 p-5">
              <div className="flex items-center gap-2 text-lifeos-accent">
                <FaBullseye />
                <span className="text-xs font-bold uppercase tracking-[0.12em]">
                  Primary focus
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-bold text-lifeos-text">
                {brief.primaryFocus.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-lifeos-text-secondary">
                {brief.primaryFocus.reasons[0]}
              </p>
            </div>
          </div>

          <div className="lifeos-surface-panel p-6">
            <div className="flex items-center gap-3">
              <FaListOl className="text-lifeos-accent" />
              <h2 className="font-bold text-lifeos-text">
                Top priorities
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {priorities.length > 0 ? (
                priorities.map((priority) => (
                  <div
                    key={priority.taskId}
                    className="flex items-start gap-4 rounded-2xl border border-lifeos-border bg-lifeos-app/60 p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lifeos-accent/10 text-sm font-bold text-lifeos-accent">
                      {priority.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-lifeos-text">
                        {priority.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-lifeos-muted">
                        Manual priority: {getManualPriorityLabel(
                          priority
                        )} · ATLAS score: {priority.score}
                      </p>
                    </div>
                    <span className="rounded-full border border-lifeos-border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-lifeos-text-secondary">
                      ATLAS urgency: {priority.tier}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-lifeos-border p-5 text-sm text-lifeos-muted">
                  No active task is currently ranked. ATLAS will
                  help you define the next priority.
                </div>
              )}
            </div>
          </div>

          <AtlasProactiveInsights
            report={proactive}
            context={deterministic.reasoningContext}
          />

          <AtlasMemoryPanel memory={memory} />
        </section>

        <section className="lifeos-surface-panel p-6 lg:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lifeos-accent/10 text-lifeos-accent">
              <FaBolt />
            </div>
            <div>
              <h2 className="text-lg font-bold text-lifeos-text">
                Grounded reasoning
              </h2>
              <p className="text-xs text-lifeos-muted">
                Answers must pass ATLAS evidence validation.
              </p>
            </div>
          </div>

          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                if (await actions.interpret(question)) {
                  setQuestion("");
                  return;
                }
                await ask(question);
              })();
            }}
          >
            <label
              htmlFor="atlas-question"
              className="sr-only"
            >
              Ask ATLAS a question
            </label>
            <textarea
              id="atlas-question"
              value={question}
              maxLength={500}
              disabled={isLoading || actions.status === "preparing"}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              placeholder="Ask a question or request a LifeOS action…"
              className="lifeos-field min-h-32 w-full resize-none p-4 text-sm leading-6 disabled:cursor-not-allowed disabled:opacity-70"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-lifeos-muted">
                Try: “Create a task to study SAT tomorrow” or “Why am I at risk?”
              </p>

              <div className="flex items-center gap-3">
                {isLoading && (
                  <button
                    type="button"
                    onClick={cancel}
                    className="inline-flex items-center gap-2 rounded-xl border border-lifeos-border px-4 py-2.5 text-sm font-semibold text-lifeos-text-secondary transition hover:border-lifeos-border hover:bg-lifeos-elevated"
                  >
                    <FaXmark />
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    actions.status === "preparing" ||
                    !memory.ready ||
                    question.trim().length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-lifeos-accent to-lifeos-accent px-5 py-2.5 text-sm font-bold text-lifeos-accent-foreground shadow-lg shadow-lifeos-accent/15 transition hover:-translate-y-0.5 hover:shadow-lifeos-accent/25 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  {isLoading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaPaperPlane />
                  )}
                  {isLoading
                    ? "Reasoning…"
                    : "Ask ATLAS"}
                </button>
              </div>
            </div>
          </form>

          <div
            className="mt-7 border-t border-lifeos-border pt-7"
            aria-live="polite"
          >
            {state.status === "idle" && (
              <div className="rounded-2xl border border-dashed border-lifeos-border bg-lifeos-app/30 p-7 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-lifeos-accent/10 text-lifeos-accent">
                  <FaArrowRight />
                </div>
                <h3 className="mt-4 font-bold text-lifeos-text">
                  Ask from your current LifeOS state
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-lifeos-muted">
                  ATLAS will combine deterministic priorities,
                  risks, planning signals, and history before the
                  local model explains the answer.
                </p>
              </div>
            )}

            {state.status === "loading" && (
              <div className="rounded-2xl border border-lifeos-accent/15 bg-lifeos-accent/[0.04] p-6">
                <div className="flex items-center gap-3 text-lifeos-accent">
                  <FaSpinner className="animate-spin" />
                  <p className="font-semibold">
                    ATLAS is checking trusted evidence…
                  </p>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="h-3 w-full animate-pulse rounded-full bg-lifeos-elevated" />
                  <div className="h-3 w-5/6 animate-pulse rounded-full bg-lifeos-elevated" />
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-lifeos-elevated" />
                </div>
              </div>
            )}

            {state.status === "error" && state.error && (
              <div className="rounded-2xl border border-lifeos-danger/20 bg-lifeos-danger/[0.05] p-6">
                <div className="flex items-start gap-4">
                  <FaTriangleExclamation className="mt-1 shrink-0 text-lifeos-danger" />
                  <div>
                    <h3 className="font-bold text-lifeos-danger">
                      {state.error.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-lifeos-danger">
                      {state.error.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {response?.content && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-lifeos-success/15 bg-lifeos-success/[0.04] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-lifeos-success">
                      <FaCircleCheck />
                      <span className="text-xs font-bold uppercase tracking-[0.12em]">
                        Validated answer
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-lifeos-muted">
                      {response.descriptor?.displayName}
                    </span>
                  </div>
                  <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-lifeos-text">
                    {response.content}
                  </p>
                </div>

                {response.citations.length > 0 && (
                  <details className="group rounded-2xl border border-lifeos-border bg-lifeos-app/40 p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-lifeos-text-secondary">
                      <span className="flex items-center gap-2">
                        <FaShieldHalved className="text-lifeos-accent" />
                        Evidence · {response.citations.length}
                      </span>
                      <FaChevronDown className="text-xs text-lifeos-muted transition group-open:rotate-180" />
                    </summary>
                    <div className="mt-4 space-y-3 border-t border-lifeos-border pt-4">
                      {response.citations.map(
                        (citation, index) => {
                          const evidence =
                            presentAtlasEvidence(
                              state.result!.deterministic
                                .reasoningContext,
                              citation
                            );

                          return (
                            <div
                              key={`${citation.source}:${citation.path}:${index}`}
                              className="rounded-xl border border-lifeos-border bg-lifeos-surface p-4"
                            >
                              <p className="text-sm font-semibold text-lifeos-text">
                                {evidence.summary}
                              </p>
                              <p className="mt-2 text-xs leading-5 text-lifeos-muted">
                                {citation.explanation}
                              </p>
                              <details className="mt-3 border-t border-lifeos-border pt-3">
                                <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-accent">
                                  Technical evidence
                                </summary>
                                <dl className="mt-3 grid gap-2 text-[11px] text-lifeos-muted sm:grid-cols-[4rem_1fr]">
                                  <dt>Source</dt>
                                  <dd className="font-mono text-lifeos-text-secondary">
                                    {evidence.source}
                                  </dd>
                                  <dt>Path</dt>
                                  <dd className="break-all font-mono text-lifeos-text-secondary">
                                    {evidence.path}
                                  </dd>
                                  <dt>Value</dt>
                                  <dd className="break-all font-mono text-lifeos-text-secondary">
                                    {formatAtlasEvidenceValue(
                                      evidence.value
                                    )}
                                  </dd>
                                </dl>
                              </details>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </details>
                )}
              </div>
            )}

            {response && response.limitations.length > 0 && (
              <details className="group mt-5 rounded-2xl border border-lifeos-warning/10 bg-lifeos-warning/[0.03] p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-lifeos-warning">
                  <span>
                    Evidence limitations · {response.limitations.length}
                  </span>
                  <FaChevronDown className="text-xs text-lifeos-warning transition group-open:rotate-180" />
                </summary>
                <ul className="mt-4 space-y-3 border-t border-lifeos-warning/10 pt-4">
                  {response.limitations.map(
                    (limitation) => (
                      <li
                        key={limitation}
                        className="text-xs leading-5 text-lifeos-muted"
                      >
                        {limitation}
                      </li>
                    )
                  )}
                </ul>
              </details>
            )}
          </div>

          <div className="mt-7 border-t border-lifeos-border pt-7">
            <div className="flex items-center gap-3">
              <FaShieldHalved className="text-lifeos-warning" />
              <div>
                <h2 className="font-bold text-lifeos-text">Prepare a LifeOS action</h2>
                <p className="text-xs text-lifeos-muted">Create a proposal first. Approval is always separate.</p>
              </div>
            </div>

            {!actions.proposal && !actions.clarification && !actions.intentFeedback && !actions.result && (
              <p className="mt-4 rounded-xl border border-dashed border-lifeos-border bg-lifeos-app/30 p-4 text-xs leading-5 text-lifeos-muted">
                Ask naturally above. Recognized LifeOS changes become proposals and never execute automatically.
              </p>
            )}

            {actions.clarification && (
              <div className="mt-5 rounded-2xl border border-lifeos-accent/20 bg-lifeos-accent/[0.04] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-accent">Clarification needed</p>
                <p className="mt-2 text-sm leading-6 text-lifeos-text-secondary">{actions.clarification.question}</p>
                <p className="mt-2 text-xs text-lifeos-muted">Reply in the Ask ATLAS box. No action exists yet.</p>
                <button type="button" onClick={actions.dismissIntent} className="mt-3 text-xs font-semibold text-lifeos-text-secondary">Cancel clarification</button>
              </div>
            )}

            {actions.intentFeedback && (
              <div className="mt-5 rounded-2xl border border-lifeos-border bg-lifeos-app/50 p-5">
                <p className="text-sm leading-6 text-lifeos-text-secondary">{actions.intentFeedback}</p>
                <button type="button" onClick={actions.dismissIntent} className="mt-3 text-xs font-semibold text-lifeos-accent">Dismiss</button>
              </div>
            )}

            <div className="mt-5">
              <AtlasActionProposalCard
                proposal={actions.proposal}
                result={actions.result}
                executing={actions.status === "executing"}
                onApprove={() => { void actions.approve(); }}
                onCancel={actions.cancel}
                onDismissResult={() => {
                  actions.clearResult();
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
