import {
  useState,
} from "react";

import {
  useLifeGoals,
} from "../../context/LifeGoalsContext";

import {
  usePlanningExecution,
} from "../../context/PlanningExecutionContext";

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
   * When provided, the Monthly Outcome is
   * automatically linked to this Life Goal.
   *
   * Used by Smart Goal Timeline so the user
   * never needs to re-select the goal.
   */
  lockedGoalId?: number;
}

// ==========================================
// Helpers
// ==========================================

function formatMonthYear(
  month: number,
  year: number
) {
  return new Date(
    year,
    month - 1,
    1
  ).toLocaleDateString(
    undefined,
    {
      month: "long",
      year: "numeric",
    }
  );
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
    lifeGoals,
  } = useLifeGoals();

  const {
    createMonthlyOutcome,
  } = usePlanningExecution();

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    goalId,
    setGoalId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState<
    string | undefined
  >(undefined);

  // ==========================================
  // Derived Context
  // ==========================================

  const planningPeriod =
    formatMonthYear(
      month,
      year
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

  const [goalContext, setGoalContext] = useState({ open: false, lockedGoalId });
  if (goalContext.open !== open || goalContext.lockedGoalId !== lockedGoalId) {
    setGoalContext({ open, lockedGoalId });
    if (open) setGoalId(lockedGoalId === undefined ? "" : String(lockedGoalId));
  }

  // ==========================================
  // Reset / Close
  // ==========================================

  function resetForm() {
    setTitle("");

    setError(
      undefined
    );

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
      setError(
        "Please enter a Monthly Outcome."
      );

      return;
    }

    const resolvedGoalId =
      lockedGoalId !==
      undefined
        ? lockedGoalId
        : goalId
          ? Number(
              goalId
            )
          : undefined;

    const result =
      createMonthlyOutcome(
        trimmedTitle,
        month,
        year,
        resolvedGoalId
      );

    if (
      !result.created
    ) {
      setError(
        result.message
      );

      return;
    }

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
      title={`Plan ${planningPeriod}`}
      description={
        lockedGoal
          ? `Define what ${planningPeriod} should accomplish for "${lockedGoal.title}".`
          : `Define the main outcome for ${planningPeriod}.`
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
            Smart Context
        ==================================== */}

        <div
          className="
            rounded-xl
            border
            border-lifeos-accent/15
            bg-lifeos-accent/5
            px-4
            py-4
          "
        >
          <div
            className="
              flex
              flex-col
              gap-4
              sm:flex-row
              sm:items-start
              sm:justify-between
            "
          >
            <div className="min-w-0">
              <p
                className="
                  text-[11px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-lifeos-accent
                "
              >
                Planning Period
              </p>

              <p
                className="
                  mt-1
                  text-base
                  font-semibold
                  text-lifeos-text
                "
              >
                {planningPeriod}
              </p>

              <p
                className="
                  mt-1
                  text-[11px]
                  leading-4
                  text-lifeos-muted
                "
              >
                Selected automatically from the planning timeline.
              </p>
            </div>

            {lockedGoal && (
              <div
                className="
                  min-w-0
                  sm:max-w-[50%]
                  sm:text-right
                "
              >
                <p
                  className="
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-lifeos-muted
                  "
                >
                  Life Goal
                </p>

                <p
                  className="
                    mt-1
                    truncate
                    text-sm
                    font-medium
                    text-lifeos-text
                  "
                >
                  {lockedGoal.title}
                </p>

                <p
                  className="
                    mt-1
                    text-[11px]
                    text-lifeos-muted
                  "
                >
                  Linked automatically
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ====================================
            Optional Goal Selection
        ==================================== */}

        {!lockedGoal && (
          <div>
            <label
              className="
                mb-2
                block
                text-sm
                text-lifeos-text-secondary
              "
            >
              Planning Context
            </label>

            <select
              value={
                goalId
              }
              onChange={(
                event
              ) => {
                setGoalId(
                  event.target.value
                );

                if (error) {
                  setError(
                    undefined
                  );
                }
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
                Personal / Standalone
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

            <p
              className="
                mt-2
                text-[11px]
                leading-4
                text-lifeos-muted
              "
            >
              Choose a Life Goal only when this month is being planned outside a goal timeline.
            </p>
          </div>
        )}

        {/* ====================================
            Monthly Outcome
        ==================================== */}

        <div>
          <label
            className="
              mb-2
              block
              text-sm
              font-medium
              text-lifeos-text-secondary
            "
          >
            What should {planningPeriod} achieve?
          </label>

          <Input
            placeholder={
              lockedGoal
                ? `Example: Complete the ${planningPeriod} milestone`
                : `Example: Finish SAT Math preparation in ${planningPeriod}`
            }
            value={
              title
            }
            onChange={(
              event
            ) => {
              setTitle(
                event.target.value
              );

              if (error) {
                setError(
                  undefined
                );
              }
            }}
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

          {error && (
            <div
              className="
                mt-3
                rounded-lg
                border
                border-lifeos-warning/20
                bg-lifeos-warning/5
                px-3
                py-2
              "
            >
              <p
                className="
                  text-xs
                  text-lifeos-warning
                "
              >
                {error}
              </p>
            </div>
          )}

          <p
            className="
              mt-2
              text-xs
              leading-5
              text-lifeos-muted
            "
          >
            Keep this outcome focused. LifeOS will break it into real calendar weeks and Universal Tasks later.
          </p>
        </div>

      </div>
    </Modal>
  );
}