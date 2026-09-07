import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowTrendDown,
  FaArrowTrendUp,
  FaBolt,
  FaCalendarDays,
  FaChevronLeft,
  FaChevronRight,
  FaCircleCheck,
  FaFire,
  FaFlagCheckered,
  FaListCheck,
  FaMinus,
  FaRotateLeft,
} from "react-icons/fa6";

import {
  useTasks,
} from "../context/TaskContext";

import {
  useHabits,
} from "../context/HabitContext";

import {
  useLifeGoals,
} from "../context/LifeGoalsContext";

import {
  useMonthlyPlanning,
} from "../context/MonthlyPlanningContext";

import {
  useWeeklyPlanning,
} from "../context/WeeklyPlanningContext";

import {
  ExecutionHistoryService,
} from "../services/ExecutionHistoryService";

import {
  ReviewEngine,
} from "../reviews/reviewEngine";

import type {
  ReviewPeriod,
  ReviewReport,
} from "../reviews/reviewEngine";

import type {
  ExecutionRecord,
} from "../shared/execution";

import Card from "../components/ui/Card";

const PERIOD_OPTIONS: Array<{
  id: ReviewPeriod;
  label: string;
}> = [
  {
    id: "daily",
    label: "Daily",
  },
  {
    id: "weekly",
    label: "Weekly",
  },
  {
    id: "monthly",
    label: "Monthly",
  },
];

interface SummaryCardProps {
  label: string;
  value: string;
  description: string;
  tone:
    | "cyan"
    | "emerald"
    | "amber"
    | "violet";
  icon: React.ReactNode;
}

function SummaryCard({
  label,
  value,
  description,
  tone,
  icon,
}: SummaryCardProps) {
  const toneClass = {
    cyan: "border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-300",
    emerald: "border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-300",
    amber: "border-amber-500/20 bg-amber-500/[0.04] text-amber-300",
    violet: "border-violet-500/20 bg-violet-500/[0.04] text-violet-300",
  }[tone];

  return (
    <div
      className={`rounded-2xl border p-5 ${toneClass}`}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">
          {label}
        </p>

        <span className="text-lg">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-black text-white">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function EmptyList({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-4 text-sm leading-6 text-slate-500">
      {children}
    </p>
  );
}

function SignalList({
  items,
  empty,
}: {
  items: string[];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyList>
        {empty}
      </EmptyList>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm leading-6 text-slate-300"
        >
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function shiftDate(
  date: Date,
  period: ReviewPeriod,
  amount: number
): Date {
  const result =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  if (period === "monthly") {
    return new Date(
      result.getFullYear(),
      result.getMonth() + amount,
      1
    );
  }

  result.setDate(
    result.getDate() +
      amount *
        (period === "weekly" ? 7 : 1)
  );

  return result;
}

function isSameReviewPeriod(
  left: ReviewReport,
  right: ReviewReport
): boolean {
  return (
    left.range.startDate ===
      right.range.startDate &&
    left.range.endDate ===
      right.range.endDate
  );
}

export default function Reviews() {
  const {
    tasks,
  } = useTasks();

  const {
    habitState,
  } = useHabits();

  const {
    lifeGoals,
  } = useLifeGoals();

  const {
    monthlyPlans,
  } = useMonthlyPlanning();

  const {
    weeklyTargets,
  } = useWeeklyPlanning();

  const [
    executionRecords,
    setExecutionRecords,
  ] = useState<ExecutionRecord[]>(
    () =>
      ExecutionHistoryService.getAll()
  );

  const [
    period,
    setPeriod,
  ] = useState<ReviewPeriod>(
    "daily"
  );

  const [today] =
    useState(
      () => new Date()
    );

  const [
    referenceDate,
    setReferenceDate,
  ] = useState(
    today
  );

  useEffect(() => {
    return ExecutionHistoryService.subscribe(
      () =>
        setExecutionRecords(
          ExecutionHistoryService.getAll()
        )
    );
  }, []);

  const sourceState =
    useMemo(
      () => ({
        tasks,
        habitState,
        executionRecords,
        lifeGoals,
        monthlyOutcomes:
          monthlyPlans,
        weeklyFocuses:
          weeklyTargets,
      }),
      [
        tasks,
        habitState,
        executionRecords,
        lifeGoals,
        monthlyPlans,
        weeklyTargets,
      ]
    );

  const review =
    useMemo(
      () =>
        ReviewEngine.build(
          sourceState,
          period,
          referenceDate,
          today
        ),
      [
        sourceState,
        period,
        referenceDate,
        today,
      ]
    );

  const currentReview =
    useMemo(
      () =>
        ReviewEngine.build(
          sourceState,
          period,
          today,
          today
        ),
      [
        sourceState,
        period,
        today,
      ]
    );

  const isCurrentPeriod =
    isSameReviewPeriod(
      review,
      currentReview
    );

  const hasActivity =
    review.tasks.completed > 0 ||
    review.habits.scheduled > 0 ||
    review.xpEarned > 0 ||
    review.executionCount > 0 ||
    Boolean(
      review.planning.focus
    );

  const trendIcon =
    review.taskTrend.direction ===
    "up"
      ? <FaArrowTrendUp />
      : review.taskTrend.direction ===
          "down"
        ? <FaArrowTrendDown />
        : <FaMinus />;

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-10">
      <header className="overflow-hidden rounded-[2rem] border border-cyan-400/15 bg-gradient-to-br from-slate-900 via-slate-950 to-violet-950/25 p-6 sm:p-8 lg:p-9">
        <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
              Plan · Execute · Review · Adjust
            </p>

            <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">
              Reviews
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              A concise read-only view of what LifeOS has actually recorded.
            </p>
          </div>

          <div className="inline-flex w-full rounded-2xl border border-slate-800 bg-slate-950/70 p-1 sm:w-auto">
            {PERIOD_OPTIONS.map(
              (option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setPeriod(
                      option.id
                    );
                    setReferenceDate(
                      today
                    );
                  }}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
                    period === option.id
                      ? "bg-cyan-500/15 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            {period} review
          </p>

          <h2 className="mt-1 text-xl font-bold text-white">
            {review.range.label}
          </h2>

          {review.range.measuredThroughDate !==
            review.range.endDate && (
            <p className="mt-1 text-xs text-slate-500">
              Measured through {review.range.measuredThroughDate}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Previous ${period} review`}
            onClick={() =>
              setReferenceDate(
                (current) =>
                  shiftDate(
                    current,
                    period,
                    -1
                  )
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            <FaChevronLeft />
          </button>

          <button
            type="button"
            onClick={() =>
              setReferenceDate(
                today
              )
            }
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            <FaRotateLeft />
            Current
          </button>

          <button
            type="button"
            aria-label={`Next ${period} review`}
            disabled={
              isCurrentPeriod
            }
            onClick={() =>
              setReferenceDate(
                (current) =>
                  shiftDate(
                    current,
                    period,
                    1
                  )
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <FaChevronRight />
          </button>
        </div>
      </section>

      {!hasActivity && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-5 text-sm leading-6 text-slate-400">
          Nothing has been recorded for this period yet. Your review will fill in as you execute.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Tasks completed"
          value={String(
            review.tasks.completed
          )}
          description={`${review.tasks.completedDue} of ${review.tasks.due} tasks due in this calendar period are currently complete.`}
          tone="cyan"
          icon={<FaListCheck />}
        />

        <SummaryCard
          label="Habit consistency"
          value={
            review.habits.scheduled > 0
              ? `${review.habits.completionRate}%`
              : "—"
          }
          description={
            review.habits.scheduled > 0
              ? `${review.habits.completed} of ${review.habits.scheduled} scheduled check-ins completed.`
              : "No habits were scheduled in the measured range."
          }
          tone="emerald"
          icon={<FaFire />}
        />

        <SummaryCard
          label="XP earned"
          value={String(
            review.xpEarned
          )}
          description="Derived from the canonical execution ledger for this period."
          tone="amber"
          icon={<FaBolt />}
        />

        <SummaryCard
          label="Execution events"
          value={String(
            review.executionCount
          )}
          description="Recorded execution-history events through the measured date."
          tone="violet"
          icon={<FaCircleCheck />}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Card
          hover={false}
          className="border-emerald-500/15 bg-emerald-500/[0.025]"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
            What went well
          </p>

          <h2 className="mt-2 text-xl font-bold text-white">
            Completed work
          </h2>

          <div className="mt-5">
            <SignalList
              items={
                review.wentWell
              }
              empty="No completed work has been recorded for this period."
            />
          </div>
        </Card>

        <Card
          hover={false}
          className="border-amber-500/15 bg-amber-500/[0.025]"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
            What slipped
          </p>

          <h2 className="mt-2 text-xl font-bold text-white">
            Unfinished commitments
          </h2>

          <div className="mt-5">
            <SignalList
              items={
                review.slipped
              }
              empty="No unfinished due work or missed habit check-ins are recorded."
            />
          </div>
        </Card>

        <Card
          hover={false}
          className="border-cyan-500/15 bg-cyan-500/[0.025]"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            Carry forward
          </p>

          <h2 className="mt-2 text-xl font-bold text-white">
            Still open
          </h2>

          <div className="mt-5">
            <SignalList
              items={
                review.carryForward
              }
              empty="Nothing supported by current data needs to be carried forward."
            />
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card hover={false}>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-300">
              <FaFlagCheckered />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Planning status
              </p>

              <h2 className="mt-2 text-xl font-bold text-white">
                {review.planning.label}
              </h2>

              {review.planning.focus ? (
                <p className="mt-3 break-words text-sm leading-6 text-slate-300">
                  {review.planning.focus}
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  No dated planning focus is available for this period.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-300">
                  {review.planning.active} active
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-300">
                  {review.planning.completed} completed
                </span>
              </div>

              {review.planning.unavailableReason && (
                <p className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3 text-xs leading-5 text-amber-200/80">
                  {review.planning.unavailableReason}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card hover={false}>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-violet-500/10 p-3 text-violet-300">
              {trendIcon}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Completion trend
              </p>

              <h2 className="mt-2 text-xl font-bold text-white">
                {period === "daily"
                  ? "Available in weekly and monthly reviews"
                  : review.taskTrend.direction === "same"
                    ? "Level with the previous period"
                    : review.taskTrend.direction === "up"
                      ? "More tasks completed"
                      : review.taskTrend.direction === "down"
                        ? "Fewer tasks completed"
                        : "Comparison unavailable"}
              </h2>

              {period !== "daily" && (
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {review.taskTrend.currentValue} completed now · {review.taskTrend.previousValue} in the equivalent previous period.
                </p>
              )}

              <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <FaCalendarDays />
                Calendar-aligned Analytics V2 comparison
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
