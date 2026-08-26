import {
  FaTrash,
  FaBullseye,
  FaCalendarAlt,
} from "react-icons/fa";

import {
  ProgressEngine,
} from "../../engines/ProgressEngine";

import {
  TaskRelationshipEngine,
} from "../../engines/TaskRelationshipEngine";

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

import Card from "../ui/Card";

interface Props {
  id: number;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function MonthlyTargetCard({
  id,
}: Props) {
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
    lifeGoals,
  } = useLifeGoals();

  const {
    deleteMonthlyTarget,
  } = usePlanningExecution();

  const plan =
    monthlyPlans.find(
      (item) =>
        item.id === id
    );

  if (!plan) {
    return null;
  }

  const planId =
    plan.id;

  const planTitle =
    plan.title;

  const relationshipState = {
    lifeGoals,

    monthlyTargets:
      monthlyPlans,

    weeklyTargets,

    tasks,
  };

  const linkedTasks =
    TaskRelationshipEngine
      .getTasksForMonthlyTarget(
        relationshipState,
        planId
      );

  const goal =
    lifeGoals.find(
      (item) =>
        item.id ===
        plan.goalId
    );

  const progress =
    ProgressEngine.getMonthlyProgress(
      relationshipState,
      planId
    );

  function handleDelete() {
    const confirmed =
      window.confirm(
        `Delete "${planTitle}"?`
      );

    if (!confirmed) {
      return;
    }

    deleteMonthlyTarget(
      planId
    );
  }

  return (
    <Card hover glow>

      <div className="flex items-start justify-between">

        <div>

          <div className="flex items-center gap-2">

            <FaBullseye className="text-cyan-400" />

            <h3 className="text-xl font-bold text-white">
              {planTitle}
            </h3>

          </div>

          <p className="mt-2 text-sm text-slate-400">
            {MONTHS[
              plan.month - 1
            ]}{" "}
            {plan.year}
          </p>

          <p className="mt-3 text-cyan-400">
            {goal
              ? `🎯 ${goal.title}`
              : "Standalone Target"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">

            <span>
              {linkedTasks.length}{" "}
              {linkedTasks.length === 1
                ? "task"
                : "tasks"}
            </span>

          </div>

        </div>

        <button
          onClick={
            handleDelete
          }
          className="rounded-xl p-3 text-red-400 transition hover:bg-red-500/10"
          aria-label={
            `Delete ${planTitle}`
          }
        >
          <FaTrash />
        </button>

      </div>

      <div className="mt-6">

        <div className="mb-2 flex items-center justify-between text-sm">

          <span className="text-slate-400">
            Progress
          </span>

          <span className="font-semibold text-cyan-400">
            {progress}%
          </span>

        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-800">

          <div
            className="h-full rounded-full bg-cyan-500 transition-all duration-500"
            style={{
              width:
                `${progress}%`,
            }}
          />

        </div>

      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">

        <FaCalendarAlt />

        <span>
          Created{" "}
          {new Date(
            plan.createdAt
          ).toLocaleDateString()}
        </span>

      </div>

    </Card>
  );
}