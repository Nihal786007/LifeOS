import {
  FaBullseye,
  FaCalendarDays,
  FaCheck,
  FaPlus,
} from "react-icons/fa6";

import type {
  LifeGoal,
  MonthlyTarget,
} from "../../shared/types";

// ==========================================
// Types
// ==========================================

interface SmartGoalTimelineProps {
  goal: LifeGoal;

  monthlyPlans: MonthlyTarget[];

  onPlanMonth?: (
    month: number,
    year: number
  ) => void;
}

interface GoalMonthSlot {
  month: number;
  year: number;

  label: string;

  startDate: Date;
  endDate: Date;

  monthlyTarget?: MonthlyTarget;

  isCurrentMonth: boolean;
  isStartMonth: boolean;
  isTargetMonth: boolean;
}

// ==========================================
// Date Helpers
// ==========================================

function parseDate(
  value?: string
) {
  if (!value) {
    return undefined;
  }

  const dateOnlyMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (dateOnlyMatch) {
    const year =
      Number(
        dateOnlyMatch[1]
      );

    const month =
      Number(
        dateOnlyMatch[2]
      );

    const day =
      Number(
        dateOnlyMatch[3]
      );

    return new Date(
      year,
      month - 1,
      day
    );
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return undefined;
  }

  return parsed;
}

function startOfDay(
  date: Date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function getMonthLabel(
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
      month: "short",
      year: "numeric",
    }
  );
}

function getLongDate(
  date: Date
) {
  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function getShortDate(
  date: Date
) {
  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    }
  );
}

function getDaysRemaining(
  targetDate: Date
) {
  const today =
    startOfDay(
      new Date()
    );

  const target =
    startOfDay(
      targetDate
    );

  const difference =
    target.getTime() -
    today.getTime();

  return Math.ceil(
    difference /
      (1000 * 60 * 60 * 24)
  );
}

// ==========================================
// Smart Month Generator
// ==========================================

function buildGoalMonths(
  goal: LifeGoal,
  monthlyPlans: MonthlyTarget[]
): GoalMonthSlot[] {
  const start =
    parseDate(
      goal.startDate
    ) ?? new Date();

  const rawTarget =
    parseDate(
      goal.targetDate
    );

  const target =
    rawTarget &&
    rawTarget.getTime() >=
      start.getTime()
      ? rawTarget
      : start;

  const today =
    new Date();

  const goalPlans =
    monthlyPlans.filter(
      (plan) =>
        plan.goalId ===
        goal.id
    );

  const months:
    GoalMonthSlot[] = [];

  let cursor =
    new Date(
      start.getFullYear(),
      start.getMonth(),
      1
    );

  const finalMonth =
    new Date(
      target.getFullYear(),
      target.getMonth(),
      1
    );

  while (
    cursor.getTime() <=
    finalMonth.getTime()
  ) {
    const year =
      cursor.getFullYear();

    const zeroBasedMonth =
      cursor.getMonth();

    const month =
      zeroBasedMonth + 1;

    const isStartMonth =
      year ===
        start.getFullYear() &&
      zeroBasedMonth ===
        start.getMonth();

    const isTargetMonth =
      year ===
        target.getFullYear() &&
      zeroBasedMonth ===
        target.getMonth();

    const calendarMonthStart =
      new Date(
        year,
        zeroBasedMonth,
        1
      );

    const calendarMonthEnd =
      new Date(
        year,
        zeroBasedMonth + 1,
        0
      );

    const slotStart =
      isStartMonth
        ? startOfDay(start)
        : calendarMonthStart;

    const slotEnd =
      isTargetMonth
        ? startOfDay(target)
        : calendarMonthEnd;

    const monthlyTarget =
      goalPlans.find(
        (plan) =>
          plan.month ===
            month &&
          plan.year ===
            year
      );

    months.push({
      month,
      year,

      label:
        getMonthLabel(
          month,
          year
        ),

      startDate:
        slotStart,

      endDate:
        slotEnd,

      monthlyTarget,

      isStartMonth,

      isTargetMonth,

      isCurrentMonth:
        today.getFullYear() ===
          year &&
        today.getMonth() ===
          zeroBasedMonth,
    });

    cursor =
      new Date(
        year,
        zeroBasedMonth + 1,
        1
      );
  }

  return months;
}

// ==========================================
// Component
// ==========================================

export default function SmartGoalTimeline({
  goal,
  monthlyPlans,
  onPlanMonth,
}: SmartGoalTimelineProps) {
  const startDate =
    parseDate(
      goal.startDate
    );

  const targetDate =
    parseDate(
      goal.targetDate
    );

  const months =
    buildGoalMonths(
      goal,
      monthlyPlans
    );

  const plannedMonths =
    months.filter(
      (month) =>
        month.monthlyTarget
    ).length;

  const daysRemaining =
    targetDate
      ? getDaysRemaining(
          targetDate
        )
      : undefined;

  // ==========================================
  // No Target Date
  // ==========================================

  if (!targetDate) {
    return (
      <div
        className="
          rounded-lg
          border
          border-slate-800
          bg-slate-950/35
          p-4
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
          "
        >
          <div
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              border-cyan-500/20
              bg-cyan-500/10
              text-xs
              text-cyan-400
            "
          >
            <FaCalendarDays />
          </div>

          <div>
            <p
              className="
                text-xs
                font-semibold
                text-slate-300
              "
            >
              Smart timeline unavailable
            </p>

            <p
              className="
                mt-0.5
                text-[11px]
                text-slate-600
              "
            >
              Add a target date to generate
              the goal calendar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Timeline
  // ==========================================

  return (
    <div
      className="
        overflow-hidden
        rounded-xl
        border
        border-slate-800
        bg-slate-950/35
      "
    >
      {/* ======================================
          Timeline Profile Header
      ====================================== */}

      <div
        className="
          grid
          gap-3
          border-b
          border-slate-800
          px-4
          py-3
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <TimelineMetric
          label="Start"
          value={
            startDate
              ? getLongDate(
                  startDate
                )
              : "Unknown"
          }
        />

        <TimelineMetric
          label="Target"
          value={
            getLongDate(
              targetDate
            )
          }
        />

        <TimelineMetric
          label="Months Planned"
          value={`${plannedMonths} / ${months.length}`}
        />

        <TimelineMetric
          label="Time Left"
          value={
            daysRemaining ===
            undefined
              ? "—"
              : daysRemaining < 0
                ? `${Math.abs(
                    daysRemaining
                  )} days overdue`
                : daysRemaining ===
                    0
                  ? "Due today"
                  : `${daysRemaining} days`
          }
        />
      </div>

      {/* ======================================
          Goal Time Rail
      ====================================== */}

      <div
        className="
          border-b
          border-slate-800
          px-4
          py-4
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
            text-[11px]
            text-slate-600
          "
        >
          <span
            className="
              flex
              items-center
              gap-1.5
              text-cyan-400
            "
          >
            <span
              className="
                h-2
                w-2
                rounded-full
                bg-cyan-400
              "
            />

            Start
          </span>

          <div
            className="
              h-px
              flex-1
              bg-slate-800
            "
          />

          <span
            className="
              flex
              items-center
              gap-1.5
              text-slate-400
            "
          >
            Target

            <FaBullseye
              className="
                text-cyan-400
              "
            />
          </span>
        </div>
      </div>

      {/* ======================================
          Smart Calendar Months
      ====================================== */}

      <div
        className="
          overflow-x-auto
          p-3
        "
      >
        <div
          className="
            flex
            min-w-max
            gap-2
          "
        >
          {months.map(
            (month) => (
              <GoalMonthSlotCard
                key={`${month.year}-${month.month}`}
                month={
                  month
                }
                onPlanMonth={
                  onPlanMonth
                }
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Timeline Metric
// ==========================================

interface TimelineMetricProps {
  label: string;
  value: string;
}

function TimelineMetric({
  label,
  value,
}: TimelineMetricProps) {
  return (
    <div>
      <p
        className="
          text-[10px]
          font-semibold
          uppercase
          tracking-wider
          text-slate-600
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          truncate
          text-xs
          font-medium
          text-slate-300
        "
      >
        {value}
      </p>
    </div>
  );
}

// ==========================================
// Month Slot
// ==========================================

interface GoalMonthSlotCardProps {
  month: GoalMonthSlot;

  onPlanMonth?: (
    month: number,
    year: number
  ) => void;
}

function GoalMonthSlotCard({
  month,
  onPlanMonth,
}: GoalMonthSlotCardProps) {
  const target =
    month.monthlyTarget;

  return (
    <div
      className={`
        w-44
        shrink-0
        rounded-lg
        border
        p-3
        transition
        ${
          month.isCurrentMonth
            ? "border-cyan-500/30 bg-cyan-500/5"
            : "border-slate-800 bg-slate-900/60"
        }
      `}
    >
      {/* Month Header */}

      <div
        className="
          flex
          items-start
          justify-between
          gap-2
        "
      >
        <div>
          <p
            className="
              text-xs
              font-semibold
              text-slate-200
            "
          >
            {month.label}
          </p>

          <p
            className="
              mt-0.5
              text-[10px]
              text-slate-600
            "
          >
            {getShortDate(
              month.startDate
            )}
            {" – "}
            {getShortDate(
              month.endDate
            )}
          </p>
        </div>

        {month.isCurrentMonth && (
          <span
            className="
              rounded
              bg-cyan-500/10
              px-1.5
              py-0.5
              text-[9px]
              font-bold
              uppercase
              tracking-wide
              text-cyan-400
            "
          >
            Now
          </span>
        )}
      </div>

      {/* Start / Target Markers */}

      <div
        className="
          mt-2
          flex
          min-h-4
          flex-wrap
          gap-1
        "
      >
        {month.isStartMonth && (
          <span
            className="
              text-[9px]
              font-medium
              text-cyan-400
            "
          >
            ● Goal Start
          </span>
        )}

        {month.isTargetMonth && (
          <span
            className="
              text-[9px]
              font-medium
              text-cyan-400
            "
          >
            🎯 Target
          </span>
        )}
      </div>

      {/* Planned / Empty */}

      {target ? (
        <div
          className="
            mt-3
            rounded-md
            border
            border-emerald-500/15
            bg-emerald-500/5
            p-2
          "
        >
          <div
            className="
              flex
              items-center
              gap-1.5
              text-[10px]
              font-semibold
              text-emerald-400
            "
          >
            <FaCheck />

            Planned
          </div>

          <p
            className="
              mt-1
              line-clamp-2
              text-[11px]
              leading-4
              text-slate-300
            "
          >
            {target.title}
          </p>

          <p
            className="
              mt-1
              text-[10px]
              text-slate-600
            "
          >
            {Math.round(
              target.progress
            )}
            % complete
          </p>
        </div>
      ) : (
        <div
          className="
            mt-3
            rounded-md
            border
            border-dashed
            border-slate-800
            p-2
          "
        >
          <p
            className="
              text-[10px]
              text-slate-600
            "
          >
            No monthly target
          </p>

          {onPlanMonth && (
            <button
              type="button"
              onClick={() =>
                onPlanMonth(
                  month.month,
                  month.year
                )
              }
              className="
                mt-2
                inline-flex
                items-center
                gap-1.5
                text-[10px]
                font-semibold
                text-cyan-400
                transition
                hover:text-cyan-300
              "
            >
              <FaPlus />

              Plan Month
            </button>
          )}
        </div>
      )}
    </div>
  );
}