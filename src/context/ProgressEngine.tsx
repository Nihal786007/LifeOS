import {
  useEffect,
} from "react";

import {
  useLifeGoals,
} from "./LifeGoalsContext";

import {
  useMonthlyPlanning,
} from "./MonthlyPlanningContext";

export default function ProgressEngine() {
  const {
    lifeGoals,
    updateGoal,
  } = useLifeGoals();

  const {
    monthlyPlans,
  } = useMonthlyPlanning();

  useEffect(() => {
    lifeGoals.forEach((goal) => {

      const linkedPlans =
        monthlyPlans.filter(
          (plan) =>
            plan.goalId === goal.id
        );

      if (linkedPlans.length === 0) {

        if (goal.progress !== 0) {

          updateGoal({
            ...goal,
            progress: 0,
          });

        }

        return;
      }

      const completedPlans =
        linkedPlans.filter(
          (plan) => plan.completed
        ).length;

      const progress =
        Math.round(
          (completedPlans /
            linkedPlans.length) *
            100
        );
              if (
        goal.progress !==
        progress
      ) {
        updateGoal({
          ...goal,
          progress,
        });
      }

    });
  }, [
    lifeGoals,
    monthlyPlans,
    updateGoal,
  ]);

  return null;
}