import { useState } from "react";

import { useLifeGoals } from "../../context/LifeGoalsContext";
import { useMonthlyPlanning } from "../../context/MonthlyPlanningContext";

import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";

interface MonthlyTargetModalProps {
  open: boolean;
  onClose: () => void;
  month: number;
  year: number;
}

export default function MonthlyTargetModal({
  open,
  onClose,
  month,
  year,
}: MonthlyTargetModalProps) {
  const { addMonthlyPlan } = useMonthlyPlanning();
  const { lifeGoals } = useLifeGoals();

  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");

  const monthName = new Date(
    year,
    month - 1
  ).toLocaleString("default", {
    month: "long",
  });

  function handleCreate() {
    if (!title.trim()) {
  alert("Please enter a target title.");
  return;
}

    addMonthlyPlan(
      title.trim(),
      month,
      year,
      goalId ? Number(goalId) : undefined
    );

    setTitle("");
    setGoalId("");

    onClose();
  }

  return (
    <Modal
      open={open}
      title="📅 New Monthly Target"
      description={`Create a target for ${monthName} ${year}.`}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            onClick={handleCreate}
          >
            Create Target
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Target Title
          </label>

          <Input
            placeholder="Finish SAT Math"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Connect to Life Goal
          </label>

          <select
            value={goalId}
            onChange={(e) =>
              setGoalId(e.target.value)
            }
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-500"
          >
            <option value="">
              Standalone Target
            </option>

            {lifeGoals.map((goal) => (
              <option
                key={goal.id}
                value={goal.id}
              >
                {goal.title}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}