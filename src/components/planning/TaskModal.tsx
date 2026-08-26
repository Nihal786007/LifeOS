import { useState } from "react";

import { useTasks } from "../../context/TaskContext";
import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";

import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TaskModal({
  open,
  onClose,
}: TaskModalProps) {
  const {
    addTask,
  } = useTasks();

  const {
    weeklyTargets,
  } = useWeeklyPlanning();

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    priority,
    setPriority,
  ] = useState<
    "low" | "medium" | "high"
  >("medium");

  const [
    weeklyTargetId,
    setWeeklyTargetId,
  ] = useState("");

  function handleCreate() {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      alert(
        "Please enter a task."
      );
      return;
    }

    addTask({
      title: trimmedTitle,

      dueDate:
        today,

      priority,

      weeklyTargetId:
        weeklyTargetId
          ? Number(
              weeklyTargetId
            )
          : undefined,
    });

    setTitle("");
    setPriority("medium");
    setWeeklyTargetId("");

    onClose();
  }

  return (
    <Modal
      open={open}
      title="✅ New Task"
      description="Plan what you want to accomplish today."
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            onClick={
              handleCreate
            }
          >
            Create Task
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Task
          </label>

          <Input
            placeholder="Finish SAT Practice"
            value={title}
            onChange={(
              event
            ) =>
              setTitle(
                event.target.value
              )
            }
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Priority
          </label>

          <select
            value={priority}
            onChange={(
              event
            ) =>
              setPriority(
                event.target
                  .value as
                  | "low"
                  | "medium"
                  | "high"
              )
            }
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-500"
          >
            <option value="low">
              🟢 Low
            </option>

            <option value="medium">
              🟡 Medium
            </option>

            <option value="high">
              🔴 High
            </option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Weekly Target (Optional)
          </label>

          <select
            value={
              weeklyTargetId
            }
            onChange={(
              event
            ) =>
              setWeeklyTargetId(
                event.target.value
              )
            }
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-500"
          >
            <option value="">
              Standalone Task
            </option>

            {weeklyTargets.map(
              (target) => (
                <option
                  key={
                    target.id
                  }
                  value={
                    target.id
                  }
                >
                  {
                    target.title
                  }
                </option>
              )
            )}
          </select>
        </div>

      </div>
    </Modal>
  );
}