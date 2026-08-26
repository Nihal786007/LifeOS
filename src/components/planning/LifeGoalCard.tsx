import {
  FaCalendarAlt,
  FaTrash,
} from "react-icons/fa";

import {
  ProgressEngine,
} from "../../engines/ProgressEngine";

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

import GoalProgress from "./GoalProgress";

interface LifeGoalCardProps {
  goal: LifeGoal;

  onDelete: (
    id: number
  ) => void;
}

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
    ProgressEngine
      .getLifeGoalProgress(
        relationshipState,
        goal.id
      );

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

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 transition hover:border-cyan-500/50">

      <div className="flex items-start justify-between">

        <div>

          <h3 className="text-2xl font-bold text-white">
            {goal.title}
          </h3>

          {goal.description && (
            <p className="mt-2 leading-7 text-slate-400">
              {goal.description}
            </p>
          )}

          <div className="mt-3 text-sm text-slate-400">
            {linkedTasks.length}{" "}
            {linkedTasks.length === 1
              ? "task"
              : "tasks"}
          </div>

        </div>

        <button
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

      <GoalProgress
        progress={
          progress
        }
      />

      <div className="mt-6 flex flex-col gap-2 text-sm text-slate-400">

        <div className="flex items-center gap-2">

          <FaCalendarAlt />

          <span>
            Created{" "}
            {new Date(
              goal.createdAt
            ).toLocaleDateString()}
          </span>

        </div>

        {goal.targetDate && (
          <div className="flex items-center gap-2">

            <FaCalendarAlt />

            <span>
              Target:{" "}
              {goal.targetDate}
            </span>

          </div>
        )}

      </div>

    </div>
  );
}