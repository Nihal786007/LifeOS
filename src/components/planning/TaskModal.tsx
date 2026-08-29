import {
  useState,
} from "react";

import {
  useWeeklyPlanning,
} from "../../context/WeeklyPlanningContext";

import {
  usePlanningExecution,
} from "../../context/PlanningExecutionContext";

import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";

import type {
  TaskPriority,
} from "../../shared/types";

// ==========================================
// Types
// ==========================================

interface TaskModalProps {
  open: boolean;

  onClose: () => void;
}

// ==========================================
// Date Helpers
// ==========================================

function getTodayLocalDate() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      today.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function getTodayLabel() {
  return new Date().toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

// ==========================================
// Component
// ==========================================

export default function TaskModal({
  open,
  onClose,
}: TaskModalProps) {
  const {
    weeklyTargets,
  } = useWeeklyPlanning();

  const {
    createTask,
  } = usePlanningExecution();

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    priority,
    setPriority,
  ] = useState<TaskPriority>(
    "medium"
  );

  const [
    weeklyTargetId,
    setWeeklyTargetId,
  ] = useState("");

  // ==========================================
  // Reset / Close
  // ==========================================

  function resetForm() {
    setTitle("");

    setPriority(
      "medium"
    );

    setWeeklyTargetId("");
  }

  function handleClose() {
    resetForm();

    onClose();
  }

  // ==========================================
  // Creation
  // ==========================================

  function handleCreate() {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return;
    }

    createTask({
      title:
        trimmedTitle,

      dueDate:
        getTodayLocalDate(),

      priority,

      weeklyTargetId:
        weeklyTargetId
          ? Number(
              weeklyTargetId
            )
          : undefined,
    });

    resetForm();

    onClose();
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <Modal
      open={
        open
      }
      title="New Task"
      description="Create a task for today. LifeOS already knows today's date."
      footer={
        <>
          <Button
            variant="secondary"
            onClick={
              handleClose
            }
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

        {/* ====================================
            Smart Date Context
        ==================================== */}

        <div
          className="
            rounded-xl
            border
            border-cyan-500/15
            bg-cyan-500/5
            px-4
            py-3
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >
            <div>
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-cyan-400
                "
              >
                Due
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  font-semibold
                  text-slate-200
                "
              >
                Today
              </p>
            </div>

            <p
              className="
                text-xs
                font-medium
                text-slate-400
              "
            >
              {getTodayLabel()}
            </p>
          </div>

          <p
            className="
              mt-2
              text-[10px]
              leading-4
              text-slate-600
            "
          >
            Tasks created here are due today automatically.
          </p>
        </div>

        {/* ====================================
            Task
        ==================================== */}

        <div>
          <label
            className="
              mb-2
              block
              text-sm
              text-slate-400
            "
          >
            Task
          </label>

          <Input
            placeholder="What needs to be done?"
            value={
              title
            }
            onChange={(
              event
            ) =>
              setTitle(
                event.target.value
              )
            }
            onKeyDown={(
              event
            ) => {
              if (
                event.key ===
                "Enter"
              ) {
                event.preventDefault();

                handleCreate();
              }

              if (
                event.key ===
                "Escape"
              ) {
                event.preventDefault();

                handleClose();
              }
            }}
          />
        </div>

        {/* ====================================
            Priority
        ==================================== */}

        <div>
          <label
            className="
              mb-2
              block
              text-sm
              text-slate-400
            "
          >
            Priority
          </label>

          <select
            value={
              priority
            }
            onChange={(
              event
            ) =>
              setPriority(
                event.target.value as TaskPriority
              )
            }
            className="
              w-full
              rounded-xl
              border
              border-slate-800
              bg-slate-950
              px-4
              py-3
              text-sm
              text-white
              outline-none
              transition
              focus:border-cyan-500
            "
          >
            <option value="low">
              Low
            </option>

            <option value="medium">
              Medium
            </option>

            <option value="high">
              High
            </option>
          </select>
        </div>

        {/* ====================================
            Optional Weekly Focus
        ==================================== */}

        <div>
          <label
            className="
              mb-2
              block
              text-sm
              text-slate-400
            "
          >
            Weekly Focus
            <span
              className="
                ml-1
                text-slate-600
              "
            >
              Optional
            </span>
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
            className="
              w-full
              rounded-xl
              border
              border-slate-800
              bg-slate-950
              px-4
              py-3
              text-sm
              text-white
              outline-none
              transition
              focus:border-cyan-500
            "
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
                  {target.title}
                </option>
              )
            )}
          </select>

          <p
            className="
              mt-2
              text-[10px]
              leading-4
              text-slate-600
            "
          >
            Link the task only when it belongs to an existing Weekly Focus.
          </p>
        </div>

      </div>
    </Modal>
  );
}