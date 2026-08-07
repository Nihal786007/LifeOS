import { useState } from "react";

import { useMonthlyPlanning } from "../../context/MonthlyPlanningContext";
import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";

import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";

interface WeeklyTargetModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WeeklyTargetModal({
  open,
  onClose,
}: WeeklyTargetModalProps) {
  const { monthlyPlans } =
    useMonthlyPlanning();

  const { addWeeklyTarget } =
    useWeeklyPlanning();

  const [title, setTitle] =
    useState("");

  const [monthlyTargetId, setMonthlyTargetId] =
    useState("");

  const [week, setWeek] =
    useState<1 | 2 | 3 | 4 | 5>(1);

  function handleCreate() {
    if (!title.trim()) {
      alert("Please enter a weekly target.");
      return;
    }

    if (!monthlyTargetId) {
      alert(
        "Please select a Monthly Target."
      );
      return;
    }

    addWeeklyTarget(
      title.trim(),
      Number(monthlyTargetId),
      week
    );

    setTitle("");
    setMonthlyTargetId("");
    setWeek(1);

    onClose();
  }

  return (
    <Modal
      open={open}
      title="📆 New Weekly Target"
      description="Break a Monthly Target into weekly action."
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
            Monthly Target
          </label>

          <select
            value={monthlyTargetId}
            onChange={(e) =>
              setMonthlyTargetId(
                e.target.value
              )
            }
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-500"
          >
            <option value="">
              Select Monthly Target
            </option>

            {monthlyPlans.map((plan) => (
              <option
                key={plan.id}
                value={plan.id}
              >
                {plan.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Week
          </label>

          <select
            value={week}
            onChange={(e) =>
              setWeek(
                Number(
                  e.target.value
                ) as
                  | 1
                  | 2
                  | 3
                  | 4
                  | 5
              )
            }
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-500"
          >
            <option value={1}>
              Week 1
            </option>

            <option value={2}>
              Week 2
            </option>

            <option value={3}>
              Week 3
            </option>

            <option value={4}>
              Week 4
            </option>

            <option value={5}>
              Week 5
            </option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Weekly Target
          </label>

          <Input
            placeholder="Finish ESP32 Programming"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
          />
        </div>

      </div>
    </Modal>
  );
}