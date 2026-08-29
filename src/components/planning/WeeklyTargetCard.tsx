import {
  FaCalendarAlt,
  FaTrash,
} from "react-icons/fa";

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

// ==========================================
// Types
// ==========================================

interface Props {
  id: number;
}

// ==========================================
// Helpers
// ==========================================

function parseLocalDate(
  value?: string
) {
  if (!value) {
    return undefined;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return undefined;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
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

function formatWeekRange(
  weekStartDate?: string,
  weekEndDate?: string
) {
  const start =
    parseLocalDate(
      weekStartDate
    );

  const end =
    parseLocalDate(
      weekEndDate
    );

  if (
    !start ||
    !end
  ) {
    return "Legacy weekly focus";
  }

  const sameYear =
    start.getFullYear() ===
    end.getFullYear();

  const sameMonth =
    sameYear &&
    start.getMonth() ===
      end.getMonth();

  if (sameMonth) {
    const monthLabel =
      start.toLocaleDateString(
        undefined,
        {
          month:
            "short",
        }
      );

    return `${monthLabel} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
  }

  if (sameYear) {
    const startLabel =
      start.toLocaleDateString(
        undefined,
        {
          month:
            "short",
          day:
            "numeric",
        }
      );

    const endLabel =
      end.toLocaleDateString(
        undefined,
        {
          month:
            "short",
          day:
            "numeric",
        }
      );

    return `${startLabel}–${endLabel}, ${end.getFullYear()}`;
  }

  const startLabel =
    start.toLocaleDateString(
      undefined,
      {
        month:
          "short",
        day:
          "numeric",
        year:
          "numeric",
      }
    );

  const endLabel =
    end.toLocaleDateString(
      undefined,
      {
        month:
          "short",
        day:
          "numeric",
        year:
          "numeric",
      }
    );

  return `${startLabel}–${endLabel}`;
}

// ==========================================
// Component
// ==========================================

export default function WeeklyTargetCard({
  id,
}: Props) {
  const {
    lifeGoals,
  } = useLifeGoals();

  const {
    weeklyTargets,
  } = useWeeklyPlanning();

  const {
    tasks,
  } = useTasks();

  const {
    monthlyPlans,
  } = useMonthlyPlanning();

  const {
    deleteWeeklyTarget,
  } = usePlanningExecution();

  const target =
    weeklyTargets.find(
      (item) =>
        item.id === id
    );

  if (!target) {
    return null;
  }

  const targetId =
    target.id;

  const targetTitle =
    target.title;

  const relationshipState = {
    lifeGoals,

    monthlyTargets:
      monthlyPlans,

    weeklyTargets,

    tasks,
  };

  const linkedTasks =
    TaskRelationshipEngine
      .getTasksForWeeklyTarget(
        relationshipState,
        targetId
      );

  const monthlyTarget =
    monthlyPlans.find(
      (month) =>
        month.id ===
        target.monthlyTargetId
    );

  const progress =
    Math.min(
      100,
      Math.max(
        0,
        Math.round(
          target.progress
        )
      )
    );

  const calendarRange =
    formatWeekRange(
      target.weekStartDate,
      target.weekEndDate
    );

  function handleDelete() {
    const confirmed =
      window.confirm(
        `Delete "${targetTitle}"?`
      );

    if (!confirmed) {
      return;
    }

    deleteWeeklyTarget(
      targetId
    );
  }

  return (
    <Card hover glow>
      <div className="flex items-start justify-between">

        <div>
          <h3 className="text-xl font-bold text-white">
            {targetTitle}
          </h3>

          <p className="mt-2 text-cyan-400">
            🎯{" "}
            {monthlyTarget
              ? monthlyTarget.title
              : "Standalone Weekly Focus"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">

            <span>
              {calendarRange}
            </span>

            <span>
              •
            </span>

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
            `Delete ${targetTitle}`
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
            target.createdAt
          ).toLocaleDateString()}
        </span>

      </div>
    </Card>
  );
}