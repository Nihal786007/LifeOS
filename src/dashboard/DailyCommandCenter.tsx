import { useMemo } from "react";
import {
  FaArrowRight,
  FaBolt,
  FaBrain,
  FaBullseye,
  FaCalendarDay,
  FaCheck,
  FaCircle,
  FaClockRotateLeft,
  FaFlagCheckered,
  FaListCheck,
  FaPlus,
  FaTriangleExclamation,
} from "react-icons/fa6";

import type { AtlasAIOrchestrator } from "../atlas/orchestration/AtlasAIOrchestrator";
import { useAtlasCanonicalState } from "../atlas/state/useAtlasCanonicalState";
import Button from "../components/ui/Button";
import { useHabitExecution } from "../context/HabitExecutionContext";
import { usePlanningExecution } from "../context/PlanningExecutionContext";
import {
  buildDailyCommandCenter,
  type DailyTaskItem,
} from "./dailyCommandCenterModel";

export type DashboardDestination = "planning" | "tasks" | "habits" | "statistics" | "atlas";

interface DailyCommandCenterProps {
  orchestrator: AtlasAIOrchestrator;
  onNavigate: (destination: DashboardDestination) => void;
  onOpenCapture: () => void;
}

const PRIORITY_STYLE = {
  high: "border-lifeos-danger bg-red-400/10 text-lifeos-danger",
  medium: "border-lifeos-warning bg-amber-400/10 text-lifeos-warning",
  low: "border-lifeos-border bg-lifeos-elevated text-lifeos-text-secondary",
} as const;

function TaskContext({ task }: { task: DailyTaskItem }) {
  const relationship = task.weeklyFocus ?? task.monthlyOutcome ?? task.lifeGoal;
  const status = task.status === "overdue"
    ? `Overdue · ${task.dueDate}`
    : task.status === "completed"
      ? "Completed today"
      : task.status === "today"
        ? "Due today"
        : task.dueDate
          ? `Due ${task.dueDate}`
          : "Active task";
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-lifeos-muted">
      <span>{status}</span>
      {relationship && <span>Moves: {relationship}</span>}
    </div>
  );
}

export default function DailyCommandCenter({ orchestrator, onNavigate, onOpenCapture }: DailyCommandCenterProps) {
  const canonicalState = useAtlasCanonicalState();
  const planningExecution = usePlanningExecution();
  const habitExecution = useHabitExecution();
  const deterministic = useMemo(
    () => orchestrator.buildDeterministicPackage(canonicalState),
    [canonicalState, orchestrator]
  );
  const daily = useMemo(
    () => buildDailyCommandCenter(canonicalState, deterministic.intelligenceReport.priorities.rankedTasks),
    [canonicalState, deterministic.intelligenceReport.priorities.rankedTasks]
  );
  const brief = deterministic.dailyBrief;
  const importantRisk = brief.keyRisks[0];
  const positiveSignal = brief.positiveSignals[0];
  const atlasInsight = importantRisk
    ? { title: importantRisk.title, reason: importantRisk.reasons[0], important: true }
    : brief.primaryFocus.kind !== "maintenance"
      ? { title: brief.primaryFocus.title, reason: brief.primaryFocus.reasons[0], important: false }
      : positiveSignal
        ? { title: positiveSignal.title, reason: positiveSignal.reason, important: false }
        : undefined;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-10">
      <header className="lifeos-page-header">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="lifeos-page-eyebrow">Daily command center</p>
            <h1 className="lifeos-page-title">{daily.greeting}</h1>
            <p className="lifeos-page-description">{daily.dateLabel} · Here’s what matters today.</p>
          </div>
          <div className="rounded-xl border border-lifeos-border bg-lifeos-surface p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-lifeos-accent">Primary focus</p>
            <p className="mt-2 text-lg font-bold text-lifeos-text">{brief.primaryFocus.title}</p>
            <p className="mt-1 text-xs leading-5 text-lifeos-text-secondary">{brief.primaryFocus.reasons[0]}</p>
          </div>
        </div>
      </header>

      <section aria-labelledby="today-summary-heading" className="lifeos-surface-panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="lifeos-page-eyebrow">Today</p>
            <h2 id="today-summary-heading" className="mt-1 text-lg font-bold text-lifeos-text">Daily snapshot</h2>
          </div>
          <FaCalendarDay className="text-lifeos-accent" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[["Tasks", daily.summary.tasks], ["Completed", daily.summary.tasksCompleted], ["Habits due", daily.summary.habitsDue], ["Habits done", daily.summary.habitsCompleted], ["XP today", daily.summary.xp]].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-lifeos-surface-secondary px-4 py-3">
              <p className="text-2xl font-black text-lifeos-text">{value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-lifeos-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {daily.priorities.length > 0 && (
        <section aria-labelledby="top-priorities-heading">
          <div className="mb-3 flex items-center gap-3">
            <FaBullseye className="text-lifeos-accent" />
            <h2 id="top-priorities-heading" className="text-lg font-bold text-lifeos-text">Top priorities</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {daily.priorities.map((task) => (
              <button key={task.id} type="button" onClick={() => onNavigate("tasks")} className="lifeos-surface-panel group p-5 text-left transition hover:border-lifeos-accent">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-lifeos-accent">#{task.rank}</span>
                  <span className="lifeos-status-pill text-lifeos-warning">ATLAS urgency: {task.tier}</span>
                </div>
                <h3 className="mt-3 font-bold text-lifeos-text group-hover:text-lifeos-accent">{task.title}</h3>
                <p className="mt-2 text-xs leading-5 text-lifeos-text-secondary">{task.reasons[0]}</p>
                <TaskContext task={task} />
              </button>
            ))}
          </div>
        </section>
      )}

      {daily.isEmpty ? (
        <section className="lifeos-empty-state py-10">
          <FaListCheck className="mx-auto text-2xl text-lifeos-accent" />
          <h2 className="mt-4 text-xl font-bold text-lifeos-text">Nothing planned for today</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm">Create a task or open Planning to define the next meaningful outcome.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button onClick={() => onNavigate("tasks")}><FaPlus /> Create your first task</Button>
            <Button variant="secondary" onClick={() => onNavigate("planning")}>Open Planning</Button>
          </div>
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          <article className="lifeos-surface-panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div><p className="lifeos-page-eyebrow">Execution</p><h2 className="mt-1 text-lg font-bold text-lifeos-text">Today’s tasks</h2></div>
              <Button variant="ghost" onClick={() => onNavigate("tasks")}>All tasks <FaArrowRight /></Button>
            </div>
            {daily.tasks.length === 0 ? <p className="lifeos-empty-state mt-4">No due or overdue tasks today.</p> : (
              <div className="mt-4 space-y-2">
                {daily.tasks.map((task) => (
                  <div key={task.id} className={`flex items-start gap-3 rounded-xl border border-lifeos-border p-3 ${task.status === "completed" ? "bg-lifeos-surface-secondary opacity-65" : "bg-lifeos-surface"}`}>
                    <button type="button" aria-label={`${task.status === "completed" ? "Mark incomplete" : "Complete"}: ${task.title}`} onClick={() => task.status === "completed" ? planningExecution.uncompleteTask(task.id) : planningExecution.completeTask(task.id)} className="lifeos-icon-button !min-h-9 !min-w-9">
                      {task.status === "completed" ? <FaCheck className="text-lifeos-success" /> : <FaCircle className="text-lifeos-muted" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`font-semibold text-lifeos-text ${task.status === "completed" ? "line-through" : ""}`}>{task.title}</p>
                        <span className={`lifeos-status-pill ${PRIORITY_STYLE[task.priority]}`}>{task.priority} priority</span>
                      </div>
                      <TaskContext task={task} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="lifeos-surface-panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div><p className="lifeos-page-eyebrow">Consistency</p><h2 className="mt-1 text-lg font-bold text-lifeos-text">Habits today</h2></div>
              <Button variant="ghost" onClick={() => onNavigate("habits")}>All habits <FaArrowRight /></Button>
            </div>
            {daily.habits.length === 0 ? <p className="lifeos-empty-state mt-4">No habits are scheduled today.</p> : (
              <div className="mt-4 space-y-2">
                {daily.habits.map((habit) => (
                  <button key={habit.id} type="button" onClick={() => habitExecution.toggleHabit(habit.id, daily.dateKey)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border border-lifeos-border px-4 py-3 text-left transition hover:border-lifeos-accent ${habit.completed ? "bg-lifeos-surface-secondary opacity-70" : "bg-lifeos-surface"}`}>
                    {habit.completed ? <FaCheck className="text-lifeos-success" /> : <FaCircle className="text-lifeos-muted" />}
                    <span className={`font-semibold text-lifeos-text ${habit.completed ? "line-through" : ""}`}>{habit.name}</span>
                  </button>
                ))}
              </div>
            )}
          </article>
        </section>
      )}

      {daily.planning.length > 0 && (
        <section className="lifeos-surface-panel p-5 sm:p-6" aria-labelledby="goals-motion-heading">
          <div className="flex items-center justify-between gap-4">
            <div><p className="lifeos-page-eyebrow">Direction</p><h2 id="goals-motion-heading" className="mt-1 text-lg font-bold text-lifeos-text">Goals in motion</h2></div>
            <Button variant="ghost" onClick={() => onNavigate("planning")}>Open Planning <FaArrowRight /></Button>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {daily.planning.map((chain, index) => (
              <div key={`${chain.monthlyOutcome ?? chain.lifeGoal}-${index}`} className="rounded-xl border border-lifeos-border bg-lifeos-surface-secondary p-4">
                {chain.lifeGoal && <p className="font-bold text-lifeos-text"><FaFlagCheckered className="mr-2 inline text-lifeos-accent" />{chain.lifeGoal}</p>}
                {chain.monthlyOutcome && <p className="mt-2 text-sm text-lifeos-text-secondary">→ {chain.monthlyOutcome}</p>}
                {chain.weeklyFocus && <p className="mt-1 text-sm font-semibold text-lifeos-accent">→ {chain.weeklyFocus}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={`grid gap-5 ${daily.progress.executionCount > 0 ? "lg:grid-cols-[1fr_1.25fr]" : ""}`}>
        {daily.progress.executionCount > 0 && <article className="lifeos-surface-panel p-5 sm:p-6">
          <p className="lifeos-page-eyebrow">Today’s progress</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[["Tasks completed", daily.progress.tasksCompleted], ["Habits completed", daily.progress.habitsCompleted], ["XP earned", daily.progress.xpEarned], ["Execution events", daily.progress.executionCount]].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-lifeos-surface-secondary p-3">
                <p className="text-xl font-black text-lifeos-text">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-lifeos-muted">{label}</p>
              </div>
            ))}
          </div>
        </article>}
        <div className="space-y-5">
          {atlasInsight && (
            <article className={`rounded-2xl border p-5 ${atlasInsight.important ? "border-lifeos-warning bg-amber-400/5" : "border-lifeos-border bg-lifeos-surface"}`}>
              <div className="flex items-center gap-2 text-lifeos-accent">{atlasInsight.important ? <FaTriangleExclamation /> : <FaBrain />}<p className="text-[10px] font-black uppercase tracking-[0.18em]">Deterministic ATLAS insight</p></div>
              <h2 className="mt-3 font-bold text-lifeos-text">{atlasInsight.title}</h2>
              <p className="mt-2 text-sm leading-6 text-lifeos-text-secondary">{atlasInsight.reason}</p>
            </article>
          )}
          <article className="lifeos-surface-panel p-5">
            <p className="lifeos-page-eyebrow">Quick actions</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => onNavigate("tasks")}><FaPlus /> Task</Button>
              <Button variant="secondary" onClick={onOpenCapture}><FaBolt /> Capture</Button>
              <Button variant="secondary" onClick={() => onNavigate("planning")}><FaFlagCheckered /> Planner</Button>
              <Button variant="secondary" onClick={() => onNavigate("atlas")}><FaBrain /> Ask ATLAS</Button>
            </div>
          </article>
        </div>
      </section>

      {daily.tasks.length > 0 && <p className="flex items-center gap-2 text-xs text-lifeos-muted"><FaClockRotateLeft /> Tasks have dates, not time slots. LifeOS shows an ordered Today list instead of inventing a schedule.</p>}
    </div>
  );
}
