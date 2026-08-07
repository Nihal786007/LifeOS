import {
  FaCalendarAlt,
  FaCheckCircle,
  FaTrash,
} from "react-icons/fa";

import { useMonthlyPlanning } from "../../context/MonthlyPlanningContext";
import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";

import Button from "../ui/Button";
import Card from "../ui/Card";

interface Props {
  id: number;
}

export default function WeeklyTargetCard({
  id,
}: Props) {
  const {
    weeklyTargets,
    toggleWeeklyTarget,
    deleteWeeklyTarget,
  } = useWeeklyPlanning();

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
              : "Unknown Monthly Target"}
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

      <div className="mt-6 flex items-center justify-between">

        <div>

          <div className="flex items-center gap-2 text-sm text-slate-400">
            <FaCalendarAlt />

            <span>
              Created{" "}
              {new Date(
                target.createdAt
              ).toLocaleDateString()}
            </span>
          </div>

          {target.completedAt && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
              <FaCheckCircle />

              <span>
                Completed{" "}
                {new Date(
                  target.completedAt
                ).toLocaleDateString()}
              </span>
            </div>
          )}

        </div>

        <Button
          variant={
            target.completed
              ? "secondary"
              : "primary"
          }
          onClick={() =>
            toggleWeeklyTarget(
              target.id
            )
          }
        >
          {target.completed
            ? "✅ Completed"
            : "Mark Complete"}
        </Button>

      </div>

    </Card>
  );
}