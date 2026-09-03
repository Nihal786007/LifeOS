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
    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-400/80">
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
    ask,
    cancel,
  } = useAtlasInteraction(orchestrator);

  const [question, setQuestion] =
    useState(DEFAULT_PROMPT);

  const brief = deterministic.dailyBrief;
  const priorities = brief.topPriorities;
  const risks = brief.keyRisks;
  const response = state.result?.provider;
  const isLoading = state.status === "loading";

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      <header className="relative overflow-hidden rounded-[2rem] border border-cyan-400/15 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 p-8 shadow-2xl shadow-cyan-950/20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 bg-blue-600/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-2xl text-cyan-300 shadow-lg shadow-cyan-500/10">
              <FaRobot />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-black tracking-tight text-white">
                  Ask ATLAS
                </h1>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                  Local · Grounded
                </span>
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Read-only intelligence grounded in your goals,
                plans, tasks, habits, execution history, and
                verified ATLAS evidence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/60 px-4 py-3 backdrop-blur">
            <FaShieldHalved className="text-cyan-300" />
            <div>
              <p className="text-xs font-semibold text-slate-200">
                Read-only reasoning
              </p>
              <p className="text-[11px] text-slate-500">
                No actions or LifeOS mutations
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-7 xl:grid-cols-[0.9fr_1.3fr]">
        <section className="space-y-5">
          <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between gap-4">
              <SectionLabel>Daily brief</SectionLabel>
              <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Deterministic
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/10 to-blue-500/5 p-5">
              <div className="flex items-center gap-2 text-cyan-300">
                <FaBullseye />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">
                  Primary focus
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-bold text-white">
                {brief.primaryFocus.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {brief.primaryFocus.reasons[0]}
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center gap-3">
              <FaListOl className="text-cyan-300" />
              <h2 className="font-bold text-white">
                Top priorities
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {priorities.length > 0 ? (
                priorities.map((priority) => (
                  <div
                    key={priority.taskId}
                    className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-black text-cyan-300">
                      {priority.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-100">
                        {priority.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Manual priority: {getManualPriorityLabel(
                          priority
                        )} · ATLAS score: {priority.score}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      ATLAS urgency: {priority.tier}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-500">
                  No active task is currently ranked. ATLAS will
                  help you define the next priority.
                </div>
              )}
            </div>
          </div>

          {risks.length > 0 && (
            <div className="rounded-[1.75rem] border border-amber-400/15 bg-amber-400/[0.04] p-6">
              <div className="flex items-center gap-3 text-amber-300">
                <FaTriangleExclamation />
                <h2 className="font-bold">
                  Important risks
                </h2>
              </div>
              <div className="mt-4 space-y-3">
                {risks.map((risk) => (
                  <div
                    key={risk.ruleId}
                    className="rounded-2xl border border-amber-300/10 bg-slate-950/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-100">
                        {risk.title}
                      </p>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                        {risk.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {risk.reasons[0]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/15 lg:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
              <FaBolt />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Grounded reasoning
              </h2>
              <p className="text-xs text-slate-500">
                Answers must pass ATLAS evidence validation.
              </p>
            </div>
          </div>

          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(question);
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
              disabled={isLoading}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              placeholder="Ask about your focus, priorities, risks, or recent patterns…"
              className="min-h-32 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/80 p-5 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/5 disabled:cursor-not-allowed disabled:opacity-70"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-600">
                Try: “Why am I at risk?” or “What changed recently?”
              </p>

              <div className="flex items-center gap-3">
                {isLoading && (
                  <button
                    type="button"
                    onClick={cancel}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                  >
                    <FaXmark />
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    question.trim().length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/15 transition hover:-translate-y-0.5 hover:shadow-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
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
            className="mt-7 border-t border-slate-800 pt-7"
            aria-live="polite"
          >
            {state.status === "idle" && (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-7 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                  <FaArrowRight />
                </div>
                <h3 className="mt-4 font-bold text-slate-200">
                  Ask from your current LifeOS state
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  ATLAS will combine deterministic priorities,
                  risks, planning signals, and history before the
                  local model explains the answer.
                </p>
              </div>
            )}

            {state.status === "loading" && (
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-6">
                <div className="flex items-center gap-3 text-cyan-300">
                  <FaSpinner className="animate-spin" />
                  <p className="font-semibold">
                    ATLAS is checking trusted evidence…
                  </p>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="h-3 w-full animate-pulse rounded-full bg-slate-800" />
                  <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-800" />
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-800" />
                </div>
              </div>
            )}

            {state.status === "error" && state.error && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] p-6">
                <div className="flex items-start gap-4">
                  <FaTriangleExclamation className="mt-1 shrink-0 text-rose-300" />
                  <div>
                    <h3 className="font-bold text-rose-100">
                      {state.error.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-rose-100/60">
                      {state.error.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {response?.content && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <FaCircleCheck />
                      <span className="text-xs font-bold uppercase tracking-[0.2em]">
                        Validated answer
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      {response.descriptor?.displayName}
                    </span>
                  </div>
                  <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-200">
                    {response.content}
                  </p>
                </div>

                {response.citations.length > 0 && (
                  <details className="group rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-300">
                      <span className="flex items-center gap-2">
                        <FaShieldHalved className="text-cyan-300" />
                        Evidence · {response.citations.length}
                      </span>
                      <FaChevronDown className="text-xs text-slate-600 transition group-open:rotate-180" />
                    </summary>
                    <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
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
                              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                            >
                              <p className="text-sm font-semibold text-slate-100">
                                {evidence.summary}
                              </p>
                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                {citation.explanation}
                              </p>
                              <details className="mt-3 border-t border-slate-800 pt-3">
                                <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/70">
                                  Technical evidence
                                </summary>
                                <dl className="mt-3 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-[4rem_1fr]">
                                  <dt>Source</dt>
                                  <dd className="font-mono text-slate-400">
                                    {evidence.source}
                                  </dd>
                                  <dt>Path</dt>
                                  <dd className="break-all font-mono text-slate-400">
                                    {evidence.path}
                                  </dd>
                                  <dt>Value</dt>
                                  <dd className="break-all font-mono text-slate-400">
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
              <details className="group mt-5 rounded-2xl border border-amber-400/10 bg-amber-400/[0.03] p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-amber-100/80">
                  <span>
                    Evidence limitations · {response.limitations.length}
                  </span>
                  <FaChevronDown className="text-xs text-amber-300/40 transition group-open:rotate-180" />
                </summary>
                <ul className="mt-4 space-y-3 border-t border-amber-300/10 pt-4">
                  {response.limitations.map(
                    (limitation) => (
                      <li
                        key={limitation}
                        className="text-xs leading-5 text-slate-500"
                      >
                        {limitation}
                      </li>
                    )
                  )}
                </ul>
              </details>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
