import {
  useMemo,
  useState,
} from "react";

import {
  FaChevronDown,
  FaChevronRight,
  FaFlagCheckered,
  FaPlus,
  FaTrash,
} from "react-icons/fa6";

import {
  useLifeGoals,
} from "../../context/LifeGoalsContext";

import {
  useMonthlyPlanning,
} from "../../context/MonthlyPlanningContext";

import {
  useWeeklyPlanning,
} from "../../context/WeeklyPlanningContext";

import {
  usePlanningExecution,
} from "../../context/PlanningExecutionContext";

import GoalModal from "./GoalModal";
import MonthlyTargetModal from "./MonthlyTargetModal";
import SmartGoalTimeline from "./SmartGoalTimeline";
import GoalPlanningHealthPanel from "./GoalPlanningHealthPanel";
import GoalMonthPlanner from "./GoalMonthPlanner";

import type {
  LifeGoal,
} from "../../shared/types";

// ==========================================
// Types
// ==========================================

interface SelectedGoalMonth {
  goalId: number;

  month: number;

  year: number;
}

// ==========================================
// Date Helpers
// ==========================================

function parseDate(
  value?: string
) {
  if (!value) {
    return undefined;
  }

  const dateOnly =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (dateOnly) {
    const year =
      Number(
        dateOnly[1]
      );

    const month =
      Number(
        dateOnly[2]
      );

    const day =
      Number(
        dateOnly[3]
      );

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    if (
      date.getFullYear() !==
        year ||
      date.getMonth() !==
        month - 1 ||
      date.getDate() !==
        day
    ) {
      return undefined;
    }

    return date;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return undefined;
  }

  return date;
}

function formatDate(
  value?: string
) {
  const date =
    parseDate(
      value
    );

  if (!date) {
    return undefined;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function clampProgress(
  progress: number
) {
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        progress
      )
    )
  );
}

// ==========================================
// Component
// ==========================================

export default function LifeGoalPlanner() {
  const {
    lifeGoals,
  } = useLifeGoals();

  const {
    monthlyPlans,
  } = useMonthlyPlanning();

  const {
    weeklyTargets,
  } = useWeeklyPlanning();

  const {
    createLifeGoal,
    deleteLifeGoal,
  } = usePlanningExecution();

  // ==========================================
  // Modal State
  // ==========================================

  const [
    goalModalOpen,
    setGoalModalOpen,
  ] = useState(false);

  const [
    selectedGoalMonth,
    setSelectedGoalMonth,
  ] = useState<
    SelectedGoalMonth | undefined
  >(undefined);

  // ==========================================
  // Active Goal Workspace
  // ==========================================

  const [
    expandedGoalId,
    setExpandedGoalId,
  ] = useState<
    number | undefined
  >(undefined);

  // ==========================================
  // Goal Ordering
  // ==========================================

  const orderedGoals =
    useMemo(
      () =>
        [
          ...lifeGoals,
        ].sort(
          (
            first,
            second
          ) => {
            if (
              first.completed !==
              second.completed
            ) {
              return first.completed
                ? 1
                : -1;
            }

            return (
              new Date(
                first.createdAt
              ).getTime() -
              new Date(
                second.createdAt
              ).getTime()
            );
          }
        ),
      [
        lifeGoals,
      ]
    );

  // ==========================================
  // Goal Months
  // ==========================================

  function getGoalMonths(
    goalId: number
  ) {
    return monthlyPlans
      .filter(
        (plan) =>
          plan.goalId ===
          goalId
      )
      .sort(
        (
          first,
          second
        ) => {
          if (
            first.year !==
            second.year
          ) {
            return (
              first.year -
              second.year
            );
          }

          return (
            first.month -
            second.month
          );
        }
      );
  }

  // ==========================================
  // Goal Creation
  // ==========================================

  function handleCreateGoal(
    title: string,
    description: string,
    targetDate?: string
  ) {
    const result =
      createLifeGoal({
        title,
        description,
        targetDate,
      });

    if (!result.created) {
      return;
    }
  }

  // ==========================================
  // Smart Month Planning
  // ==========================================

  function handlePlanMonth(
    goalId: number,
    month: number,
    year: number
  ) {
    const alreadyExists =
      monthlyPlans.some(
        (plan) =>
          plan.goalId ===
            goalId &&
          plan.month ===
            month &&
          plan.year ===
            year
      );

    if (alreadyExists) {
      return;
    }

    setSelectedGoalMonth({
      goalId,
      month,
      year,
    });
  }

  function closeMonthModal() {
    setSelectedGoalMonth(
      undefined
    );
  }

  // ==========================================
  // Goal Workspace
  // ==========================================

  function toggleGoal(
    goalId: number
  ) {
    setExpandedGoalId(
      (current) =>
        current ===
        goalId
          ? undefined
          : goalId
    );
  }

  // ==========================================
  // Goal Delete
  // ==========================================

  function handleGoalDelete(
    goal: LifeGoal
  ) {
    const confirmed =
      window.confirm(
        `Delete "${goal.title}" and its linked planning structure?`
      );

    if (!confirmed) {
      return;
    }

    deleteLifeGoal(
      goal.id
    );

    if (
      expandedGoalId ===
      goal.id
    ) {
      setExpandedGoalId(
        undefined
      );
    }
  }

  // ==========================================
  // Planner
  // ==========================================

  return (
    <>
      <div className="space-y-3">

        {/* ======================================
            Planner Actions
        ====================================== */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <div>
            <p
              className="
                text-xs
                font-medium
                text-slate-500
              "
            >
              {orderedGoals.length ===
              0
                ? "Start designing your long-term direction."
                : `${orderedGoals.length} ${
                    orderedGoals.length ===
                    1
                      ? "life goal"
                      : "life goals"
                  }`}
            </p>

            {orderedGoals.length >
              0 && (
              <p
                className="
                  mt-0.5
                  text-[10px]
                  text-slate-700
                "
              >
                Select a goal to enter its planning workspace.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setGoalModalOpen(
                true
              )
            }
            className="
              inline-flex
              shrink-0
              items-center
              gap-2
              rounded-lg
              border
              border-cyan-500/25
              bg-cyan-500/10
              px-3
              py-2
              text-xs
              font-semibold
              text-cyan-300
              transition
              hover:border-cyan-400/40
              hover:bg-cyan-500/15
              hover:text-cyan-200
            "
          >
            <FaPlus />

            New Goal
          </button>
        </div>

        {/* ======================================
            Empty State
        ====================================== */}

        {orderedGoals.length ===
        0 ? (
          <div
            className="
              rounded-xl
              border
              border-dashed
              border-slate-800
              bg-slate-950/40
              px-6
              py-12
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-cyan-500/20
                bg-cyan-500/10
                text-cyan-400
              "
            >
              <FaFlagCheckered />
            </div>

            <p
              className="
                mt-4
                text-sm
                font-semibold
                text-slate-300
              "
            >
              No Life Goals yet
            </p>

            <p
              className="
                mx-auto
                mt-1
                max-w-md
                text-xs
                leading-5
                text-slate-600
              "
            >
              Create a long-term outcome and LifeOS will organize it into months, real calendar weeks, and Universal Tasks.
            </p>

            <button
              type="button"
              onClick={() =>
                setGoalModalOpen(
                  true
                )
              }
              className="
                mt-5
                inline-flex
                items-center
                gap-2
                rounded-lg
                bg-cyan-500
                px-4
                py-2.5
                text-xs
                font-bold
                text-slate-950
                transition
                hover:bg-cyan-400
              "
            >
              <FaPlus />

              Create Life Goal
            </button>
          </div>
        ) : (
          <div className="space-y-2">

            {orderedGoals.map(
              (goal) => {
                const goalMonths =
                  getGoalMonths(
                    goal.id
                  );

                const goalExpanded =
                  expandedGoalId ===
                  goal.id;

                const progress =
                  clampProgress(
                    goal.progress
                  );

                const targetDate =
                  formatDate(
                    goal.targetDate
                  );

                const startDate =
                  formatDate(
                    goal.startDate
                  );

                return (
                  <article
                    key={
                      goal.id
                    }
                    className={`
                      overflow-hidden
                      rounded-xl
                      border
                      transition
                      ${
                        goalExpanded
                          ? "border-cyan-500/20 bg-slate-950/45"
                          : "border-slate-800 bg-slate-950/35"
                      }
                    `}
                  >
                    {/* =========================
                        Goal Selector Row
                    ========================= */}

                    <div
                      className="
                        flex
                        min-h-16
                        items-center
                        gap-3
                        px-3
                        py-2.5
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleGoal(
                            goal.id
                          )
                        }
                        className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-md
                          text-slate-500
                          transition
                          hover:bg-slate-800
                          hover:text-white
                        "
                        aria-label={
                          goalExpanded
                            ? "Close goal workspace"
                            : "Open goal workspace"
                        }
                      >
                        {goalExpanded ? (
                          <FaChevronDown />
                        ) : (
                          <FaChevronRight />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleGoal(
                            goal.id
                          )
                        }
                        className="
                          min-w-0
                          flex-1
                          text-left
                        "
                      >
                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-x-3
                            gap-y-1
                          "
                        >
                          <h3
                            className={`
                              truncate
                              text-sm
                              font-semibold
                              ${
                                goal.completed
                                  ? "text-slate-500 line-through"
                                  : "text-white"
                              }
                            `}
                          >
                            {goal.title}
                          </h3>

                          {targetDate && (
                            <span
                              className="
                                hidden
                                text-[11px]
                                text-slate-600
                                md:inline
                              "
                            >
                              Target{" "}
                              {targetDate}
                            </span>
                          )}
                        </div>

                        <div
                          className="
                            mt-1.5
                            flex
                            items-center
                            gap-2
                          "
                        >
                          <div
                            className="
                              h-1
                              max-w-48
                              flex-1
                              overflow-hidden
                              rounded-full
                              bg-slate-800
                            "
                          >
                            <div
                              className="
                                h-full
                                rounded-full
                                bg-cyan-400
                                transition-all
                                duration-300
                              "
                              style={{
                                width:
                                  `${progress}%`,
                              }}
                            />
                          </div>

                          <span
                            className="
                              text-[11px]
                              font-medium
                              text-slate-400
                            "
                          >
                            {progress}%
                          </span>

                          <span
                            className="
                              hidden
                              text-[11px]
                              text-slate-600
                              sm:inline
                            "
                          >
                            {
                              goalMonths.length
                            }{" "}
                            {goalMonths.length ===
                            1
                              ? "month planned"
                              : "months planned"}
                          </span>
                        </div>
                      </button>

                      <span
                        className={`
                          hidden
                          rounded-md
                          border
                          px-2
                          py-1
                          text-[10px]
                          font-medium
                          sm:inline
                          ${
                            goal.completed
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
                          }
                        `}
                      >
                        {goal.completed
                          ? "Completed"
                          : "Active"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleGoalDelete(
                            goal
                          )
                        }
                        className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-md
                          text-slate-600
                          transition
                          hover:bg-red-500/10
                          hover:text-red-400
                        "
                        aria-label="Delete goal"
                      >
                        <FaTrash />
                      </button>
                    </div>

                    {/* =========================
                        Goal Workspace
                    ========================= */}

                    {goalExpanded && (
                      <div
                        className="
                          border-t
                          border-slate-800
                          bg-slate-950/20
                        "
                      >
                        {/* =====================
                            Workspace Header
                        ===================== */}

                        <div
                          className="
                            border-b
                            border-slate-800
                            px-4
                            py-4
                          "
                        >
                          <div
                            className="
                              flex
                              flex-col
                              gap-3
                              lg:flex-row
                              lg:items-start
                              lg:justify-between
                            "
                          >
                            <div className="min-w-0">
                              <p
                                className="
                                  text-[10px]
                                  font-bold
                                  uppercase
                                  tracking-[0.18em]
                                  text-cyan-400
                                "
                              >
                                Goal Workspace
                              </p>

                              {goal.description ? (
                                <p
                                  className="
                                    mt-2
                                    max-w-3xl
                                    text-xs
                                    leading-5
                                    text-slate-400
                                  "
                                >
                                  {
                                    goal.description
                                  }
                                </p>
                              ) : (
                                <p
                                  className="
                                    mt-2
                                    text-xs
                                    text-slate-600
                                  "
                                >
                                  No description added yet.
                                </p>
                              )}
                            </div>

                            <div
                              className="
                                flex
                                shrink-0
                                flex-wrap
                                gap-x-6
                                gap-y-2
                              "
                            >
                              <WorkspaceDate
                                label="Start"
                                value={
                                  startDate ??
                                  "Unknown"
                                }
                              />

                              <WorkspaceDate
                                label="Target"
                                value={
                                  targetDate ??
                                  "Not set"
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* =====================
                            Planning Intelligence
                        ===================== */}

                        <div
                          className="
                            space-y-3
                            border-b
                            border-slate-800
                            px-3
                            py-4
                            sm:px-4
                          "
                        >
                          <SectionHeading
                            title="Planning Intelligence"
                            description="Understand where the goal is going and what needs attention."
                          />

                          <SmartGoalTimeline
                            goal={
                              goal
                            }
                            monthlyPlans={
                              monthlyPlans
                            }
                            onPlanMonth={(
                              month,
                              year
                            ) =>
                              handlePlanMonth(
                                goal.id,
                                month,
                                year
                              )
                            }
                          />

                          <GoalPlanningHealthPanel
                            goalId={
                              goal.id
                            }
                          />
                        </div>

                        {/* =====================
                            Execution Plan
                        ===================== */}

                        <div
                          className="
                            px-3
                            py-4
                            sm:px-4
                          "
                        >
                          <SectionHeading
                            title="Execution Plan"
                            description="Monthly Outcomes become real calendar weeks and Universal Tasks."
                            trailing={
                              `${goalMonths.length} ${
                                goalMonths.length ===
                                1
                                  ? "month planned"
                                  : "months planned"
                              }`
                            }
                          />

                          {goalMonths.length ===
                          0 ? (
                            <div
                              className="
                                mt-3
                                rounded-lg
                                border
                                border-dashed
                                border-slate-800
                                bg-slate-950/30
                                px-4
                                py-6
                                text-center
                              "
                            >
                              <p
                                className="
                                  text-xs
                                  font-medium
                                  text-slate-400
                                "
                              >
                                No Monthly Outcomes yet
                              </p>

                              <p
                                className="
                                  mt-1
                                  text-[10px]
                                  leading-5
                                  text-slate-600
                                "
                              >
                                Choose an unplanned month from the Smart Timeline above. LifeOS already knows the goal, month, and year.
                              </p>
                            </div>
                          ) : (
                            <div
                              className="
                                mt-3
                                space-y-2
                              "
                            >
                              {goalMonths.map(
                                (
                                  month
                                ) => (
                                  <GoalMonthPlanner
                                    key={
                                      month.id
                                    }
                                    month={
                                      month
                                    }
                                    weeklyTargets={
                                      weeklyTargets
                                    }
                                    goalStartDate={
                                      goal.startDate
                                    }
                                    goalTargetDate={
                                      goal.targetDate
                                    }
                                  />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              }
            )}

          </div>
        )}

      </div>

      {/* ======================================
          Goal Creation Modal
      ====================================== */}

      <GoalModal
        open={
          goalModalOpen
        }
        onClose={() =>
          setGoalModalOpen(
            false
          )
        }
        onCreate={
          handleCreateGoal
        }
      />

      {/* ======================================
          Smart Monthly Planning Modal
      ====================================== */}

      {selectedGoalMonth && (
        <MonthlyTargetModal
          open={
            true
          }
          onClose={
            closeMonthModal
          }
          month={
            selectedGoalMonth.month
          }
          year={
            selectedGoalMonth.year
          }
          lockedGoalId={
            selectedGoalMonth.goalId
          }
        />
      )}
    </>
  );
}

// ==========================================
// Workspace Date
// ==========================================

interface WorkspaceDateProps {
  label: string;

  value: string;
}

function WorkspaceDate({
  label,
  value,
}: WorkspaceDateProps) {
  return (
    <div>
      <p
        className="
          text-[9px]
          font-semibold
          uppercase
          tracking-wider
          text-slate-600
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          whitespace-nowrap
          text-xs
          font-medium
          text-slate-300
        "
      >
        {value}
      </p>
    </div>
  );
}

// ==========================================
// Section Heading
// ==========================================

interface SectionHeadingProps {
  title: string;

  description: string;

  trailing?: string;
}

function SectionHeading({
  title,
  description,
  trailing,
}: SectionHeadingProps) {
  return (
    <div
      className="
        flex
        flex-wrap
        items-end
        justify-between
        gap-3
      "
    >
      <div>
        <p
          className="
            text-xs
            font-semibold
            text-slate-300
          "
        >
          {title}
        </p>

        <p
          className="
            mt-0.5
            text-[10px]
            leading-4
            text-slate-600
          "
        >
          {description}
        </p>
      </div>

      {trailing && (
        <span
          className="
            text-[10px]
            font-medium
            text-slate-500
          "
        >
          {trailing}
        </span>
      )}
    </div>
  );
}