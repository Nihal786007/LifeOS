import {
  useState,
} from "react";

import {
  FaCalendarAlt,
  FaPen,
  FaSave,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

import {
  TaskRelationshipEngine,
} from "../../engines/TaskRelationshipEngine";

import type {
  LifeGoal,
} from "../../shared/types";

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
  useTasks,
} from "../../context/TaskContext";

import {
  usePlanningExecution,
} from "../../context/PlanningExecutionContext";

import GoalProgress from "./GoalProgress";

// ==========================================
// Types
// ==========================================

interface LifeGoalCardProps {
  goal: LifeGoal;

  onDelete: (
    id: number
  ) => void;
}

// ==========================================
// Helpers
// ==========================================

function toDateInputValue(
  value?: string
) {
  if (!value) {
    return "";
  }

  const localDateMatch =
    /^(\d{4}-\d{2}-\d{2})$/.exec(
      value
    );

  if (localDateMatch) {
    return localDateMatch[1];
  }

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "";
  }

  const year =
    parsed.getFullYear();

  const month =
    String(
      parsed.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      parsed.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

// ==========================================
// Component
// ==========================================

export default function LifeGoalCard({
  goal,
  onDelete,
}: LifeGoalCardProps) {
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
    tasks,
  } = useTasks();

  const {
    updateLifeGoal,
  } =
    usePlanningExecution();

  // ==========================================
  // Edit State
  // ==========================================

  const [
    isEditing,
    setIsEditing,
  ] = useState(false);

  const [
    title,
    setTitle,
  ] = useState(
    goal.title
  );

  const [
    description,
    setDescription,
  ] = useState(
    goal.description ?? ""
  );

  const [
    startDate,
    setStartDate,
  ] = useState(
    toDateInputValue(
      goal.startDate
    )
  );

  const [
    targetDate,
    setTargetDate,
  ] = useState(
    toDateInputValue(
      goal.targetDate
    )
  );

  const [
    editError,
    setEditError,
  ] = useState("");

  // ==========================================
  // Relationship State
  // ==========================================

  const relationshipState = {
    lifeGoals,

    monthlyTargets:
      monthlyPlans,

    weeklyTargets,

    tasks,
  };

  const linkedTasks =
    TaskRelationshipEngine
      .getTasksForLifeGoal(
        relationshipState,
        goal.id
      );

  const progress =
    Math.min(
      100,
      Math.max(
        0,
        Math.round(
          goal.progress
        )
      )
    );

  // ==========================================
  // Edit Helpers
  // ==========================================

  function resetEditState() {
    setTitle(
      goal.title
    );

    setDescription(
      goal.description ?? ""
    );

    setStartDate(
      toDateInputValue(
        goal.startDate
      )
    );

    setTargetDate(
      toDateInputValue(
        goal.targetDate
      )
    );

    setEditError("");
  }

  function handleStartEditing() {
    resetEditState();

    setIsEditing(
      true
    );
  }

  function handleCancelEditing() {
    resetEditState();

    setIsEditing(
      false
    );
  }

  function handleSave() {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      setEditError(
        "Life Goal title cannot be empty."
      );

      return;
    }

    if (!startDate) {
      setEditError(
        "Life Goal start date is required."
      );

      return;
    }

    const result =
      updateLifeGoal(
        goal.id,
        {
          title:
            trimmedTitle,

          description:
            description.trim()
              ? description
              : null,

          startDate,

          targetDate:
            targetDate ||
            null,
        }
      );

    if (
      !result.updated
    ) {
      setEditError(
        result.message
      );

      return;
    }

    setEditError("");

    setIsEditing(
      false
    );
  }

  // ==========================================
  // Delete
  // ==========================================

  function handleDelete() {
    const confirmed =
      window.confirm(
        `Delete "${goal.title}"?`
      );

    if (!confirmed) {
      return;
    }

    onDelete(
      goal.id
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 transition hover:border-cyan-500/50">

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0 flex-1">

          {isEditing ? (
            <div className="space-y-4">

              {/* ==================================
                  Title
              ================================== */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Goal Title
                </label>

                <input
                  type="text"
                  value={
                    title
                  }
                  onChange={(
                    event
                  ) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-700
                    bg-slate-950
                    px-4
                    py-3
                    text-lg
                    font-semibold
                    text-white
                    outline-none
                    transition
                    placeholder:text-slate-700
                    focus:border-cyan-500
                  "
                  placeholder="Life Goal title"
                />
              </div>

              {/* ==================================
                  Description
              ================================== */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Description
                </label>

                <textarea
                  value={
                    description
                  }
                  onChange={(
                    event
                  ) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  rows={
                    3
                  }
                  className="
                    w-full
                    resize-none
                    rounded-xl
                    border
                    border-slate-700
                    bg-slate-950
                    px-4
                    py-3
                    text-sm
                    leading-6
                    text-slate-200
                    outline-none
                    transition
                    placeholder:text-slate-700
                    focus:border-cyan-500
                  "
                  placeholder="Describe what this goal means..."
                />
              </div>

              {/* ==================================
                  Timeline
              ================================== */}

              <div className="grid gap-3 sm:grid-cols-2">

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={
                      startDate
                    }
                    onChange={(
                      event
                    ) =>
                      setStartDate(
                        event.target.value
                      )
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-700
                      bg-slate-950
                      px-4
                      py-3
                      text-sm
                      text-slate-200
                      outline-none
                      transition
                      focus:border-cyan-500
                    "
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Target Date
                  </label>

                  <input
                    type="date"
                    value={
                      targetDate
                    }
                    onChange={(
                      event
                    ) =>
                      setTargetDate(
                        event.target.value
                      )
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-700
                      bg-slate-950
                      px-4
                      py-3
                      text-sm
                      text-slate-200
                      outline-none
                      transition
                      focus:border-cyan-500
                    "
                  />
                </div>

              </div>

              {/* ==================================
                  Validation
              ================================== */}

              {editError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                  {
                    editError
                  }
                </div>
              )}

              {/* ==================================
                  Actions
              ================================== */}

              <div className="flex flex-wrap items-center gap-2">

                <button
                  type="button"
                  onClick={
                    handleSave
                  }
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-cyan-500
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-slate-950
                    transition
                    hover:bg-cyan-400
                  "
                >
                  <FaSave />

                  Save
                </button>

                <button
                  type="button"
                  onClick={
                    handleCancelEditing
                  }
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-700
                    bg-slate-950
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-slate-300
                    transition
                    hover:border-slate-600
                    hover:text-white
                  "
                >
                  <FaTimes />

                  Cancel
                </button>

              </div>

            </div>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-white">
                {goal.title}
              </h3>

              {goal.description && (
                <p className="mt-2 leading-7 text-slate-400">
                  {
                    goal.description
                  }
                </p>
              )}

              <div className="mt-3 text-sm text-slate-400">
                {linkedTasks.length}{" "}
                {linkedTasks.length === 1
                  ? "task"
                  : "tasks"}
              </div>
            </>
          )}

        </div>

        {/* ==================================
            Card Actions
        ================================== */}

        {!isEditing && (
          <div className="flex items-center gap-1">

            <button
              type="button"
              onClick={
                handleStartEditing
              }
              className="rounded-xl p-3 text-cyan-400 transition hover:bg-cyan-500/10"
              aria-label={
                `Edit ${goal.title}`
              }
            >
              <FaPen />
            </button>

            <button
              type="button"
              onClick={
                handleDelete
              }
              className="rounded-xl p-3 text-red-400 transition hover:bg-red-500/10"
              aria-label={
                `Delete ${goal.title}`
              }
            >
              <FaTrash />
            </button>

          </div>
        )}

      </div>

      {!isEditing && (
        <>
          <GoalProgress
            progress={
              progress
            }
          />

          <div className="mt-6 flex flex-col gap-2 text-sm text-slate-400">

            <div className="flex items-center gap-2">

              <FaCalendarAlt />

              <span>
                Start:{" "}
                {
                  toDateInputValue(
                    goal.startDate
                  )
                }
              </span>

            </div>

            {goal.targetDate && (
              <div className="flex items-center gap-2">

                <FaCalendarAlt />

                <span>
                  Target:{" "}
                  {
                    toDateInputValue(
                      goal.targetDate
                    )
                  }
                </span>

              </div>
            )}

            <div className="flex items-center gap-2">

              <FaCalendarAlt />

              <span>
                Created{" "}
                {new Date(
                  goal.createdAt
                ).toLocaleDateString()}
              </span>

            </div>

          </div>
        </>
      )}

    </div>
  );
}