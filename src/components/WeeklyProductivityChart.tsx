import {
  LineChart,
  Line,
 CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useApp } from "../context/AppContext";

export default function WeeklyProductivityChart() {
  const { tasks } = useApp();

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const weeklyData = days.map((day) => ({
    day,
    tasks: 0,
  }));

  tasks.forEach((task) => {
    if (!task.completedAt) return;

    const date = new Date(task.completedAt);
    const dayIndex = date.getDay();

    weeklyData[dayIndex].tasks++;
  });

  return (
    <div className="bg-slate-900 rounded-2xl p-6 h-[380px]">
      <h2 className="text-2xl font-bold mb-6">
        📈 Weekly Productivity
      </h2>

      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={weeklyData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
          />

          <XAxis
            dataKey="day"
            stroke="#94a3b8"
          />

          <YAxis
            allowDecimals={false}
            stroke="#94a3b8"
          />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="tasks"
            stroke="#3b82f6"
            strokeWidth={4}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}