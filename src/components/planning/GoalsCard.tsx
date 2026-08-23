import { useState } from "react";

import { useLifeGoals } from "../../context/LifeGoalsContext";
import { usePlanningExecution } from "../../context/PlanningExecutionContext";

import GoalModal from "./GoalModal";
import GoalEmptyState from "./GoalEmptyState";
import LifeGoalCard from "./LifeGoalCard";

export default function GoalsCard() {
  const {
    lifeGoals,
    addGoal,
  } = useLifeGoals();

  const {
    deleteLifeGoal,
  } = usePlanningExecution();

  const [openModal, setOpenModal] =
    useState(false);

  return (
    <>
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-8">

        <div className="mb-8 flex items-center justify-between">

          <div>

            <h2 className="text-3xl font-bold text-white">
              🎯 Life Goals
            </h2>

            <p className="mt-2 text-slate-400">
              Build the future one goal at a time.
            </p>

          </div>

          <button
            onClick={() =>
              setOpenModal(true)
            }
            className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            + New Goal
          </button>

        </div>

        {lifeGoals.length === 0 ? (
          <GoalEmptyState
            onCreate={() =>
              setOpenModal(true)
            }
          />
        ) : (
          <div className="space-y-6">

            {lifeGoals.map((goal) => (
              <LifeGoalCard
                key={goal.id}
                goal={goal}
                onDelete={
                  deleteLifeGoal
                }
              />
            ))}

          </div>
        )}

      </div>

      <GoalModal
        open={openModal}
        onClose={() =>
          setOpenModal(false)
        }
        onCreate={addGoal}
      />
    </>
  );
}