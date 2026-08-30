import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type {
  DailyCompletionTrendPoint,
} from "../engines/AnalyticsEngine";

// ==========================================
// Types
// ==========================================

interface WeeklyProductivityChartProps {
  data: DailyCompletionTrendPoint[];
}

// ==========================================
// Component
// ==========================================

export default function WeeklyProductivityChart({
  data,
}: WeeklyProductivityChartProps) {
  return (
    <div className="h-[320px]">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={data}
          margin={{
            top: 8,
            right: 12,
            bottom: 0,
            left: -12,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            vertical={false}
          />

          <XAxis
            dataKey="label"
            stroke="#94a3b8"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />

          <YAxis
            allowDecimals={false}
            stroke="#94a3b8"
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
            }}
            labelStyle={{
              color:
                "#cbd5e1",
            }}
            formatter={(
              value
            ) => [
              value,
              "Completed",
            ]}
          />

          <Line
            type="monotone"
            dataKey="completedTasks"
            stroke="#22d3ee"
            strokeWidth={3}
            dot={{
              r: 4,
              fill:
                "#22d3ee",
            }}
            activeDot={{
              r: 6,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}