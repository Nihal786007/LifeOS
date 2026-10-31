import {
  useId,
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
  const formId = useId();
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
      onClose={handleClose}
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
        <label htmlFor={`${formId}-title`} className="text-sm text-lifeos-text-secondary">
          Goal Title
        </label>

        <input
          id={`${formId}-title`}
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
            border-lifeos-border
            bg-lifeos-app
            p-3
            text-lifeos-text
            outline-none
            transition
            placeholder:text-lifeos-muted
            focus:border-lifeos-accent
          "
          autoFocus
        />
      </div>

      {/* ======================================
          Description
      ====================================== */}

      <div>
        <label htmlFor={`${formId}-description`} className="text-sm text-lifeos-text-secondary">
          Description
          <span className="ml-1 text-lifeos-muted">
            Optional
          </span>
        </label>

        <textarea
          id={`${formId}-description`}
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
            border-lifeos-border
            bg-lifeos-app
            p-3
            text-lifeos-text
            outline-none
            transition
            placeholder:text-lifeos-muted
            focus:border-lifeos-accent
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
          border-lifeos-accent/15
          bg-lifeos-accent/5
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
                text-[11px]
                font-bold
                uppercase
                tracking-wider
                text-lifeos-accent
              "
            >
              Starts
            </p>

            <p
              className="
                mt-1
                text-sm
                font-semibold
                text-lifeos-text
              "
            >
              Today
            </p>
          </div>

          <p
            className="
              text-xs
              font-medium
              text-lifeos-text-secondary
            "
          >
            {getTodayLabel()}
          </p>
        </div>

        <p
          className="
            mt-2
            text-[11px]
            leading-4
            text-lifeos-muted
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
          <label htmlFor={`${formId}-target`} className="text-sm text-lifeos-text-secondary">
            Target Date
            <span className="ml-1 text-lifeos-muted">
              Optional
            </span>
          </label>

          {targetDate && (
            <span
              className="
                text-[11px]
                font-medium
                text-lifeos-accent
              "
            >
              {formatSelectedDate(
                targetDate
              )}
            </span>
          )}
        </div>

        <input
          id={`${formId}-target`}
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
            border-lifeos-border
            bg-lifeos-app
            p-3
            text-lifeos-text
            outline-none
            transition
            focus:border-lifeos-accent
          "
        />

        {!targetDate && (
          <p
            className="
              mt-2
              text-[11px]
              text-lifeos-muted
            "
          >
            No deadline required. You can add one later.
          </p>
        )}
      </div>
    </Modal>
  );
}
