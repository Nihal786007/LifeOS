// ==========================================
// LifeOS Goal Calendar Weeks
// Version: 1.2
// ==========================================

export interface GoalCalendarWeek {
  weekStartDate: string;
  weekEndDate: string;

  displayLabel: string;

  intersectsMonth: boolean;

  startsInPreviousMonth: boolean;
  endsInNextMonth: boolean;

  isCurrentWeek: boolean;
}

export interface GoalCalendarWeekOptions {
  /**
   * Optional active planning boundary.
   *
   * When provided, LifeOS only returns real
   * calendar weeks that overlap this range.
   *
   * Supports:
   * YYYY-MM-DD
   * ISO date-time strings
   */
  activeStartDate?: string;

  activeEndDate?: string;
}

/**
 * Reusable real calendar week identity.
 *
 * This is used outside the Goal Planner as the
 * canonical LifeOS Monday → Sunday week range.
 */
export interface CalendarWeekRange {
  weekStartDate: string;
  weekEndDate: string;

  displayLabel: string;
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

function toLocalDateString(
  date: Date
) {
  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1
  )}-${pad2(
    date.getDate()
  )}`;
}

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
      Number.isNaN(
        date.getTime()
      )
    ) {
      return undefined;
    }

    return date;
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

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
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

function addDays(
  date: Date,
  days: number
) {
  const next =
    new Date(date);

  next.setDate(
    next.getDate() +
      days
  );

  return startOfDay(
    next
  );
}

function startOfWeekMonday(
  date: Date
) {
  const normalized =
    startOfDay(
      date
    );

  const day =
    normalized.getDay();

  const distanceFromMonday =
    day === 0
      ? 6
      : day - 1;

  return addDays(
    normalized,
    -distanceFromMonday
  );
}

function endOfWeekSunday(
  date: Date
) {
  return addDays(
    startOfWeekMonday(
      date
    ),
    6
  );
}

function formatShortDate(
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

function isDateInsideRange(
  date: Date,
  start: Date,
  end: Date
) {
  const value =
    startOfDay(
      date
    ).getTime();

  return (
    value >=
      startOfDay(
        start
      ).getTime() &&
    value <=
      startOfDay(
        end
      ).getTime()
  );
}

function rangesOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date
) {
  return (
    firstStart.getTime() <=
      secondEnd.getTime() &&
    firstEnd.getTime() >=
      secondStart.getTime()
  );
}

// ==========================================
// Canonical Week Resolver
// ==========================================

/**
 * Returns the real Monday → Sunday calendar week
 * containing the supplied local date.
 *
 * Example:
 *
 * 2026-09-10
 * →
 * Sep 7 – Sep 13
 *
 * This is the canonical LifeOS week resolver and
 * should be reused anywhere a date must be mapped
 * to a real calendar week.
 */
export function getCalendarWeekForDate(
  value: string
): CalendarWeekRange | undefined {
  const date =
    parseDate(
      value
    );

  if (!date) {
    return undefined;
  }

  const weekStart =
    startOfWeekMonday(
      date
    );

  const weekEnd =
    endOfWeekSunday(
      date
    );

  return {
    weekStartDate:
      toLocalDateString(
        weekStart
      ),

    weekEndDate:
      toLocalDateString(
        weekEnd
      ),

    displayLabel:
      `${formatShortDate(
        weekStart
      )} – ${formatShortDate(
        weekEnd
      )}`,
  };
}

// ==========================================
// Calendar Week Generator
// ==========================================

export function getCalendarWeeksForMonth(
  month: number,
  year: number,
  options: GoalCalendarWeekOptions = {}
): GoalCalendarWeek[] {
  const monthStart =
    new Date(
      year,
      month - 1,
      1
    );

  const monthEnd =
    new Date(
      year,
      month,
      0
    );

  const firstWeekStart =
    startOfWeekMonday(
      monthStart
    );

  const lastWeekEnd =
    endOfWeekSunday(
      monthEnd
    );

  const activeStart =
    parseDate(
      options.activeStartDate
    );

  const activeEnd =
    parseDate(
      options.activeEndDate
    );

  const today =
    startOfDay(
      new Date()
    );

  const weeks:
    GoalCalendarWeek[] = [];

  let cursor =
    firstWeekStart;

  while (
    cursor.getTime() <=
    lastWeekEnd.getTime()
  ) {
    const weekStart =
      startOfDay(
        cursor
      );

    const weekEnd =
      addDays(
        weekStart,
        6
      );

    const intersectsMonth =
      rangesOverlap(
        weekStart,
        weekEnd,
        monthStart,
        monthEnd
      );

    // ========================================
    // Goal Active-Range Filtering
    // ========================================

    const overlapsStartBoundary =
      !activeStart ||
      weekEnd.getTime() >=
        activeStart.getTime();

    const overlapsEndBoundary =
      !activeEnd ||
      weekStart.getTime() <=
        activeEnd.getTime();

    const intersectsActiveRange =
      overlapsStartBoundary &&
      overlapsEndBoundary;

    if (
      intersectsMonth &&
      intersectsActiveRange
    ) {
      const startsInPreviousMonth =
        weekStart.getMonth() !==
          monthStart.getMonth() ||
        weekStart.getFullYear() !==
          monthStart.getFullYear();

      const endsInNextMonth =
        weekEnd.getMonth() !==
          monthStart.getMonth() ||
        weekEnd.getFullYear() !==
          monthStart.getFullYear();

      weeks.push({
        weekStartDate:
          toLocalDateString(
            weekStart
          ),

        weekEndDate:
          toLocalDateString(
            weekEnd
          ),

        displayLabel:
          `${formatShortDate(
            weekStart
          )} – ${formatShortDate(
            weekEnd
          )}`,

        intersectsMonth,

        startsInPreviousMonth,

        endsInNextMonth,

        isCurrentWeek:
          isDateInsideRange(
            today,
            weekStart,
            weekEnd
          ),
      });
    }

    cursor =
      addDays(
        cursor,
        7
      );
  }

  return weeks;
}