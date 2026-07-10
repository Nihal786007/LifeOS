import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const data = [
  { day: "Mon", value: 40 },
  { day: "Tue", value: 60 },
  { day: "Wed", value: 55 },
  { day: "Thu", value: 80 },
  { day: "Fri", value: 90 },
  { day: "Sat", value: 70 },
  { day: "Sun", value: 95 },
];

export default function ProductivityChart() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-2xl font-bold mb-6">
        📈 Weekly Productivity
      </h2>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#1e293b" />
            <XAxis dataKey="day" stroke="#94a3b8" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={4}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}