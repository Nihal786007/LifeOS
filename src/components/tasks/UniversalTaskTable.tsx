import type {
  Task,
} from "../../shared/types";

import UniversalTaskRow from "./UniversalTaskRow";

import type {
  UniversalTaskRowVariant,
} from "./UniversalTaskRow";

// ==========================================
// Types
// ==========================================

interface UniversalTaskTableProps {
  tasks: Task[];

  getPlanIcon?: (
    task: Task
  ) =>
    | "personal"
    | "goal"
    | "none";

  getWeeklyTargetTitle?: (
    task: Task
  ) => string | undefined;

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

  emptyMessage?: string;
}

// ==========================================
// Component
// ==========================================

export default function UniversalTaskTable({
  tasks,

  getPlanIcon,

  getWeeklyTargetTitle,

  variant = "full",

  onToggle,

  onEdit,

  onDelete,

  emptyMessage = "No tasks found.",
}: UniversalTaskTableProps) {
  const isCompact =
    variant ===
    "compact";

  // ==========================================
  // Empty State
  // ==========================================

  if (
    tasks.length === 0
  ) {
    return (
      <div
        className={`
          rounded-xl
          border
          border-slate-800
          bg-slate-900/60
          text-center
          text-slate-500

          ${
            isCompact
              ? "px-4 py-5 text-xs"
              : "px-5 py-8 text-sm"
          }
        `}
      >
        {emptyMessage}
      </div>
    );
  }

  // ==========================================
  // Table
  // ==========================================

  return (
    <div
      className="
        overflow-hidden
        rounded-xl
        border
        border-slate-800
        bg-slate-900
      "
    >
      {/* ======================================
          Compact Desktop Header
      ====================================== */}

      {isCompact && (
        <div
          className="
            hidden
            min-h-9
            grid-cols-[40px_minmax(150px,1fr)_90px_90px_76px]
            items-center
            border-b
            border-slate-700
            bg-slate-950/80
            px-2
            text-[10px]
            font-semibold
            uppercase
            tracking-wider
            text-slate-600
            md:grid
          "
        >
          <div />

          <div className="px-2">
            Task
          </div>

          <div className="px-1">
            Priority
          </div>

          <div className="px-1">
            Due
          </div>

          <div className="text-center">
            Actions
          </div>
        </div>
      )}

      {/* ======================================
          Full Desktop Header
      ====================================== */}

      {!isCompact && (
        <div
          className="
            hidden
            min-h-10
            grid-cols-[44px_minmax(240px,1.2fr)_110px_minmax(220px,1.4fr)_90px_88px_78px_76px]
            items-center
            border-b
            border-slate-700
            bg-slate-950/80
            px-3
            text-[11px]
            font-semibold
            uppercase
            tracking-wider
            text-slate-500
            md:grid
          "
        >
          {/* Complete */}

          <div />

          {/* Task */}

          <div className="px-3">
            Task
          </div>

          {/* Plan */}

          <div className="text-center">
            Plan
          </div>

          {/* Weekly Focus */}

          <div className="px-3">
            Weekly Focus
          </div>

          {/* Priority */}

          <div className="px-1">
            Priority
          </div>

          {/* Due */}

          <div className="px-1">
            Due
          </div>

          {/* Status */}

          <div className="px-1">
            Status
          </div>

          {/* Actions */}

          <div className="text-center">
            Actions
          </div>
        </div>
      )}

      {/* ======================================
          Rows
      ====================================== */}

      <div>
        {tasks.map(
          (task) => {
            const planType =
              getPlanIcon
                ? getPlanIcon(
                    task
                  )
                : "none";

            const weeklyTargetTitle =
              getWeeklyTargetTitle
                ? getWeeklyTargetTitle(
                    task
                  )
                : undefined;

            return (
              <UniversalTaskRow
                key={
                  task.id
                }
                task={
                  task
                }
                planType={
                  planType
                }
                weeklyTargetTitle={
                  weeklyTargetTitle
                }
                variant={
                  variant
                }
                onToggle={
                  onToggle
                }
                onEdit={
                  onEdit
                }
                onDelete={
                  onDelete
                }
              />
            );
          }
        )}
      </div>
    </div>
  );
}