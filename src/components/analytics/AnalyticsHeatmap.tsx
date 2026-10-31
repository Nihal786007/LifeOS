import {
  useMemo,
} from "react";

// ==========================================
// Types
// ==========================================

export interface AnalyticsHeatmapPoint {
  date: string;

  completedTasks: number;

  xpEarned: number;
}

interface AnalyticsHeatmapProps {
  data: AnalyticsHeatmapPoint[];

  mode:
    | "month"
    | "year";
}

interface NormalizedHeatmapPoint
  extends AnalyticsHeatmapPoint {
  dateObject: Date;

  intensity: number;
}

// ==========================================
// Constants
// ==========================================

const WEEKDAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

// ==========================================
// Date Helpers
// ==========================================

function parseLocalDate(
  value: string
): Date {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function formatTooltipDate(
  value: string
): string {
  return parseLocalDate(
    value
  ).toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function getMondayIndex(
  date: Date
): number {
  const day =
    date.getDay();

  return day === 0
    ? 6
    : day - 1;
}

function getMonday(
  date: Date
): Date {
  const result =
    new Date(
      date
    );

  const mondayIndex =
    getMondayIndex(
      result
    );

  result.setDate(
    result.getDate() -
      mondayIndex
  );

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function getSunday(
  date: Date
): Date {
  const monday =
    getMonday(
      date
    );

  const sunday =
    new Date(
      monday
    );

  sunday.setDate(
    monday.getDate() +
      6
  );

  return sunday;
}

function addDays(
  date: Date,
  amount: number
): Date {
  const result =
    new Date(
      date
    );

  result.setDate(
    result.getDate() +
      amount
  );

  return result;
}

function formatDateKey(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

// ==========================================
// Activity Helpers
// ==========================================

function getIntensity(
  completedTasks: number,
  xpEarned: number
): number {
  const activityScore =
    completedTasks +
    Math.floor(
      xpEarned / 100
    );

  if (
    activityScore <= 0
  ) {
    return 0;
  }

  if (
    activityScore <= 2
  ) {
    return 1;
  }

  if (
    activityScore <= 4
  ) {
    return 2;
  }

  if (
    activityScore <= 6
  ) {
    return 3;
  }

  return 4;
}

function getIntensityClass(
  intensity: number
): string {
  switch (intensity) {
    case 1:
      return "bg-lifeos-heatmap-1 border-lifeos-border";

    case 2:
      return "bg-lifeos-heatmap-2 border-lifeos-border";

    case 3:
      return "bg-lifeos-heatmap-3 border-lifeos-border";

    case 4:
      return "bg-lifeos-heatmap-4 border-lifeos-border";

    case 0:
    default:
      return "bg-lifeos-surface border-lifeos-border";
  }
}

// ==========================================
// Activity Cell
// ==========================================

interface ActivityCellProps {
  point:
    NormalizedHeatmapPoint;

  showDayNumber?: boolean;

  compact?: boolean;
}

function ActivityCell({
  point,

  showDayNumber = false,

  compact = false,
}: ActivityCellProps) {
  const dayNumber =
    point.dateObject.getDate();

  return (
    <div
      className="group relative"
    >
      <div
        title={
          `${formatTooltipDate(
            point.date
          )} • ${point.completedTasks} completed • ${point.xpEarned} XP`
        }
        className={`
          flex
          cursor-default
          items-center
          justify-center
          rounded-[5px]
          border
          transition
          hover:scale-110
          hover:ring-2
          hover:ring-lifeos-accent/40

          ${
            compact
              ? "h-4 w-4"
              : "h-9 w-9"
          }

          ${getIntensityClass(
            point.intensity
          )}
        `}
      >
        {showDayNumber && (
          <span
            className={`
              text-[11px]
              font-semibold

              ${
                point.intensity >=
                3
                  ? "text-lifeos-accent-foreground"
                  : "text-lifeos-text-secondary"
              }
            `}
          >
            {
              dayNumber
            }
          </span>
        )}
      </div>

      {/* ====================================
          Custom Tooltip
      ==================================== */}

      <div
        className="
          pointer-events-none
          absolute
          bottom-full
          left-1/2
          z-50
          mb-2
          hidden
          w-max
          min-w-[170px]
          -translate-x-1/2
          rounded-lg
          border
          border-lifeos-border
          bg-lifeos-app
          px-3
          py-2.5
          text-xs
          shadow-2xl
          group-hover:block
        "
      >
        <p className="font-semibold text-lifeos-text">
          {
            formatTooltipDate(
              point.date
            )
          }
        </p>

        <div className="mt-2 space-y-1">

          <p className="text-lifeos-text-secondary">
            Completed{" "}
            <span className="font-semibold text-lifeos-text">
              {
                point.completedTasks
              }
            </span>
          </p>

          <p className="text-lifeos-text-secondary">
            XP{" "}
            <span className="font-semibold text-lifeos-warning">
              +
              {
                point.xpEarned
              }
            </span>
          </p>

        </div>
      </div>
    </div>
  );
}

// ==========================================
// Month Heatmap
// ==========================================

function MonthHeatmap({
  data,
}: {
  data:
    NormalizedHeatmapPoint[];
}) {
  if (
    data.length === 0
  ) {
    return null;
  }

  const firstDate =
    data[0].dateObject;

  const leadingEmptyCells =
    getMondayIndex(
      firstDate
    );

  return (
    <div className="overflow-x-auto">

      <div className="min-w-[520px]">

        {/* ==================================
            Weekday Headers
        ================================== */}

        <div className="mb-2 grid grid-cols-7 gap-2">

          {WEEKDAY_LABELS.map(
            (label) => (
              <div
                key={
                  label
                }
                className="text-center text-[11px] font-semibold uppercase tracking-wider text-lifeos-muted"
              >
                {
                  label
                }
              </div>
            )
          )}

        </div>

        {/* ==================================
            Days
        ================================== */}

        <div className="grid grid-cols-7 gap-2">

          {Array.from({
            length:
              leadingEmptyCells,
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={
                  `empty-${index}`
                }
                className="h-9 w-9 justify-self-center rounded-[5px] border border-transparent"
              />
            )
          )}

          {data.map(
            (point) => (
              <div
                key={
                  point.date
                }
                className="justify-self-center"
              >
                <ActivityCell
                  point={
                    point
                  }
                  showDayNumber
                />
              </div>
            )
          )}

        </div>

      </div>
    </div>
  );
}

// ==========================================
// Year Heatmap
// ==========================================

function YearHeatmap({
  data,
}: {
  data:
    NormalizedHeatmapPoint[];
}) {
  const calendar =
    useMemo(() => {
      if (
        data.length === 0
      ) {
        return null;
      }

      const dataMap =
        new Map(
          data.map(
            (point) => [
              point.date,
              point,
            ]
          )
        );

      const firstDate =
        data[0].dateObject;

      const lastDate =
        data[
          data.length - 1
        ].dateObject;

      const calendarStart =
        getMonday(
          firstDate
        );

      const calendarEnd =
        getSunday(
          lastDate
        );

      const weeks: Array<
        Array<
          NormalizedHeatmapPoint | null
        >
      > = [];

      const monthLabels: {
        label: string;
        weekIndex: number;
      }[] = [];

      let cursor =
        new Date(
          calendarStart
        );

      let weekIndex = 0;

      let lastMonth =
        -1;

      while (
        cursor.getTime() <=
        calendarEnd.getTime()
      ) {
        const week: Array<
          NormalizedHeatmapPoint | null
        > = [];

        for (
          let dayIndex = 0;
          dayIndex < 7;
          dayIndex += 1
        ) {
          const key =
            formatDateKey(
              cursor
            );

          const point =
            dataMap.get(
              key
            ) ??
            null;

          week.push(
            point
          );

          if (
            point &&
            point.dateObject.getMonth() !==
              lastMonth
          ) {
            lastMonth =
              point.dateObject.getMonth();

            monthLabels.push({
              label:
                point.dateObject.toLocaleDateString(
                  undefined,
                  {
                    month:
                      "short",
                  }
                ),

              weekIndex,
            });
          }

          cursor =
            addDays(
              cursor,
              1
            );
        }

        weeks.push(
          week
        );

        weekIndex +=
          1;
      }

      return {
        weeks,
        monthLabels,
      };
    }, [
      data,
    ]);

  if (
    !calendar
  ) {
    return null;
  }

  return (
    <div className="overflow-x-auto pb-2">

      <div className="min-w-max">

        {/* ==================================
            Month Labels
        ================================== */}

        <div
          className="mb-2 grid gap-1.5 pl-10"
          style={{
            gridTemplateColumns:
              `repeat(${calendar.weeks.length}, 16px)`,
          }}
        >
          {calendar.monthLabels.map(
            (
              month,
              index
            ) => (
              <div
                key={
                  `${month.label}-${index}`
                }
                className="text-[11px] font-semibold uppercase tracking-wider text-lifeos-muted"
                style={{
                  gridColumnStart:
                    month.weekIndex +
                    1,

                  gridColumnEnd:
                    `span 4`,
                }}
              >
                {
                  month.label
                }
              </div>
            )
          )}
        </div>

        {/* ==================================
            Weekday Labels + Cells
        ================================== */}

        <div className="flex gap-2">

          <div className="grid grid-rows-7 gap-1.5">

            {WEEKDAY_LABELS.map(
              (
                label,
                index
              ) => (
                <div
                  key={
                    label
                  }
                  className="flex h-4 w-8 items-center text-[11px] font-semibold uppercase text-lifeos-muted"
                >
                  {(
                    index === 0 ||
                    index === 2 ||
                    index === 4
                  )
                    ? label
                    : ""}
                </div>
              )
            )}

          </div>

          <div
            className="grid grid-flow-col grid-rows-7 gap-1.5"
          >
            {calendar.weeks.map(
              (
                week,
                weekIndex
              ) =>
                week.map(
                  (
                    point,
                    dayIndex
                  ) =>
                    point ? (
                      <ActivityCell
                        key={
                          point.date
                        }
                        point={
                          point
                        }
                        compact
                      />
                    ) : (
                      <div
                        key={
                          `empty-${weekIndex}-${dayIndex}`
                        }
                        className="h-4 w-4 rounded-[4px] border border-transparent"
                      />
                    )
                )
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export default function AnalyticsHeatmap({
  data,

  mode,
}: AnalyticsHeatmapProps) {
  const normalizedData =
    useMemo(
      () =>
        [...data]
          .sort(
            (
              a,
              b
            ) =>
              a.date.localeCompare(
                b.date
              )
          )
          .map(
            (point) => ({
              ...point,

              dateObject:
                parseLocalDate(
                  point.date
                ),

              intensity:
                getIntensity(
                  point.completedTasks,
                  point.xpEarned
                ),
            })
          ),
      [
        data,
      ]
    );

  const activeDays =
    normalizedData.filter(
      (point) =>
        point.intensity >
        0
    ).length;

  const strongDays =
    normalizedData.filter(
      (point) =>
        point.intensity >=
        3
    ).length;

  const strongestDay =
    useMemo(() => {
      if (
        normalizedData.length ===
        0
      ) {
        return undefined;
      }

      return normalizedData.reduce(
        (
          strongest,
          point
        ) =>
          point.intensity >
          strongest.intensity
            ? point
            : strongest
      );
    }, [
      normalizedData,
    ]);

  return (
    <div className="space-y-5">

      {/* ======================================
          Summary
      ====================================== */}

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">

        <div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Active Days
          </p>

          <p className="mt-1 text-2xl font-bold text-lifeos-text">
            {
              activeDays
            }
          </p>

        </div>

        <div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
            Strong Days
          </p>

          <p className="mt-1 text-2xl font-bold text-lifeos-accent">
            {
              strongDays
            }
          </p>

        </div>

        {strongestDay && (
          <div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
              Strongest Day
            </p>

            <p className="mt-1 text-sm font-semibold text-lifeos-text-secondary">
              {
                formatTooltipDate(
                  strongestDay.date
                )
              }
            </p>

          </div>
        )}

        {/* ==================================
            Legend
        ================================== */}

        <div className="ml-auto flex items-center gap-2 text-[11px] text-lifeos-muted">

          <span>
            Less
          </span>

          {[0, 1, 2, 3, 4].map(
            (level) => (
              <span
                key={
                  level
                }
                className={`
                  h-3
                  w-3
                  rounded-[3px]
                  border

                  ${getIntensityClass(
                    level
                  )}
                `}
              />
            )
          )}

          <span>
            More
          </span>

        </div>

      </div>

      {/* ======================================
          Calendar
      ====================================== */}

      <div
        className="
          rounded-xl
          border
          border-lifeos-border
          bg-lifeos-app/50
          p-4
        "
      >
        {mode ===
        "month" ? (
          <MonthHeatmap
            data={
              normalizedData
            }
          />
        ) : (
          <YearHeatmap
            data={
              normalizedData
            }
          />
        )}
      </div>

      {/* ======================================
          Explanation
      ====================================== */}

      <p className="text-xs leading-5 text-lifeos-muted">
        Stronger cells represent days with more execution activity.
        Hover any cell to see the exact date, completed tasks, and XP earned.
      </p>

    </div>
  );
}