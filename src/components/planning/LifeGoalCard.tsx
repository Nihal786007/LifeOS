import {
  FaCalendarAlt,
  FaTrash,
} from "react-icons/fa";

import { ProgressEngine } from "../../engines/ProgressEngine";

import type { LifeGoal } from "../../shared/types";

import { useLifeGoals } from "../../context/LifeGoalsContext";
import { useMonthlyPlanning } from "../../context/MonthlyPlanningContext";
import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";
import { useTasks } from "../../context/TaskContext";

import Button from "../ui/Button";
import GoalProgress from "./GoalProgress";

interface LifeGoalCardProps {
  goal: LifeGoal;
  onDelete: (id: number) => void;
}

export default function LifeGoalCard({
  goal,
  onDelete,
}: LifeGoalCardProps) {
  const {
    toggleLifeGoal,
    lifeGoals,
  } = useLifeGoals();

  const {
    monthlyPlans,
    completeMonthlyPlansByLifeGoal,
    uncompleteMonthlyPlansByLifeGoal,
  } = useMonthlyPlanning();

  const {
    weeklyTargets,
    completeWeeklyTargetsByMonthlyTarget,
    uncompleteWeeklyTargetsByMonthlyTarget,
  } = useWeeklyPlanning();

  const {
    tasks,
    completeTasksByWeeklyTarget,
    uncompleteTasksByWeeklyTarget,
  } = useTasks();

  const progress =
    ProgressEngine.getLifeGoalProgress(
      {
        lifeGoals,
        monthlyTargets: monthlyPlans,
        weeklyTargets,
        tasks,
      },
      goal.id
    );

  const completed =
    ProgressEngine.isLifeGoalCompleted(
      {
        lifeGoals,
        monthlyTargets: monthlyPlans,
        weeklyTargets,
        tasks,
      },
      goal.id
    );
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
        </div>

        <button
          onClick={() => {
            if (
              window.confirm(
                `Delete "${goal.title}"?`
              )
            ) {
              onDelete(goal.id);
            }
          }}
          className="rounded-xl p-3 text-red-400 transition hover:bg-red-500/10"
        >
          <FaTrash />
        </button>
      </div>

      <GoalProgress
        progress={progress}
      />

      <div className="mt-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <FaCalendarAlt />

            <span>
              Created{" "}
              {new Date(
                goal.createdAt
              ).toLocaleDateString()}
            </span>
          </div>

          {completed && (
            <div className="mt-2 text-sm font-medium text-green-400">
              ✅ Completed
            </div>
          )}

          {goal.targetDate && (
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
              <FaCalendarAlt />

              <span>
                Target: {goal.targetDate}
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
            const linkedMonthlyPlans =
              monthlyPlans.filter(
                (plan) =>
                  plan.goalId === goal.id
              );

            if (completed) {
              linkedMonthlyPlans.forEach(
                (plan) => {
                  const linkedWeeklyTargets =
                    weeklyTargets.filter(
                      (target) =>
                        target.monthlyTargetId ===
                        plan.id
                    );

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
                }
              );

              uncompleteMonthlyPlansByLifeGoal(
                goal.id
              );

              toggleLifeGoal(goal.id);
            } else {
              linkedMonthlyPlans.forEach(
                (plan) => {
                  const linkedWeeklyTargets =
                    weeklyTargets.filter(
                      (target) =>
                        target.monthlyTargetId ===
                        plan.id
                    );

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
                }
              );

              completeMonthlyPlansByLifeGoal(
                goal.id
              );

              toggleLifeGoal(goal.id);
            }
          }}
        >
          {completed
            ? "Completed"
            : "Mark Complete"}
        </Button>
      </div>
    </div>
  );
}