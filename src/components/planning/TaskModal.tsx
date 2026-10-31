// ==========================================
// LifeOS Shared Task Modal
// Version: 2.0
// ==========================================

import {
  useEffect,
  useMemo,
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
  Task,
  TaskPriority,
} from "../../shared/types";

// ==========================================
// Types
// ==========================================

interface TaskModalProps {
  open: boolean;

  onClose: () => void;

  task?: Task;

  defaultDueDate?: string;

  defaultWeeklyTargetId?: number;
}

// ==========================================
// Date Helpers
// ==========================================

function pad2(
  value: number
) {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
}

function getTodayLocalDate() {
  const today =
    new Date();

  return `${today.getFullYear()}-${pad2(
    today.getMonth() + 1
  )}-${pad2(
    today.getDate()
  )}`;
}

function parseLocalDate(
  value?: string
) {
  if (!value) {
    return undefined;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return undefined;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !==
      day
  ) {
    return undefined;
  }

  return date;
}

function formatDateLabel(
  value?: string
) {
  const date =
    parseLocalDate(
      value
    );

  if (!date) {
    return "No due date";
  }

  return date.toLocaleDateString(
    undefined,
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    }
  );
}

// ==========================================
// Component
// ==========================================

export default function TaskModal({
  open,
  onClose,
  task,
  defaultDueDate,
  defaultWeeklyTargetId,
}: TaskModalProps) {
  const {
    weeklyTargets,
  } = useWeeklyPlanning();

  const {
    createTask,
    updateTask,
  } = usePlanningExecution();

  const isEditing =
    task !==
    undefined;

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    dueDate,
    setDueDate,
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

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  // ==========================================
  // Smart Defaults
  // ==========================================

  const resolvedDefaultDueDate =
    useMemo(
      () =>
        defaultDueDate ??
        getTodayLocalDate(),
      [
        defaultDueDate,
      ]
    );

  // ==========================================
  // Form Synchronization
  // ==========================================

  const [formContext, setFormContext] = useState({ open: false, task, resolvedDefaultDueDate, defaultWeeklyTargetId });
  if (formContext.open !== open || formContext.task !== task ||
      formContext.resolvedDefaultDueDate !== resolvedDefaultDueDate ||
      formContext.defaultWeeklyTargetId !== defaultWeeklyTargetId) {
    setFormContext({ open, task, resolvedDefaultDueDate, defaultWeeklyTargetId });
    if (open) {
      setError(null);
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setDueDate(task ? task.dueDate ?? "" : resolvedDefaultDueDate);
      setPriority(task?.priority ?? "medium");
      const selectedWeek = task ? task.weeklyTargetId : defaultWeeklyTargetId;
      setWeeklyTargetId(selectedWeek === undefined ? "" : String(selectedWeek));
    }
  }

  // ==========================================
  // Escape Handling
  // ==========================================

  useEffect(
    () => {
      if (!open) {
        return;
      }

      function handleKeyDown(
        event: KeyboardEvent
      ) {
        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        event.preventDefault();

        onClose();
      }

      window.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      open,
      onClose,
    ]
  );

  // ==========================================
  // Close
  // ==========================================

  function handleClose() {
    setError(
      null
    );

    onClose();
  }

  // ==========================================
  // Save
  // ==========================================

  function handleSave() {
    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      setError(
        "Task title cannot be empty."
      );

      return;
    }

    const normalizedDescription =
      description.trim();

    const resolvedWeeklyTargetId =
      weeklyTargetId
        ? Number(
            weeklyTargetId
          )
        : undefined;

    // ========================================
    // Edit Existing Task
    // ========================================

    if (
      task
    ) {
      const relationshipChanged =
        resolvedWeeklyTargetId !==
        task.weeklyTargetId;

      const result =
        updateTask(
          task.id,
          {
            title:
              trimmedTitle,

            description:
              normalizedDescription,

            dueDate:
              dueDate ||
              null,

            priority,

            ...(relationshipChanged
              ? {
                  weeklyTargetId:
                    resolvedWeeklyTargetId ??
                    null,
                }
              : {}),
          }
        );

      if (
        !result.updated
      ) {
        setError(
          result.message
        );

        return;
      }

      handleClose();

      return;
    }

    // ========================================
    // Create New Task
    // ========================================

    createTask({
      title:
        trimmedTitle,

      description:
        normalizedDescription ||
        undefined,

      dueDate:
        dueDate ||
        undefined,

      priority,

      weeklyTargetId:
        resolvedWeeklyTargetId,
    });

    handleClose();
  }

  // ==========================================
  // Smart Context
  // ==========================================

  const selectedWeeklyTarget =
    weeklyTargetId
      ? weeklyTargets.find(
          (target) =>
            target.id ===
            Number(
              weeklyTargetId
            )
        )
      : undefined;

  const dueDateIsToday =
    dueDate ===
    getTodayLocalDate();

  // ==========================================
  // UI
  // ==========================================

  return (
    <Modal
      open={
        open
      }
      title={
        isEditing
          ? "Edit Task"
          : "New Task"
      }
      description={
        isEditing
          ? "Update the task. LifeOS will preserve its planning context and move it when the due date requires a different planned week."
          : "Create the task once. LifeOS will keep its date and planning relationship connected."
      }
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
              handleSave
            }
          >
            {
              isEditing
                ? "Save Changes"
                : "Create Task"
            }
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* ====================================
            Smart Planning Context
        ===================================== */}

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
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
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
                Due
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  font-semibold
                  text-lifeos-text
                "
              >
                {
                  dueDateIsToday
                    ? "Today"
                    : formatDateLabel(
                        dueDate
                      )
                }
              </p>

            </div>

            <div className="sm:text-right">

              <p
                className="
                  text-[11px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-lifeos-muted
                "
              >
                Planning context
              </p>

              <p className="mt-1 text-xs font-medium text-lifeos-text-secondary">
                {
                  selectedWeeklyTarget
                    ? selectedWeeklyTarget.title
                    : "Standalone Task"
                }
              </p>

            </div>

          </div>

          <p
            className="
              mt-2
              text-[11px]
              leading-4
              text-lifeos-muted
            "
          >
            {
              isEditing
                ? "Changing the due date can automatically move this task to the correct planned week when its planner relationship stays unchanged."
                : defaultDueDate
                  ? "LifeOS preselected this date from the planner context."
                  : "LifeOS defaults new tasks to today unless another planning context provides the date."
            }
          </p>
        </div>

        {/* ====================================
            Task Title
        ===================================== */}

        <div>

          <label
            className="
              mb-2
              block
              text-sm
              text-lifeos-text-secondary
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
            ) => {
              setTitle(
                event.target.value
              );

              setError(
                null
              );
            }}
            onKeyDown={(
              event
            ) => {
              if (
                event.key ===
                "Enter"
              ) {
                event.preventDefault();

                handleSave();
              }
            }}
          />

        </div>

        {/* ====================================
            Description
        ===================================== */}

        <div>

          <label
            className="
              mb-2
              block
              text-sm
              text-lifeos-text-secondary
            "
          >
            Description
            <span className="ml-1 text-lifeos-muted">
              Optional
            </span>
          </label>

          <textarea
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
            placeholder="Add useful context, notes, or the definition of done..."
            rows={
              3
            }
            className="
              w-full
              resize-none
              rounded-xl
              border
              border-lifeos-border
              bg-lifeos-app
              px-4
              py-3
              text-sm
              text-lifeos-text
              outline-none
              transition
              placeholder:text-lifeos-muted
              focus:border-lifeos-accent
            "
          />

          <p className="mt-1.5 text-[11px] text-lifeos-muted">
            Enter stays available for writing here. Use the Save button when the description is multiline.
          </p>

        </div>

        {/* ====================================
            Due Date
        ===================================== */}

        <div>

          <label
            className="
              mb-2
              block
              text-sm
              text-lifeos-text-secondary
            "
          >
            Due Date
          </label>

          <input
            type="date"
            value={
              dueDate
            }
            onChange={(
              event
            ) => {
              setDueDate(
                event.target.value
              );

              setError(
                null
              );
            }}
            className="
              w-full
              rounded-xl
              border
              border-lifeos-border
              bg-lifeos-app
              px-4
              py-3
              text-sm
              text-lifeos-text
              outline-none
              transition
              focus:border-lifeos-accent
            "
          />

        </div>

        {/* ====================================
            Priority
        ===================================== */}

        <div>

          <label
            className="
              mb-2
              block
              text-sm
              text-lifeos-text-secondary
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
              border-lifeos-border
              bg-lifeos-app
              px-4
              py-3
              text-sm
              text-lifeos-text
              outline-none
              transition
              focus:border-lifeos-accent
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
            Weekly Focus
        ===================================== */}

        <div>

          <label
            className="
              mb-2
              block
              text-sm
              text-lifeos-text-secondary
            "
          >
            Weekly Focus

            <span
              className="
                ml-1
                text-lifeos-muted
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
            ) => {
              setWeeklyTargetId(
                event.target.value
              );

              setError(
                null
              );
            }}
            className="
              w-full
              rounded-xl
              border
              border-lifeos-border
              bg-lifeos-app
              px-4
              py-3
              text-sm
              text-lifeos-text
              outline-none
              transition
              focus:border-lifeos-accent
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
              text-[11px]
              leading-4
              text-lifeos-muted
            "
          >
            Keep the existing Weekly Focus when you want LifeOS to automatically relocate the task based on its due date.
          </p>

        </div>

        {/* ====================================
            Error
        ===================================== */}

        {error && (
          <div
            className="
              rounded-lg
              border
              border-lifeos-danger/20
              bg-lifeos-danger/5
              px-3
              py-2
            "
          >
            <p className="text-xs text-lifeos-danger">
              {error}
            </p>
          </div>
        )}

        <p className="text-right text-[11px] text-lifeos-muted">
          Enter on the task title saves · Esc closes
        </p>

      </div>
    </Modal>
  );
}