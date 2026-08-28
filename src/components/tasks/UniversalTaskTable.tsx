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
            grid-cols-[40px_minmax(150px,1fr)_90px_90px_40px]
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

          <div />
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
            grid-cols-[44px_minmax(220px,1fr)_56px_140px_110px_110px_100px_44px]
            items-center
            border-b
            border-slate-700
            bg-slate-950/80
            px-3
            text-xs
            font-semibold
            uppercase
            tracking-wider
            text-slate-500
            md:grid
          "
        >
          <div />

          <div className="px-3">
            Task
          </div>

          <div className="text-center">
            Plan
          </div>

          <div className="px-3">
            Week
          </div>

          <div className="px-2">
            Priority
          </div>

          <div className="px-3">
            Due
          </div>

          <div className="px-3">
            Status
          </div>

          <div />
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