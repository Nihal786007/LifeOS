import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useApp } from "../context/AppContext";

export default function StatisticsPieChart() {
  const { tasks, completedTasks } = useApp();

  const remainingTasks = tasks.length - completedTasks;

  const data = [
    { name: "Completed", value: completedTasks },
    { name: "Remaining", value: remainingTasks },
  ];

  const COLORS = ["#22c55e", "#f97316"];

  return (
    <div className="bg-slate-900 rounded-2xl p-6 shadow-lg h-[380px]">
      <h2 className="text-xl font-bold mb-6">
        📊 Task Distribution
      </h2>

      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={110}
            dataKey="value"
            label
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}