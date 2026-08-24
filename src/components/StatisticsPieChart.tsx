import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

import { useTasks } from "../context/TaskContext";

export default function StatisticsPieChart() {
  const {
    tasks,
  } = useTasks();

  const completedTasks =
    tasks.filter(
      (task) =>
        task.completed
    ).length;

  const remainingTasks =
    tasks.length -
    completedTasks;

  const data = [
    {
      name: "Completed",
      value: completedTasks,
    },
    {
      name: "Remaining",
      value: remainingTasks,
    },
  ];

  const COLORS = [
    "#22c55e",
    "#f97316",
  ];

  return (
    <div className="h-[380px] rounded-2xl bg-slate-900 p-6 shadow-lg">
      <h2 className="mb-6 text-xl font-bold">
        📊 Task Distribution
      </h2>

      <ResponsiveContainer
        width="100%"
        height="90%"
      >
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={110}
            dataKey="value"
            label
          >
            {data.map(
              (_, index) => (
                <Cell
                  key={index}
                  fill={
                    COLORS[
                      index %
                        COLORS.length
                    ]
                  }
                />
              )
            )}
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}