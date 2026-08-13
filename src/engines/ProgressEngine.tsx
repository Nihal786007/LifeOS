import { useEffect } from "react";

import { useTasks } from "../context/TaskContext";
import { useWeeklyPlanning } from "../context/WeeklyPlanningContext";
import { useMonthlyPlanning } from "../context/MonthlyPlanningContext";
import { useLifeGoals } from "../context/LifeGoalsContext";

export default function ProgressEngine() {
  const { tasks } = useTasks();

  const {
    weeklyTargets,
    updateWeeklyProgress,
  } = useWeeklyPlanning();

  const {
    monthlyPlans,
    updateMonthlyProgress,
  } = useMonthlyPlanning();

  const {
    lifeGoals,
    updateGoalProgress,
  } = useLifeGoals();

  // ===========================
  // Weekly Progress
  // ===========================

  useEffect(() => {
    weeklyTargets.forEach(
      (weeklyTarget) => {
        const linkedTasks =
          tasks.filter(
            (task) =>
              task.weeklyTargetId ===
              weeklyTarget.id
          );

        if (
          linkedTasks.length === 0
        ) {
          updateWeeklyProgress(
            weeklyTarget.id,
            0
          );

          return;
        }

        const completed =
          linkedTasks.filter(
            (task) =>
              task.completed
          ).length;

        const progress =
          Math.round(
            (completed /
              linkedTasks.length) *
              100
          );

        updateWeeklyProgress(
          weeklyTarget.id,
          progress
        );
      }
    );
  }, [
    tasks,
    weeklyTargets,
    updateWeeklyProgress,
  ]);

  // ===========================
  // Monthly Progress
  // ===========================

  useEffect(() => {
    monthlyPlans.forEach(
      (monthlyPlan) => {
        const linkedWeeklyTargets =
          weeklyTargets.filter(
            (weeklyTarget) =>
              weeklyTarget.monthlyTargetId ===
              monthlyPlan.id
          );

        if (
          linkedWeeklyTargets.length === 0
        ) {
          updateMonthlyProgress(
            monthlyPlan.id,
            0
          );

          return;
        }

        const totalProgress =
          linkedWeeklyTargets.reduce(
            (
              sum,
              weeklyTarget
            ) =>
              sum +
              (weeklyTarget.progress ??
                0),
            0
          );

        const progress =
          Math.round(
            totalProgress /
              linkedWeeklyTargets.length
          );

        updateMonthlyProgress(
          monthlyPlan.id,
          progress
        );
      }
    );
  }, [
    weeklyTargets,
    monthlyPlans,
    updateMonthlyProgress,
  ]);
      // ===========================
  // Life Goal Progress
  // ===========================

  useEffect(() => {
    lifeGoals.forEach((goal) => {
      const linkedMonthlyPlans =
        monthlyPlans.filter(
          (monthlyPlan) =>
            monthlyPlan.goalId === goal.id
        );

      if (linkedMonthlyPlans.length === 0) {
        updateGoalProgress(goal.id, 0);
        return;
      }

      const totalProgress =
        linkedMonthlyPlans.reduce(
          (sum, monthlyPlan) =>
            sum + (monthlyPlan.progress ?? 0),
          0
        );

      const progress = Math.round(
        totalProgress /
          linkedMonthlyPlans.length
      );

      updateGoalProgress(
        goal.id,
        progress
      );
    });
  }, [
    monthlyPlans,
    lifeGoals,
    updateGoalProgress,
  ]);

  return null;
}