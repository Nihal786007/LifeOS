import {
  FaTrash,
  FaBullseye,
  FaCalendarAlt,
} from "react-icons/fa";

import { ProgressEngine } from "../../engines/ProgressEngine";

import { useLifeGoals } from "../../context/LifeGoalsContext";
import { useMonthlyPlanning } from "../../context/MonthlyPlanningContext";
import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";
import { useTasks } from "../../context/TaskContext";

import Button from "../ui/Button";
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
    toggleMonthlyPlan,
    deleteMonthlyPlan,
  } = useMonthlyPlanning();

  const {
    completeWeeklyTargetsByMonthlyTarget,
    uncompleteWeeklyTargetsByMonthlyTarget,
    weeklyTargets,
  } = useWeeklyPlanning();

  const {
    completeTasksByWeeklyTarget,
    uncompleteTasksByWeeklyTarget,
  } = useTasks();

  const { lifeGoals } =
    useLifeGoals();

  const plan =
    monthlyPlans.find(
      (p) => p.id === id
    );

  if (!plan) return null;

  const linkedWeeklyTargets =
    weeklyTargets.filter(
      (target) =>
        target.monthlyTargetId ===
        plan.id
    );

  const goal =
    lifeGoals.find(
      (g) => g.id === plan.goalId
    );

  const progress =
    ProgressEngine.getMonthlyProgress(
      {
        lifeGoals,
        monthlyTargets: monthlyPlans,
        weeklyTargets,
        tasks: [],
      },
      plan.id
    );

  const completed =
    ProgressEngine.isMonthlyCompleted(
      {
        lifeGoals,
        monthlyTargets: monthlyPlans,
        weeklyTargets,
        tasks: [],
      },
      plan.id
    );
      return (
    <Card hover glow>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FaBullseye className="text-cyan-400" />

            <h3 className="text-xl font-bold text-white">
              {plan.title}
            </h3>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {MONTHS[plan.month - 1]} {plan.year}
          </p>

          <p className="mt-3 text-cyan-400">
            {goal
              ? `🎯 ${goal.title}`
              : "Standalone Target"}
          </p>
        </div>

        <button
          onClick={() => {
            if (
              window.confirm(
                `Delete "${plan.title}"?`
              )
            ) {
              deleteMonthlyPlan(
                plan.id
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

      <div className="mt-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <FaCalendarAlt />

            <span>
              Created{" "}
              {new Date(
                plan.createdAt
              ).toLocaleDateString()}
            </span>
          </div>

          {completed && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
              <span>
                ✅ Completed
              </span>
            </div>
          )}
        </div>

        <Button
          variant={
            completed
              ? "secondary"
              : "primary"
          }
          onClick={() => {
            if (completed) {
              linkedWeeklyTargets.forEach(
                (target) => {
                  uncompleteTasksByWeeklyTarget(
                    target.id
                  );
                }
              );

              uncompleteWeeklyTargetsByMonthlyTarget(
                plan.id
              );

              toggleMonthlyPlan(
                plan.id
              );
            } else {
              linkedWeeklyTargets.forEach(
                (target) => {
                  completeTasksByWeeklyTarget(
                    target.id
                  );
                }
              );

              completeWeeklyTargetsByMonthlyTarget(
                plan.id
              );

              toggleMonthlyPlan(
                plan.id
              );
            }
          }}
        >
          {completed
            ? "Completed"
            : "Mark Complete"}
        </Button>
      </div>
    </Card>
  );
}