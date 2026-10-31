import {
  useState,
} from "react";

import {
  useLifeGoals,
} from "../../context/LifeGoalsContext";

import {
  usePlanningExecution,
} from "../../context/PlanningExecutionContext";

import GoalModal from "./GoalModal";
import GoalEmptyState from "./GoalEmptyState";
import LifeGoalCard from "./LifeGoalCard";

export default function GoalsCard() {
  const {
    lifeGoals,
  } = useLifeGoals();

  const {
    createLifeGoal,
    deleteLifeGoal,
  } = usePlanningExecution();

  const [
    openModal,
    setOpenModal,
  ] = useState(false);

  function handleCreateGoal(
    title: string,
    description: string,
    targetDate?: string
  ) {
    const result =
      createLifeGoal({
        title,
        description,
        targetDate,
      });

    if (
      !result.created
    ) {
      return;
    }
  }

  return (
    <>
      <div className="rounded-3xl border border-lifeos-border bg-lifeos-surface p-8">

        <div className="mb-8 flex items-center justify-between">

          <div>

            <h2 className="text-3xl font-bold text-lifeos-text">
              🎯 Life Goals
            </h2>

            <p className="mt-2 text-lifeos-text-secondary">
              Build the future one goal at a time.
            </p>

          </div>

          <button
            onClick={() =>
              setOpenModal(
                true
              )
            }
            className="rounded-xl bg-lifeos-accent px-5 py-3 font-semibold text-lifeos-accent-foreground transition hover:bg-lifeos-accent"
          >
            + New Goal
          </button>

        </div>

        {lifeGoals.length === 0 ? (
          <GoalEmptyState
            onCreate={() =>
              setOpenModal(
                true
              )
            }
          />
        ) : (
          <div className="space-y-6">

            {lifeGoals.map(
              (goal) => (
                <LifeGoalCard
                  key={
                    goal.id
                  }
                  goal={
                    goal
                  }
                  onDelete={
                    deleteLifeGoal
                  }
                />
              )
            )}

          </div>
        )}

      </div>

      <GoalModal
        open={
          openModal
        }
        onClose={() =>
          setOpenModal(
            false
          )
        }
        onCreate={
          handleCreateGoal
        }
      />
    </>
  );
}