import {
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
} from "react-icons/fa";

import ProgressRing from "../components/dashboard/ProgressRing";
import WeeklyProductivityChart from "../components/WeeklyProductivityChart";
import StatisticsPieChart from "../components/StatisticsPieChart";

import { useApp } from "../context/AppContext";

import Card from "../components/ui/Card";
import PageHero from "../components/ui/PageHero";
import StatCard from "../components/ui/StatCard";

function Statistics() {
  const { tasks, completedTasks } = useApp();

  const totalTasks = tasks.length;
  const pendingTasks = totalTasks - completedTasks;

  const completionRate =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks / totalTasks) * 100
        );

  return (
    <div className="space-y-10">

      <PageHero
        badge="Mission Analytics"
        title="Statistics"
        description="Monitor your productivity, analyze your performance, and let ATLAS reveal how your mission is progressing."
      >

        <Card className="border-cyan-500/20 bg-cyan-500/5">

          <p className="text-sm uppercase tracking-widest text-cyan-300">
            Completion Rate
          </p>

          <h2 className="mt-3 text-5xl font-black">
            {completionRate}%
          </h2>

          <p className="mt-3 text-slate-400">
            Overall Productivity
          </p>

        </Card>

      </PageHero>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        <StatCard
          icon={<FaClipboardList />}
          title="Total Tasks"
          value={totalTasks}
        />

        <StatCard
          icon={<FaCheckCircle />}
          title="Completed"
          value={completedTasks}
          color="text-green-400"
        />

        <StatCard
          icon={<FaClock />}
          title="Pending"
          value={pendingTasks}
          color="text-yellow-400"
        />

        <StatCard
          icon={<FaChartLine />}
          title="Completion"
          value={`${completionRate}%`}
          color="text-cyan-400"
        />

      </div>
            <div className="grid gap-6 xl:grid-cols-2">

        <Card>

          <h2 className="mb-6 text-2xl font-bold">
            🚀 Productivity Progress
          </h2>

          <div className="h-5 overflow-hidden rounded-full bg-slate-800">

            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-700"
              style={{
                width: `${completionRate}%`,
              }}
            />

          </div>

          <p className="mt-6 text-slate-400 leading-7">
            You've completed{" "}
            <strong>{completedTasks}</strong> out of{" "}
            <strong>{totalTasks}</strong> tasks.

            {completionRate >= 80 && (
              <>
                {" "}
                Outstanding productivity today.
              </>
            )}

            {completionRate >= 50 &&
              completionRate < 80 && (
                <>
                  {" "}
                  You're making solid progress.
                </>
              )}

            {completionRate < 50 && (
              <>
                {" "}
                ATLAS recommends completing a few more missions.
              </>
            )}

          </p>

        </Card>

        <Card className="flex items-center justify-center">

          <ProgressRing
  value={completionRate}
/>

        </Card>

      </div>

      <div className="grid gap-6 xl:grid-cols-2">

        <Card>

          <h2 className="mb-6 text-2xl font-bold">
            📈 Productivity Summary
          </h2>

          <div className="space-y-4 text-lg">

            <div className="flex justify-between">
              <span>Total Tasks</span>
              <strong>{totalTasks}</strong>
            </div>

            <div className="flex justify-between text-green-400">
              <span>Completed</span>
              <strong>{completedTasks}</strong>
            </div>

            <div className="flex justify-between text-yellow-400">
              <span>Pending</span>
              <strong>{pendingTasks}</strong>
            </div>

            <div className="flex justify-between text-cyan-400">
              <span>Completion</span>
              <strong>{completionRate}%</strong>
            </div>

          </div>

        </Card>

        <Card>

          <h2 className="mb-6 text-2xl font-bold">
            🤖 ATLAS Insight
          </h2>

          <p className="leading-8 text-slate-400">

            {completionRate >= 80 &&
              "Excellent consistency detected. Keep this momentum to maximize long-term productivity."}

            {completionRate >= 50 &&
              completionRate < 80 &&
              "You're progressing well. Completing a few remaining tasks today will significantly improve your efficiency."}

            {completionRate < 50 &&
              "Current productivity is below your potential. Completing your highest-priority tasks will quickly improve today's performance."}

          </p>

        </Card>

      </div>
            <div className="grid gap-6 xl:grid-cols-2">

        <Card>

          <h2 className="mb-6 text-2xl font-bold">
            🥧 Task Distribution
          </h2>

          <StatisticsPieChart />

        </Card>

        <Card>

          <h2 className="mb-6 text-2xl font-bold">
            📅 Weekly Productivity
          </h2>

          <WeeklyProductivityChart />

        </Card>

      </div>

    </div>
  );
}

export default Statistics;