import {
  FaPen,
  FaTrash,
} from "react-icons/fa";

import type {
  Task,
} from "../../shared/types";

// ==========================================
// Types
// ==========================================

export type UniversalTaskRowVariant =
  | "full"
  | "compact";

interface UniversalTaskRowProps {
  task: Task;

  planType?:
    | "personal"
    | "goal"
    | "none";

  weeklyTargetTitle?: string;

  variant?: UniversalTaskRowVariant;

  onToggle: (
    taskId: number
  ) => void;

  onEdit?: (
    taskId: number
  ) => void;

  onDelete?: (
    taskId: number
  ) => void;
}

// ==========================================
// Styles
// ==========================================

const priorityStyles = {
  low:
    "text-green-400 bg-green-500/10 border-green-500/20",

  medium:
    "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",

  high:
    "text-red-400 bg-red-500/10 border-red-500/20",
};

// ==========================================
// Helpers
// ==========================================

function formatDate(
  date?: string
) {
  if (!date) {
    return "—";
  }

  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    undefined,
    {
      month:
        "short",

      day:
        "numeric",
    }
  );
}

function getPlanSymbol(
  planType:
    | "personal"
    | "goal"
    | "none"
) {
  switch (
    planType
  ) {
    case "goal":
      return "🎯";

    case "personal":
      return "👤";

    default:
      return "—";
  }
}

function getPlanLabel(
  planType:
    | "personal"
    | "goal"
    | "none"
) {
  switch (
    planType
  ) {
    case "goal":
      return "Life Goal";

    case "personal":
      return "Personal";

    default:
      return "Standalone";
  }
}

// ==========================================
// Component
// ==========================================

export default function UniversalTaskRow({
  task,

  planType = "none",

  weeklyTargetTitle,

  variant = "full",

  onToggle,

  onEdit,

  onDelete,
}: UniversalTaskRowProps) {
  const planSymbol =
    getPlanSymbol(
      planType
    );

  const planLabel =
    getPlanLabel(
      planType
    );

  const isCompact =
    variant ===
    "compact";

  // ==========================================
  // Edit
  // ==========================================

  function handleEdit() {
    if (!onEdit) {
      return;
    }

    onEdit(
      task.id
    );
  }

  // ==========================================
  // Delete
  // ==========================================

  function handleDelete() {
    if (!onDelete) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${task.title}"?`
      );

    if (!confirmed) {
      return;
    }

    onDelete(
      task.id
    );
  }

  // ==========================================
  // Completion Button
  // ==========================================

  const completionButton = (
    <button
      type="button"
      onClick={() =>
        onToggle(
          task.id
        )
      }
      aria-label={
        task.completed
          ? `Mark ${task.title} incomplete`
          : `Complete ${task.title}`
      }
      className={`
        flex
        h-5
        w-5
        shrink-0
        items-center
        justify-center
        rounded
        border
        text-xs
        font-bold
        transition

        ${
          task.completed
            ? "border-cyan-400 bg-cyan-400 text-slate-950"
            : "border-slate-600 hover:border-cyan-400"
        }
      `}
    >
      {
        task.completed
          ? "✓"
          : ""
      }
    </button>
  );

  // ==========================================
  // Edit Button
  // ==========================================

  const editButton =
    onEdit ? (
      <button
        type="button"
        onClick={
          handleEdit
        }
        className="
          rounded-md
          p-2
          text-slate-600
          transition
          hover:bg-cyan-500/10
          hover:text-cyan-300
        "
        aria-label={
          `Edit ${task.title}`
        }
        title="Edit task"
      >
        <FaPen />
      </button>
    ) : null;

  // ==========================================
  // Delete Button
  // ==========================================

  const deleteButton =
    onDelete ? (
      <button
        type="button"
        onClick={
          handleDelete
        }
        className="
          rounded-md
          p-2
          text-slate-600
          transition
          hover:bg-red-500/10
          hover:text-red-400
        "
        aria-label={
          `Delete ${task.title}`
        }
        title="Delete task"
      >
        <FaTrash />
      </button>
    ) : null;

  // ==========================================
  // Compact Desktop / Tablet Row
  // ==========================================

  if (
    isCompact
  ) {
    return (
      <>
        <div
          className="
            hidden
            min-h-11
            grid-cols-[40px_minmax(150px,1fr)_90px_90px_76px]
            items-center
            border-b
            border-slate-800
            px-2
            text-sm
            transition
            hover:bg-slate-800/40
            md:grid
          "
        >
          {/* Complete */}

          <div className="flex items-center justify-center">
            {
              completionButton
            }
          </div>

          {/* Task */}

          <div className="min-w-0 px-2">

            <p
              className={`
                truncate
                text-sm
                font-medium

                ${
                  task.completed
                    ? "text-slate-500 line-through"
                    : "text-slate-100"
                }
              `}
              title={
                task.title
              }
            >
              {
                task.title
              }
            </p>

            {task.description && (
              <p
                className="
                  mt-0.5
                  truncate
                  text-[11px]
                  text-slate-600
                "
                title={
                  task.description
                }
              >
                {
                  task.description
                }
              </p>
            )}

          </div>

          {/* Priority */}

          <div className="px-1">

            <span
              className={`
                inline-flex
                rounded-md
                border
                px-2
                py-0.5
                text-[10px]
                font-medium
                capitalize

                ${
                  priorityStyles[
                    task.priority
                  ]
                }
              `}
            >
              {
                task.priority
              }
            </span>

          </div>

          {/* Due */}

          <div className="whitespace-nowrap px-1 text-xs text-slate-400">
            {
              formatDate(
                task.dueDate
              )
            }
          </div>

          {/* Actions */}

          <div className="flex items-center justify-center">
            {
              editButton
            }

            {
              deleteButton
            }
          </div>

        </div>

        {/* ==================================
            Compact Mobile Row
        ================================== */}

        <div
          className="
            border-b
            border-slate-800
            px-2
            py-2.5
            transition
            hover:bg-slate-800/40
            md:hidden
          "
        >
          <div className="flex items-start gap-2.5">

            <div className="mt-0.5">
              {
                completionButton
              }
            </div>

            <div className="min-w-0 flex-1">

              <p
                className={`
                  truncate
                  text-sm
                  font-medium

                  ${
                    task.completed
                      ? "text-slate-500 line-through"
                      : "text-slate-100"
                  }
                `}
                title={
                  task.title
                }
              >
                {
                  task.title
                }
              </p>

              {task.description && (
                <p
                  className="
                    mt-0.5
                    truncate
                    text-[11px]
                    text-slate-600
                  "
                  title={
                    task.description
                  }
                >
                  {
                    task.description
                  }
                </p>
              )}

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">

                <span
                  className={`
                    rounded
                    border
                    px-1.5
                    py-0.5
                    capitalize

                    ${
                      priorityStyles[
                        task.priority
                      ]
                    }
                  `}
                >
                  {
                    task.priority
                  }
                </span>

                {task.dueDate && (
                  <>
                    <span>
                      •
                    </span>

                    <span>
                      {
                        formatDate(
                          task.dueDate
                        )
                      }
                    </span>
                  </>
                )}

              </div>

            </div>

            {(onEdit ||
              onDelete) && (
              <div className="flex shrink-0 items-center">
                {
                  editButton
                }

                {
                  deleteButton
                }
              </div>
            )}

          </div>
        </div>
      </>
    );
  }

  // ==========================================
  // Full Desktop / Tablet Row
  // ==========================================

  return (
    <>
      <div
        className="
          hidden
          min-h-12
          grid-cols-[44px_minmax(240px,1.2fr)_110px_minmax(220px,1.4fr)_90px_88px_78px_76px]
          items-center
          border-b
          border-slate-800
          px-3
          text-sm
          transition
          hover:bg-slate-800/40
          md:grid
        "
      >
        {/* Complete */}

        <div className="flex items-center justify-center">
          {
            completionButton
          }
        </div>

        {/* Task */}

        <div className="min-w-0 px-3">

          <p
            className={`
              truncate
              font-medium

              ${
                task.completed
                  ? "text-slate-500 line-through"
                  : "text-slate-100"
              }
            `}
            title={
              task.title
            }
          >
            {
              task.title
            }
          </p>

          {task.description && (
            <p
              className="
                mt-0.5
                truncate
                text-xs
                text-slate-500
              "
              title={
                task.description
              }
            >
              {
                task.description
              }
            </p>
          )}

        </div>

        {/* Plan */}

        <div className="px-2">

          <div
            className="
              flex
              items-center
              justify-center
              gap-1.5
              whitespace-nowrap
              text-xs
              font-medium
            "
            title={
              planLabel
            }
          >
            <span className="text-sm">
              {
                planSymbol
              }
            </span>

            <span
              className={
                planType ===
                "none"
                  ? "text-slate-600"
                  : "text-slate-400"
              }
            >
              {
                planLabel
              }
            </span>

          </div>

        </div>

        {/* Weekly Focus */}

        <div
          className="
            min-w-0
            px-3
            text-sm
            text-slate-400
          "
          title={
            weeklyTargetTitle
          }
        >
          <p className="truncate">
            {
              weeklyTargetTitle ??
              "—"
            }
          </p>
        </div>

        {/* Priority */}

        <div className="px-1">

          <span
            className={`
              inline-flex
              rounded-md
              border
              px-2
              py-0.5
              text-[11px]
              font-medium
              capitalize

              ${
                priorityStyles[
                  task.priority
                ]
              }
            `}
          >
            {
              task.priority
            }
          </span>

        </div>

        {/* Due */}

        <div className="whitespace-nowrap px-1 text-xs text-slate-400">
          {
            formatDate(
              task.dueDate
            )
          }
        </div>

        {/* Status */}

        <div className="px-1 text-xs">

          <span
            className={
              task.completed
                ? "text-green-400"
                : "text-slate-400"
            }
          >
            {
              task.completed
                ? "Done"
                : "Pending"
            }
          </span>

        </div>

        {/* Actions */}

        <div className="flex items-center justify-center">
          {
            editButton
          }

          {
            deleteButton
          }
        </div>

      </div>

      {/* ======================================
          Full Mobile Row
      ====================================== */}

      <div
        className="
          border-b
          border-slate-800
          px-3
          py-2.5
          transition
          hover:bg-slate-800/40
          md:hidden
        "
      >
        <div className="flex items-start gap-3">

          <div className="mt-0.5">
            {
              completionButton
            }
          </div>

          <div className="min-w-0 flex-1">

            <div className="flex items-start justify-between gap-3">

              <p
                className={`
                  min-w-0
                  flex-1
                  truncate
                  text-sm
                  font-medium

                  ${
                    task.completed
                      ? "text-slate-500 line-through"
                      : "text-slate-100"
                  }
                `}
              >
                {
                  task.title
                }
              </p>

              <span
                className="
                  inline-flex
                  shrink-0
                  items-center
                  gap-1
                  text-[11px]
                  text-slate-500
                "
                title={
                  planLabel
                }
              >
                <span>
                  {
                    planSymbol
                  }
                </span>

                <span>
                  {
                    planLabel
                  }
                </span>
              </span>

            </div>

            {task.description && (
              <p
                className="
                  mt-0.5
                  truncate
                  text-xs
                  text-slate-600
                "
                title={
                  task.description
                }
              >
                {
                  task.description
                }
              </p>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">

              <span
                className={`
                  rounded
                  border
                  px-1.5
                  py-0.5
                  capitalize

                  ${
                    priorityStyles[
                      task.priority
                    ]
                  }
                `}
              >
                {
                  task.priority
                }
              </span>

              {task.dueDate && (
                <>
                  <span>
                    •
                  </span>

                  <span>
                    {
                      formatDate(
                        task.dueDate
                      )
                    }
                  </span>
                </>
              )}

            </div>

            {weeklyTargetTitle && (
              <p
                className="
                  mt-1.5
                  truncate
                  text-[11px]
                  text-slate-500
                "
                title={
                  weeklyTargetTitle
                }
              >
                {
                  weeklyTargetTitle
                }
              </p>
            )}

          </div>

          {(onEdit ||
            onDelete) && (
            <div className="flex shrink-0 items-center">

              {
                editButton
              }

              {
                deleteButton
              }

            </div>
          )}

        </div>
      </div>
    </>
  );
}