// ==========================================
// LifeOS Timeline Engine
// Version: 1.0
// ==========================================
//
// Timeline is a read model over the canonical
// execution history.
//
// Responsibilities:
// - Convert ExecutionRecord[] into TimelineEntry[]
// - Group events by local calendar date
// - Classify event categories
// - Provide period/category filtering
// - Preserve execution-history ordering
//
// IMPORTANT:
// - No localStorage
// - No React
// - No duplicated history state
// - No mutation ownership
// - ExecutionHistoryService remains the source
//   of historical execution truth
// ==========================================

import type {
  ExecutionRecord,
  ExecutionType,
} from "../shared/execution";

// ==========================================
// Public Types
// ==========================================

export type TimelineCategory =
  | "task"
  | "planning"
  | "habit"
  | "xp"
  | "achievement"
  | "system";

export interface TimelineEntry {
  id: number;

  executionType:
    ExecutionType;

  category:
    TimelineCategory;

  entityId:
    number;

  title:
    string;

  description?:
    string;

  createdAt:
    string;

  localDate:
    string;

  localTime:
    string;

  xpAwarded:
    number;

  icon?:
    string;

  color?:
    string;

  metadata?:
    Record<
      string,
      unknown
    >;
}

export interface TimelineDayGroup {
  date:
    string;

  entries:
    TimelineEntry[];
}

export interface TimelineSummary {
  totalEvents:
    number;

  taskEvents:
    number;

  planningEvents:
    number;

  habitEvents:
    number;

  xpEvents:
    number;

  achievementEvents:
    number;

  systemEvents:
    number;
}

// ==========================================
// Internal Date Helpers
// ==========================================

function pad(
  value: number
): string {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
}

function toLocalDate(
  isoTimestamp: string
): string {
  const date =
    new Date(
      isoTimestamp
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(
    date.getDate()
  )}`;
}

function toLocalTime(
  isoTimestamp: string
): string {
  const date =
    new Date(
      isoTimestamp
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  );
}

// ==========================================
// Classification
// ==========================================

function getCategory(
  type: ExecutionType
): TimelineCategory {
  if (
    type ===
      "task_completed" ||
    type ===
      "task_uncompleted" ||
    type ===
      "task_deleted"
  ) {
    return "task";
  }

  if (
    type ===
      "weekly_completed" ||
    type ===
      "weekly_uncompleted" ||
    type ===
      "weekly_deleted" ||
    type ===
      "monthly_completed" ||
    type ===
      "monthly_uncompleted" ||
    type ===
      "monthly_deleted" ||
    type ===
      "life_goal_completed" ||
    type ===
      "life_goal_uncompleted" ||
    type ===
      "life_goal_deleted"
  ) {
    return "planning";
  }

  if (
    type ===
      "habit_completed" ||
    type ===
      "habit_uncompleted"
  ) {
    return "habit";
  }

  if (
    type ===
    "xp_earned"
  ) {
    return "xp";
  }

  if (
    type ===
    "achievement_unlocked"
  ) {
    return "achievement";
  }

  return "system";
}

// ==========================================
// Timeline Engine
// ==========================================

export class TimelineEngine {
  // ========================================
  // Projection
  // ========================================

  static createEntries(
    records:
      ExecutionRecord[]
  ): TimelineEntry[] {
    return records
      .map(
        (
          record
        ): TimelineEntry => ({
          id:
            record.id,

          executionType:
            record.type,

          category:
            getCategory(
              record.type
            ),

          entityId:
            record.entityId,

          title:
            record.title,

          description:
            record.description,

          createdAt:
            record.createdAt,

          localDate:
            toLocalDate(
              record.createdAt
            ),

          localTime:
            toLocalTime(
              record.createdAt
            ),

          xpAwarded:
            record.xpAwarded,

          icon:
            record.icon,

          color:
            record.color,

          metadata:
            record.metadata,
        })
      )
      .filter(
        (
          entry
        ) =>
          entry.localDate !==
          ""
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
      );
  }

  // ========================================
  // Group By Day
  // ========================================

  static groupByDate(
    entries:
      TimelineEntry[]
  ): TimelineDayGroup[] {
    const groups =
      new Map<
        string,
        TimelineEntry[]
      >();

    for (
      const entry of
      entries
    ) {
      const existing =
        groups.get(
          entry.localDate
        );

      if (
        existing
      ) {
        existing.push(
          entry
        );

        continue;
      }

      groups.set(
        entry.localDate,
        [
          entry,
        ]
      );
    }

    return Array.from(
      groups.entries()
    )
      .map(
        ([
          date,
          groupEntries,
        ]): TimelineDayGroup => ({
          date,

          entries:
            [...groupEntries].sort(
              (
                a,
                b
              ) =>
                new Date(
                  b.createdAt
                ).getTime() -
                new Date(
                  a.createdAt
                ).getTime()
            ),
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.date.localeCompare(
            a.date
          )
      );
  }

  // ========================================
  // Category Filter
  // ========================================

  static filterByCategory(
    entries:
      TimelineEntry[],
    category:
      TimelineCategory
  ): TimelineEntry[] {
    return entries.filter(
      (
        entry
      ) =>
        entry.category ===
        category
    );
  }

  // ========================================
  // Date Range
  // ========================================

  static filterByDateRange(
    entries:
      TimelineEntry[],
    startDate:
      string,
    endDate:
      string
  ): TimelineEntry[] {
    if (
      startDate >
      endDate
    ) {
      return [];
    }

    return entries.filter(
      (
        entry
      ) =>
        entry.localDate >=
          startDate &&
        entry.localDate <=
          endDate
    );
  }

  // ========================================
  // Exact Date
  // ========================================

  static getByDate(
    entries:
      TimelineEntry[],
    date:
      string
  ): TimelineEntry[] {
    return entries.filter(
      (
        entry
      ) =>
        entry.localDate ===
        date
    );
  }

  // ========================================
  // Summary
  // ========================================

  static getSummary(
    entries:
      TimelineEntry[]
  ): TimelineSummary {
    const summary: TimelineSummary =
      {
        totalEvents:
          entries.length,

        taskEvents:
          0,

        planningEvents:
          0,

        habitEvents:
          0,

        xpEvents:
          0,

        achievementEvents:
          0,

        systemEvents:
          0,
      };

    for (
      const entry of
      entries
    ) {
      if (
        entry.category ===
        "task"
      ) {
        summary.taskEvents +=
          1;

        continue;
      }

      if (
        entry.category ===
        "planning"
      ) {
        summary.planningEvents +=
          1;

        continue;
      }

      if (
        entry.category ===
        "habit"
      ) {
        summary.habitEvents +=
          1;

        continue;
      }

      if (
        entry.category ===
        "xp"
      ) {
        summary.xpEvents +=
          1;

        continue;
      }

      if (
        entry.category ===
        "achievement"
      ) {
        summary.achievementEvents +=
          1;

        continue;
      }

      summary.systemEvents +=
        1;
    }

    return summary;
  }
}