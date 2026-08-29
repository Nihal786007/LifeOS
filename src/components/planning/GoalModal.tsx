import {
  useState,
} from "react";

import Button from "../ui/Button";
import Modal from "../ui/Modal";

// ==========================================
// Types
// ==========================================

interface GoalModalProps {
  open: boolean;

  onClose: () => void;

  onCreate: (
    title: string,
    description: string,
    targetDate?: string
  ) => void;
}

// ==========================================
// Helpers
// ==========================================

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

function formatSelectedDate(
  value: string
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return value;
  }

  const date =
    new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );

  return date.toLocaleDateString(
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

export default function GoalModal({
  open,
  onClose,
  onCreate,
}: GoalModalProps) {
  const [
    title,
    setTitle,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    targetDate,
    setTargetDate,
  ] = useState("");

  // ==========================================
  // Actions
  // ==========================================

  function resetForm() {
    setTitle("");

    setDescription("");

    setTargetDate("");
  }

  function handleClose() {
    resetForm();

    onClose();
  }

  function handleCreate() {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return;
    }

    onCreate(
      trimmedTitle,
      description.trim(),
      targetDate ||
        undefined
    );

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
      title="New Life Goal"
      description="Define the long-term outcome. LifeOS will use today's date as the starting point automatically."
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
            Create Goal
          </Button>
        </>
      }
    >
      {/* ======================================
          Goal Title
      ====================================== */}

      <div>
        <label className="text-sm text-slate-400">
          Goal Title
        </label>

        <input
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
          placeholder="Get into MIT"
          className="
            mt-2
            w-full
            rounded-xl
            border
            border-slate-700
            bg-slate-950
            p-3
            text-white
            outline-none
            transition
            placeholder:text-slate-600
            focus:border-cyan-500
          "
          autoFocus
        />
      </div>

      {/* ======================================
          Description
      ====================================== */}

      <div>
        <label className="text-sm text-slate-400">
          Description
          <span className="ml-1 text-slate-600">
            Optional
          </span>
        </label>

        <textarea
          rows={
            4
          }
          value={
            description
          }
          onChange={(
            event
          ) =>
            setDescription(
              event.target.value
            )
          }
          placeholder="What does success look like?"
          className="
            mt-2
            w-full
            resize-none
            rounded-xl
            border
            border-slate-700
            bg-slate-950
            p-3
            text-white
            outline-none
            transition
            placeholder:text-slate-600
            focus:border-cyan-500
          "
        />
      </div>

      {/* ======================================
          Smart Start Date
      ====================================== */}

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
              Starts
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
          LifeOS automatically starts a new Life Goal today.
          You can change its timeline later from the goal editor.
        </p>
      </div>

      {/* ======================================
          Target Date
      ====================================== */}

      <div>
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <label className="text-sm text-slate-400">
            Target Date
            <span className="ml-1 text-slate-600">
              Optional
            </span>
          </label>

          {targetDate && (
            <span
              className="
                text-[10px]
                font-medium
                text-cyan-400
              "
            >
              {formatSelectedDate(
                targetDate
              )}
            </span>
          )}
        </div>

        <input
          type="date"
          value={
            targetDate
          }
          onChange={(
            event
          ) =>
            setTargetDate(
              event.target.value
            )
          }
          className="
            mt-2
            w-full
            rounded-xl
            border
            border-slate-700
            bg-slate-950
            p-3
            text-slate-200
            outline-none
            transition
            focus:border-cyan-500
          "
        />

        {!targetDate && (
          <p
            className="
              mt-2
              text-[10px]
              text-slate-600
            "
          >
            No deadline required. You can add one later.
          </p>
        )}
      </div>
    </Modal>
  );
}