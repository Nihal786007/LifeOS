import {
  useEffect,
  useState,
} from "react";

import {
  useLifeGoals,
} from "../../context/LifeGoalsContext";

import {
  useMonthlyPlanning,
} from "../../context/MonthlyPlanningContext";

import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";

// ==========================================
// Props
// ==========================================

interface MonthlyTargetModalProps {
  open: boolean;

  onClose: () => void;

  month: number;

  year: number;

  /**
   * When provided, the Monthly Target is
   * automatically linked to this Life Goal.
   *
   * Used by the Smart Goal Timeline so the
   * user never needs to re-select the goal.
   */
  lockedGoalId?: number;
}

// ==========================================
// Component
// ==========================================

export default function MonthlyTargetModal({
  open,
  onClose,
  month,
  year,
  lockedGoalId,
}: MonthlyTargetModalProps) {
  const {
    addMonthlyPlan,
  } = useMonthlyPlanning();

  const {
    lifeGoals,
  } = useLifeGoals();

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    goalId,
    setGoalId,
  ] = useState("");

  // ==========================================
  // Derived State
  // ==========================================

  const monthName =
    new Date(
      year,
      month - 1,
      1
    ).toLocaleString(
      "default",
      {
        month: "long",
      }
    );

  const lockedGoal =
    lockedGoalId ===
    undefined
      ? undefined
      : lifeGoals.find(
          (goal) =>
            goal.id ===
            lockedGoalId
        );

  // ==========================================
  // Sync Locked Goal
  // ==========================================

  useEffect(() => {
    if (
      lockedGoalId !==
      undefined
    ) {
      setGoalId(
        String(
          lockedGoalId
        )
      );
    }
  }, [
    lockedGoalId,
    open,
  ]);

  // ==========================================
  // Close / Reset
  // ==========================================

  function resetForm() {
    setTitle("");

    if (
      lockedGoalId ===
      undefined
    ) {
      setGoalId("");
    }
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
      alert(
        "Please enter a target title."
      );

      return;
    }

    const resolvedGoalId =
      lockedGoalId !==
      undefined
        ? lockedGoalId
        : goalId
          ? Number(goalId)
          : undefined;

    addMonthlyPlan(
      trimmedTitle,
      month,
      year,
      resolvedGoalId
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
      title={`Plan ${monthName} ${year}`}
      description={
        lockedGoal
          ? `Define what ${monthName} should achieve for "${lockedGoal.title}".`
          : `Create a target for ${monthName} ${year}.`
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
              handleCreate
            }
          >
            Plan Month
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* ====================================
            Goal Context
        ==================================== */}

        {lockedGoal ? (
          <div
            className="
              rounded-xl
              border
              border-cyan-500/20
              bg-cyan-500/5
              px-4
              py-3
            "
          >
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-wider
                text-cyan-400
              "
            >
              Life Goal
            </p>

            <p
              className="
                mt-1
                text-sm
                font-medium
                text-white
              "
            >
              {lockedGoal.title}
            </p>

            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              This monthly target will be linked
              automatically.
            </p>
          </div>
        ) : (
          <div>
            <label
              className="
                mb-2
                block
                text-sm
                text-slate-400
              "
            >
              Connect to Life Goal
            </label>

            <select
              value={
                goalId
              }
              onChange={(
                event
              ) =>
                setGoalId(
                  event.target.value
                )
              }
              className="
                w-full
                rounded-2xl
                border
                border-slate-800
                bg-slate-900
                px-5
                py-4
                text-white
                outline-none
                transition
                focus:border-cyan-500
              "
            >
              <option value="">
                Personal / Standalone Target
              </option>

              {lifeGoals.map(
                (goal) => (
                  <option
                    key={
                      goal.id
                    }
                    value={
                      goal.id
                    }
                  >
                    {goal.title}
                  </option>
                )
              )}
            </select>
          </div>
        )}

        {/* ====================================
            Month
        ==================================== */}

        <div
          className="
            grid
            grid-cols-2
            gap-3
          "
        >
          <div
            className="
              rounded-xl
              border
              border-slate-800
              bg-slate-950/40
              px-4
              py-3
            "
          >
            <p
              className="
                text-[10px]
                uppercase
                tracking-wider
                text-slate-600
              "
            >
              Month
            </p>

            <p
              className="
                mt-1
                text-sm
                font-medium
                text-slate-300
              "
            >
              {monthName}
            </p>
          </div>

          <div
            className="
              rounded-xl
              border
              border-slate-800
              bg-slate-950/40
              px-4
              py-3
            "
          >
            <p
              className="
                text-[10px]
                uppercase
                tracking-wider
                text-slate-600
              "
            >
              Year
            </p>

            <p
              className="
                mt-1
                text-sm
                font-medium
                text-slate-300
              "
            >
              {year}
            </p>
          </div>
        </div>

        {/* ====================================
            Monthly Outcome
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
            What should this month achieve?
          </label>

          <Input
            placeholder={
              lockedGoal
                ? `Example: Complete the ${monthName} milestone`
                : "Example: Finish SAT Math preparation"
            }
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
          />

          <p
            className="
              mt-2
              text-xs
              leading-5
              text-slate-600
            "
          >
            Keep this outcome focused. Weekly targets
            and Universal Tasks will break it into
            execution later.
          </p>
        </div>

      </div>
    </Modal>
  );
}