import {
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendarAlt,
  FaChartLine,
} from "react-icons/fa";

// ==========================================
// Types
// ==========================================

export type AnalyticsPeriod =
  | "today"
  | "week"
  | "month"
  | "year";

interface AnalyticsPeriodSwitcherProps {
  value: AnalyticsPeriod;

  onChange: (
    period: AnalyticsPeriod
  ) => void;
}

// ==========================================
// Periods
// ==========================================

const periods: {
  id: AnalyticsPeriod;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "today",
    label: "Today",
    shortLabel: "Today",
    icon: <FaCalendarDay />,
  },
  {
    id: "week",
    label: "Week",
    shortLabel: "Week",
    icon: <FaCalendarWeek />,
  },
  {
    id: "month",
    label: "Month",
    shortLabel: "Month",
    icon: <FaCalendarAlt />,
  },
  {
    id: "year",
    label: "Year",
    shortLabel: "Year",
    icon: <FaChartLine />,
  },
];

// ==========================================
// Component
// ==========================================

export default function AnalyticsPeriodSwitcher({
  value,

  onChange,
}: AnalyticsPeriodSwitcherProps) {
  return (
    <div
      className="
        inline-flex
        w-full
        max-w-xl
        rounded-xl
        border
        border-lifeos-border
        bg-lifeos-app/70
        p-1
      "
    >
      {periods.map(
        (period) => {
          const active =
            value ===
            period.id;

          return (
            <button
              key={
                period.id
              }
              type="button"
              onClick={() =>
                onChange(
                  period.id
                )
              }
              className={`
                flex
                min-w-0
                flex-1
                items-center
                justify-center
                gap-2
                rounded-lg
                px-3
                py-2.5
                text-sm
                font-semibold
                transition

                ${
                  active
                    ? "bg-lifeos-accent/15 text-lifeos-accent shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]"
                    : "text-lifeos-muted hover:bg-lifeos-surface hover:text-lifeos-text-secondary"
                }
              `}
              aria-pressed={
                active
              }
            >
              <span
                className={`
                  text-xs

                  ${
                    active
                      ? "text-lifeos-accent"
                      : "text-lifeos-muted"
                  }
                `}
              >
                {
                  period.icon
                }
              </span>

              <span className="hidden sm:inline">
                {
                  period.label
                }
              </span>

              <span className="sm:hidden">
                {
                  period.shortLabel
                }
              </span>
            </button>
          );
        }
      )}
    </div>
  );
}