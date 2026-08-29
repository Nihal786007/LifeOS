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

  monthlyOutcome?: MonthlyTarget;

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

  const parsed =
    new Date(
      value
    );

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

function getLongMonthLabel(
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

function getDateRangeLabel(
  startDate: Date,
  endDate: Date,
  year: number
) {
  const start =
    getShortDate(
      startDate
    );

  const end =
    getShortDate(
      endDate
    );

  return `${start} – ${end}, ${year}`;
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
      (
        1000 *
        60 *
        60 *
        24
      )
  );
}

function clampProgress(
  progress: number
) {
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        progress
      )
    )
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
    ) ??
    new Date();

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
        ? startOfDay(
            start
          )
        : calendarMonthStart;

    const slotEnd =
      isTargetMonth
        ? startOfDay(
            target
          )
        : calendarMonthEnd;

    const monthlyOutcome =
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

      monthlyOutcome,

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
        Boolean(
          month.monthlyOutcome
        )
    ).length;

  const currentMonth =
    months.find(
      (month) =>
        month.isCurrentMonth
    );

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
          rounded-xl
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
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              border-cyan-500/20
              bg-cyan-500/10
              text-sm
              text-cyan-400
            "
          >
            <FaCalendarDays />
          </div>

          <div className="min-w-0">
            <p
              className="
                text-sm
                font-semibold
                text-slate-300
              "
            >
              Timeline needs a target date
            </p>

            <p
              className="
                mt-1
                text-[11px]
                leading-5
                text-slate-600
              "
            >
              Add a target date from the goal editor and LifeOS will generate its monthly planning timeline automatically.
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
          Smart Timeline Header
      ====================================== */}

      <div
        className="
          flex
          flex-col
          gap-3
          border-b
          border-slate-800
          px-4
          py-4
          lg:flex-row
          lg:items-center
          lg:justify-between
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
            Smart Timeline
          </p>

          <p
            className="
              mt-1
              text-xs
              text-slate-500
            "
          >
            LifeOS maps this goal across its real calendar months.
          </p>
        </div>

        <div
          className="
            flex
            flex-wrap
            items-center
            gap-x-5
            gap-y-2
          "
        >
          <TimelineMetric
            label="Planning"
            value={`${plannedMonths}/${months.length} months planned`}
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

          <TimelineMetric
            label="Current"
            value={
              currentMonth
                ? currentMonth.label
                : "Outside timeline"
            }
          />
        </div>
      </div>

      {/* ======================================
          Goal Time Rail
      ====================================== */}

      <div
        className="
          border-b
          border-slate-800
          px-4
          py-3
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
            text-[10px]
            text-slate-600
          "
        >
          <span
            className="
              flex
              items-center
              gap-1.5
              font-medium
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
              font-medium
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
          text-[9px]
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
          mt-0.5
          whitespace-nowrap
          text-[11px]
          font-semibold
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
  const outcome =
    month.monthlyOutcome;

  const progress =
    outcome
      ? clampProgress(
          outcome.progress
        )
      : 0;

  const planningPeriod =
    getLongMonthLabel(
      month.month,
      month.year
    );

  return (
    <div
      className={`
        flex
        w-52
        shrink-0
        flex-col
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
      {/* ======================================
          Month Header
      ====================================== */}

      <div
        className="
          flex
          items-start
          justify-between
          gap-2
        "
      >
        <div className="min-w-0">
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
              text-[9px]
              text-slate-600
            "
          >
            {getDateRangeLabel(
              month.startDate,
              month.endDate,
              month.year
            )}
          </p>
        </div>

        {month.isCurrentMonth && (
          <span
            className="
              shrink-0
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

      {/* ======================================
          Timeline Markers
      ====================================== */}

      <div
        className="
          mt-2
          flex
          min-h-4
          flex-wrap
          gap-x-2
          gap-y-1
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
            Goal Start
          </span>
        )}

        {month.isTargetMonth && (
          <span
            className="
              flex
              items-center
              gap-1
              text-[9px]
              font-medium
              text-cyan-400
            "
          >
            <FaBullseye />

            Goal Target
          </span>
        )}
      </div>

      {/* ======================================
          Monthly Outcome
      ====================================== */}

      <div
        className="
          mt-3
          flex
          flex-1
          flex-col
        "
      >
        {outcome ? (
          <>
            <div
              className="
                flex
                flex-1
                items-start
                gap-2
                rounded-md
                border
                border-emerald-500/15
                bg-emerald-500/5
                p-2.5
              "
            >
              <FaCheck
                className="
                  mt-0.5
                  shrink-0
                  text-[9px]
                  text-emerald-400
                "
              />

              <div className="min-w-0 flex-1">
                <p
                  className="
                    line-clamp-3
                    text-[11px]
                    font-medium
                    leading-4
                    text-slate-300
                  "
                >
                  {outcome.title}
                </p>

                <div
                  className="
                    mt-2
                    flex
                    items-center
                    gap-2
                  "
                >
                  <div
                    className="
                      h-1
                      flex-1
                      overflow-hidden
                      rounded-full
                      bg-slate-800
                    "
                  >
                    <div
                      className="
                        h-full
                        rounded-full
                        bg-emerald-400
                      "
                      style={{
                        width:
                          `${progress}%`,
                      }}
                    />
                  </div>

                  <span
                    className="
                      shrink-0
                      text-[9px]
                      text-slate-600
                    "
                  >
                    {progress}%
                  </span>
                </div>
              </div>
            </div>

            <p
              className="
                mt-2
                text-[9px]
                font-bold
                uppercase
                tracking-wider
                text-emerald-400
              "
            >
              Monthly Outcome planned
            </p>
          </>
        ) : (
          <>
            <div
              className="
                flex
                flex-1
                flex-col
                justify-center
                rounded-md
                border
                border-dashed
                border-slate-800
                p-3
              "
            >
              <p
                className="
                  text-[10px]
                  font-medium
                  text-slate-500
                "
              >
                No Monthly Outcome
              </p>

              <p
                className="
                  mt-1
                  text-[9px]
                  leading-4
                  text-slate-700
                "
              >
                Define what this month should accomplish toward the goal.
              </p>
            </div>

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
                  justify-center
                  gap-1.5
                  rounded-md
                  border
                  border-cyan-500/20
                  bg-cyan-500/5
                  px-2.5
                  py-2
                  text-[10px]
                  font-semibold
                  text-cyan-400
                  transition
                  hover:bg-cyan-500/10
                  hover:text-cyan-300
                "
              >
                <FaPlus />

                Plan {planningPeriod}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}