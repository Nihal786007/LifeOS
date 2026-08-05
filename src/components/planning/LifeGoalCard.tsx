import { FaCalendarAlt, FaTrash } from "react-icons/fa";

import type { LifeGoal } from "../../shared/types";

import GoalProgress from "./GoalProgress";

interface LifeGoalCardProps {
  goal: LifeGoal;

  onDelete: (id: number) => void;
}

export default function LifeGoalCard({
  goal,
  onDelete,
}: LifeGoalCardProps) {
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
          onClick={() =>
            onDelete(goal.id)
          }
          className="rounded-xl p-3 text-red-400 transition hover:bg-red-500/10"
        >
          <FaTrash />
        </button>

      </div>

      <GoalProgress
        progress={goal.progress}
      />

      {goal.targetDate && (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">

          <FaCalendarAlt />

          <span>
            Target: {goal.targetDate}
          </span>

        </div>
      )}

    </div>
  );
}