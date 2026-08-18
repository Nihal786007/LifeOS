import {
  FaCalendarAlt,
  FaTrash,
} from "react-icons/fa";

import { ProgressEngine } from "../../engines/ProgressEngine";

import { useMonthlyPlanning } from "../../context/MonthlyPlanningContext";
import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";
import { useTasks } from "../../context/TaskContext";

import Card from "../ui/Card";

interface Props {
  id: number;
}

export default function WeeklyTargetCard({
  id,
}: Props) {
  const {
  weeklyTargets,
  deleteWeeklyTarget,
} = useWeeklyPlanning();
  const { tasks } = useTasks();

  const { monthlyPlans } =
    useMonthlyPlanning();

  const target =
    weeklyTargets.find(
      (t) => t.id === id
    );

  if (!target) return null;

  const monthlyTarget =
    monthlyPlans.find(
      (m) =>
        m.id ===
        target.monthlyTargetId
    );

  const progress =
    ProgressEngine.getWeeklyProgress(
      {
        lifeGoals: [],
        monthlyTargets: monthlyPlans,
        weeklyTargets,
        tasks,
      },
      target.id
    );

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
          onClick={() => {
            if (
              window.confirm(
                `Delete "${target.title}"?`
              )
            ) {
              deleteWeeklyTarget(
                target.id
              );
            }
          }}
          className="rounded-xl p-3 text-red-400 transition hover:bg-red-500/10"
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