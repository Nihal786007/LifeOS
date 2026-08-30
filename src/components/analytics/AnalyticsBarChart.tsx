import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ==========================================
// Types
// ==========================================

interface AnalyticsBarPoint {
  label: string;

  completedTasks: number;

  completionRate: number;

  xpEarned: number;
}

interface AnalyticsBarChartProps {
  data: AnalyticsBarPoint[];

  metric?: "tasks" | "completion" | "xp";
}

// ==========================================
// Component
// ==========================================

export default function AnalyticsBarChart({
  data,

  metric = "tasks",
}: AnalyticsBarChartProps) {
  const dataKey =
    metric === "xp"
      ? "xpEarned"
      : metric === "completion"
        ? "completionRate"
        : "completedTasks";

  const tooltipLabel =
    metric === "xp"
      ? "XP Earned"
      : metric === "completion"
        ? "Completion Rate"
        : "Completed Tasks";

  const isPercentage =
    metric === "completion";

  return (
    <div className="h-[340px] w-full">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <BarChart
          data={data}
          margin={{
            top: 12,
            right: 16,
            bottom: 0,
            left: -10,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e293b"
            vertical={false}
          />

          <XAxis
            dataKey="label"
            stroke="#64748b"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />

          <YAxis
            allowDecimals={false}
            domain={
              isPercentage
                ? [0, 100]
                : undefined
            }
            stroke="#64748b"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />

          <Tooltip
            contentStyle={{
              backgroundColor:
                "#020617",

              border:
                "1px solid #334155",

              borderRadius:
                "12px",

              boxShadow:
                "0 10px 30px rgba(0,0,0,0.35)",
            }}
            labelStyle={{
              color:
                "#cbd5e1",

              marginBottom:
                "4px",
            }}
            itemStyle={{
              color:
                "#e2e8f0",
            }}
            formatter={(
              value
            ) => [
              isPercentage
                ? `${value}%`
                : value,

              tooltipLabel,
            ]}
          />

          <Bar
            dataKey={
              dataKey
            }
            fill={
              metric === "xp"
                ? "#facc15"
                : metric === "completion"
                  ? "#22c55e"
                  : "#22d3ee"
            }
            radius={[
              6,
              6,
              0,
              0,
            ]}
            maxBarSize={
              52
            }
          />

        </BarChart>
      </ResponsiveContainer>

    </div>
  );
}