// ==========================================
// LifeOS Dashboard Final V1
// ==========================================
//
// Read-only composition over the canonical ATLAS
// snapshot and frozen deterministic intelligence.
// No provider calls, mutations, or duplicate engines.
// ==========================================

import { useMemo } from "react";
import {
  FaArrowRight,
  FaBolt,
  FaBrain,
  FaBullseye,
  FaCalendarCheck,
  FaChartLine,
  FaCircleCheck,
  FaFlagCheckered,
  FaLayerGroup,
  FaListCheck,
  FaRepeat,
  FaSeedling,
} from "react-icons/fa6";
import type { IconType } from "react-icons";

import type { AtlasAIOrchestrator } from "../atlas/orchestration/AtlasAIOrchestrator";
import { ProactiveInsightEngine } from "../atlas/proactive/proactiveInsightEngine";
import { useAtlasCanonicalState } from "../atlas/state/useAtlasCanonicalState";
import AtlasProactiveInsights from "../components/atlas/AtlasProactiveInsights";

export type DashboardDestination =
  | "planning"
  | "tasks"
  | "habits"
  | "statistics"
  | "atlas";

interface DashboardProps {
  orchestrator: AtlasAIOrchestrator;
  onNavigate: (destination: DashboardDestination) => void;
}

interface SummaryCardProps {
  icon: IconType;
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "emerald" | "violet" | "amber";
}

const SUMMARY_TONES: Readonly<Record<SummaryCardProps["tone"], string>> = {
  cyan: "border-lifeos-accent/15 bg-lifeos-accent/[0.04] text-lifeos-accent",
  emerald:
    "border-lifeos-success/15 bg-lifeos-success/[0.04] text-lifeos-success",
  violet:
    "border-lifeos-chart-secondary/15 bg-lifeos-chart-secondary/[0.04] text-lifeos-chart-secondary",
  amber:
    "border-lifeos-warning/15 bg-lifeos-warning/[0.04] text-lifeos-warning",
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: SummaryCardProps) {
  return (
    <article className={`rounded-2xl border p-5 ${SUMMARY_TONES[tone]}`}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">
          {label}
        </p>
        <Icon className="text-base" />
      </div>
      <p className="mt-4 text-3xl font-bold text-lifeos-text">{value}</p>
      <p className="mt-2 text-xs leading-5 text-lifeos-muted">{detail}</p>
    </article>
  );
}

const NAVIGATION_ITEMS: readonly {
  destination: DashboardDestination;
  label: string;
  description: string;
  icon: IconType;
}[] = [
  {
    destination: "planning",
    label: "Planning",
    description: "Review goals and outcomes",
    icon: FaFlagCheckered,
  },
  {
    destination: "tasks",
    label: "Tasks",
    description: "Open today’s work",
    icon: FaListCheck,
  },
  {
    destination: "habits",
    label: "Habits",
    description: "Check today’s routine",
    icon: FaRepeat,
  },
  {
    destination: "statistics",
    label: "Analytics",
    description: "See trusted trends",
    icon: FaChartLine,
  },
  {
    destination: "atlas",
    label: "Ask ATLAS",
    description: "Ask a grounded question",
    icon: FaBrain,
  },
] as const;

export default function Dashboard({
  orchestrator,
  onNavigate,
}: DashboardProps) {
  const canonicalState = useAtlasCanonicalState();

  const deterministic = useMemo(
    () => orchestrator.buildDeterministicPackage(canonicalState),
    [canonicalState, orchestrator]
  );

  const proactive = useMemo(
    () =>
      new ProactiveInsightEngine().create(
        deterministic.reasoningContext
      ),
    [deterministic.reasoningContext]
  );

  const facts = deterministic.intelligenceReport.understanding;
  const brief = deterministic.dailyBrief;
  const topPriority = brief.topPriorities[0];
  const activePlanningCount =
    facts.planning.activeGoals +
    facts.planning.activeMonthlyTargets +
    facts.planning.activeWeeklyTargets;

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(canonicalState.capturedAt));

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-10">
      <section className="relative overflow-hidden rounded-[var(--lifeos-radius-surface)] border border-lifeos-accent/15 bg-gradient-to-br from-lifeos-surface via-lifeos-app to-lifeos-accent/35 p-7 shadow-2xl shadow-lifeos-accent/15 lg:p-9">
        <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-lifeos-accent/10 blur-3xl" />
        <div className="relative grid gap-8 xl:grid-cols-[1.45fr_0.8fr] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-lifeos-accent/20 bg-lifeos-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-accent">
                Today
              </span>
              <span className="text-xs text-lifeos-muted">{todayLabel}</span>
            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.12em] text-lifeos-muted">
              Primary focus
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight text-lifeos-text lg:text-5xl">
              {brief.primaryFocus.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-lifeos-text-secondary lg:text-base">
              {brief.primaryFocus.reasons[0] ??
                "No additional focus reason is available."}
            </p>

            {topPriority && (
              <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-lifeos-accent/15 bg-lifeos-accent/[0.06] px-4 py-3 text-sm text-lifeos-text-secondary">
                <FaBullseye className="text-lifeos-accent" />
                <span className="font-semibold text-lifeos-text">
                  #{topPriority.rank} {topPriority.title}
                </span>
                <span className="text-xs text-lifeos-muted">
                  ATLAS urgency: {topPriority.tier}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-lifeos-border bg-lifeos-app/65 p-5">
            <div className="flex items-center gap-2 text-lifeos-accent">
              <FaBolt />
              <p className="text-[11px] font-bold uppercase tracking-[0.12em]">
                Suggested next step
              </p>
            </div>
            <p className="mt-4 text-xl font-bold text-lifeos-text">
              {brief.suggestedNextAction.title}
            </p>
            <p className="mt-2 text-xs leading-5 text-lifeos-muted">
              {brief.suggestedNextAction.reasons[0] ??
                "No additional action reason is available."}
            </p>
            <button
              type="button"
              onClick={() => onNavigate(topPriority ? "tasks" : "planning")}
              className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-lifeos-accent transition hover:text-lifeos-accent"
            >
              {topPriority ? "Open tasks" : "Open planning"}
              <FaArrowRight />
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="today-progress-heading">
        <div className="mb-4 flex items-center gap-3">
          <FaCircleCheck className="text-lifeos-accent" />
          <h2 id="today-progress-heading" className="font-bold text-lifeos-text">
            Today’s progress
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={FaListCheck}
            label="Tasks"
            value={`${facts.tasks.completedToday}`}
            detail={
              facts.tasks.active > 0
                ? `${facts.tasks.active} active · ${facts.tasks.dueToday} due today`
                : "No active tasks right now"
            }
            tone="cyan"
          />
          <SummaryCard
            icon={FaRepeat}
            label="Habits"
            value={`${facts.habits.completedToday}/${facts.habits.scheduledToday}`}
            detail={
              facts.habits.scheduledToday > 0
                ? `${facts.habits.activeStreaks} active streaks`
                : "No habits scheduled today"
            }
            tone="emerald"
          />
          <SummaryCard
            icon={FaBolt}
            label="XP today"
            value={`${facts.execution.xpToday}`}
            detail={
              facts.execution.totalXP > 0
                ? `${facts.execution.totalXP} total XP`
                : "Complete trusted work to earn XP"
            }
            tone="violet"
          />
          <SummaryCard
            icon={FaLayerGroup}
            label="Planning"
            value={`${activePlanningCount}`}
            detail={
              activePlanningCount > 0
                ? "Active goals and planning commitments"
                : "No active goal or planning commitment"
            }
            tone="amber"
          />
        </div>
      </section>

      <AtlasProactiveInsights
        report={proactive}
        context={deterministic.reasoningContext}
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-[var(--lifeos-radius-surface)] border border-lifeos-border bg-lifeos-surface/70 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lifeos-success/10 text-lifeos-success">
              <FaSeedling />
            </div>
            <div>
              <h2 className="font-bold text-lifeos-text">Habit status</h2>
              <p className="text-xs text-lifeos-muted">
                Derived from Habits 2.0
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-lifeos-app/60 p-4">
              <p className="text-2xl font-bold text-lifeos-text">
                {facts.habits.scheduledToday}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-lifeos-muted">
                Scheduled
              </p>
            </div>
            <div className="rounded-xl bg-lifeos-app/60 p-4">
              <p className="text-2xl font-bold text-lifeos-success">
                {facts.habits.completedToday}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-lifeos-muted">
                Completed
              </p>
            </div>
            <div className="rounded-xl bg-lifeos-app/60 p-4">
              <p className="text-2xl font-bold text-lifeos-accent">
                {facts.habits.activeStreaks}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-lifeos-muted">
                Streaks
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-lifeos-muted">
            {facts.habits.scheduledToday > 0
              ? `${Math.max(0, facts.habits.scheduledToday - facts.habits.completedToday)} scheduled habits remain today.`
              : "Nothing is scheduled for today. Your habit system is ready when you add a routine."}
          </p>
        </article>

        <article className="rounded-[var(--lifeos-radius-surface)] border border-lifeos-border bg-lifeos-surface/70 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lifeos-warning/10 text-lifeos-warning">
              <FaCalendarCheck />
            </div>
            <div>
              <h2 className="font-bold text-lifeos-text">Planning status</h2>
              <p className="text-xs text-lifeos-muted">
                Goals through current execution plans
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-lifeos-app/60 p-4">
              <p className="text-2xl font-bold text-lifeos-text">
                {facts.planning.activeGoals}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-lifeos-muted">
                Goals
              </p>
            </div>
            <div className="rounded-xl bg-lifeos-app/60 p-4">
              <p className="text-2xl font-bold text-lifeos-warning">
                {facts.planning.activeMonthlyTargets}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-lifeos-muted">
                Monthly Outcomes
              </p>
            </div>
            <div className="rounded-xl bg-lifeos-app/60 p-4">
              <p className="text-2xl font-bold text-lifeos-accent">
                {facts.planning.activeWeeklyTargets}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-lifeos-muted">
                Weekly Focus
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-lifeos-muted">
            {activePlanningCount > 0
              ? `${activePlanningCount} active planning commitments are represented in your current LifeOS state.`
              : "No active planning commitments yet. Define the next meaningful outcome when you are ready."}
          </p>
        </article>
      </section>

      <section className="rounded-[var(--lifeos-radius-surface)] border border-lifeos-border bg-lifeos-surface/70 p-6">
        <div>
          <h2 className="font-bold text-lifeos-text">Open your workspace</h2>
          <p className="mt-1 text-xs text-lifeos-muted">
            Navigate to an existing LifeOS system. No state changes happen here.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.destination}
                type="button"
                onClick={() => onNavigate(item.destination)}
                className="group flex items-center gap-3 rounded-2xl border border-lifeos-border bg-lifeos-app/55 p-4 text-left transition hover:-translate-y-0.5 hover:border-lifeos-accent/25 hover:bg-lifeos-accent/[0.04]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lifeos-elevated text-lifeos-text-secondary transition group-hover:bg-lifeos-accent/10 group-hover:text-lifeos-accent">
                  <Icon />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-lifeos-text">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-lifeos-muted">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
