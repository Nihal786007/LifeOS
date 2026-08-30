import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsTrendPoint {
  label: string;

  completedTasks: number;

  xpEarned: number;
}

interface AnalyticsTrendChartProps {
  data: AnalyticsTrendPoint[];

  metric?: "tasks" | "xp";
}

export default function AnalyticsTrendChart({
  data,

  metric = "tasks",
}: AnalyticsTrendChartProps) {
  const isXP =
    metric === "xp";

  const dataKey =
    isXP
      ? "xpEarned"
      : "completedTasks";

  const tooltipLabel =
    isXP
      ? "XP Earned"
      : "Completed Tasks";

  return (
    <div className="h-[340px] w-full">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
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
              value,

              tooltipLabel,
            ]}
          />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={
              isXP
                ? "#facc15"
                : "#22d3ee"
            }
            strokeWidth={3}
            dot={{
              r: 4,

              fill:
                isXP
                  ? "#facc15"
                  : "#22d3ee",
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