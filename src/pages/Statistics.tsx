import ProgressRing from "../components/ProgressRing";
import WeeklyProductivityChart from "../components/WeeklyProductivityChart";
import StatisticsPieChart from "../components/StatisticsPieChart";
import { useApp } from "../context/AppContext";

function Statistics() {
  const { tasks, completedTasks } = useApp();

  const totalTasks = tasks.length;
  const pendingTasks = totalTasks - completedTasks;

  const completionRate =
    totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold">📊 Statistics</h1>
        <p className="mt-2 text-slate-400">
          Track your productivity.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-900 p-6">
          <p className="text-slate-400">Total Tasks</p>
          <h2 className="mt-2 text-4xl font-bold">
            {totalTasks}
          </h2>
        </div>

        <div className="rounded-2xl bg-slate-900 p-6">
          <p className="text-slate-400">Completed</p>
          <h2 className="mt-2 text-4xl font-bold text-green-400">
            {completedTasks}
          </h2>
        </div>

        <div className="rounded-2xl bg-slate-900 p-6">
          <p className="text-slate-400">Pending</p>
          <h2 className="mt-2 text-4xl font-bold text-yellow-400">
            {pendingTasks}
          </h2>
        </div>

        <div className="rounded-2xl bg-slate-900 p-6">
          <p className="text-slate-400">Completion</p>
          <h2 className="mt-2 text-4xl font-bold text-blue-400">
            {completionRate}%
          </h2>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-2xl bg-slate-900 p-6">
        <h2 className="mb-4 text-2xl font-bold">
          🚀 Productivity Progress
        </h2>

        <div className="h-5 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        <p className="mt-4 text-slate-400">
          You've completed <strong>{completedTasks}</strong> out of{" "}
          <strong>{totalTasks}</strong> tasks.
        </p>
      </div>

      {/* Progress Ring + Summary */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ProgressRing percentage={completionRate} />

        <div className="rounded-2xl bg-slate-900 p-6 flex flex-col justify-center">
          <h2 className="text-2xl font-bold mb-4">
            📈 Productivity Summary
          </h2>

          <p className="text-slate-300">
            ✔️ Total Tasks: <strong>{totalTasks}</strong>
          </p>

          <p className="text-green-400 mt-2">
            ✅ Completed: <strong>{completedTasks}</strong>
          </p>

          <p className="text-yellow-400 mt-2">
            ⏳ Pending: <strong>{pendingTasks}</strong>
          </p>

          <p className="text-blue-400 mt-2">
            🚀 Productivity: <strong>{completionRate}%</strong>
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <StatisticsPieChart />
        <WeeklyProductivityChart />
      </div>
    </div>
  );
}

export default Statistics;