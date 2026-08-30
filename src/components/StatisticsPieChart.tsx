import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

// ==========================================
// Types
// ==========================================

interface StatisticsPieChartProps {
  completedTasks: number;

  pendingTasks: number;
}

// ==========================================
// Component
// ==========================================

export default function StatisticsPieChart({
  completedTasks,

  pendingTasks,
}: StatisticsPieChartProps) {
  const data = [
    {
      name:
        "Completed",

      value:
        completedTasks,
    },
    {
      name:
        "Pending",

      value:
        pendingTasks,
    },
  ];

  const colors = [
    "#22c55e",
    "#f59e0b",
  ];

  return (
    <div className="h-[320px]">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <PieChart>

          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={72}
            outerRadius={108}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map(
              (
                entry,
                index
              ) => (
                <Cell
                  key={
                    entry.name
                  }
                  fill={
                    colors[
                      index %
                        colors.length
                    ]
                  }
                />
              )
            )}
          </Pie>

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
          />

          <Legend />

        </PieChart>
      </ResponsiveContainer>

    </div>
  );
}