import {
  FaCalendarAlt,
  FaTrash,
} from "react-icons/fa";

import { ProgressEngine } from "../../engines/ProgressEngine";

import { useMonthlyPlanning } from "../../context/MonthlyPlanningContext";
import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";
import { useTasks } from "../../context/TaskContext";
import { usePlanningExecution } from "../../context/PlanningExecutionContext";

import Card from "../ui/Card";

interface Props {
  id: number;
}

export default function WeeklyTargetCard({
  id,
}: Props) {
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
      (item) => item.id === id
    );

  if (!target) {
    return null;
  }

  const targetId =
    target.id;

  const targetTitle =
    target.title;

  const monthlyTarget =
    monthlyPlans.find(
      (month) =>
        month.id ===
        target.monthlyTargetId
    );

  const progress =
    ProgressEngine.getWeeklyProgress(
      {
        lifeGoals: [],
        monthlyTargets:
          monthlyPlans,
        weeklyTargets,
        tasks,
      },
      target.id
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
            {target.title}
          </h3>

          <p className="mt-2 text-cyan-400">
            🎯{" "}
            {monthlyTarget
              ? monthlyTarget.title
              : "Standalone Weekly Target"}
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Week {target.week}
          </p>
        </div>

        <button
          onClick={
            handleDelete
          }
          className="rounded-xl p-3 text-red-400 transition hover:bg-red-500/10"
          aria-label={`Delete ${target.title}`}
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
              width: `${progress}%`,
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