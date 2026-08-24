import {
  useEffect,
  useState,
} from "react";

import {
  getTaskAnalytics,
  getTodayAnalytics,
  getWeeklyAnalytics,
} from "../analytics/taskAnalytics";

import WeeklyReview from "../components/statistics/WeeklyReview";
import DailyReview from "../components/statistics/DailyReview";

import {
  FaCheckCircle,
  FaClipboardList,
  FaClock,
} from "react-icons/fa";

import ProgressRing from "../components/dashboard/ProgressRing";
import WeeklyProductivityChart from "../components/WeeklyProductivityChart";
import StatisticsPieChart from "../components/StatisticsPieChart";
import AtlasReport from "../components/statistics/AtlasReport";

import {
  useTasks,
} from "../context/TaskContext";

import {
  ExecutionHistoryService,
} from "../services/ExecutionHistoryService";

import type {
  ExecutionRecord,
} from "../shared/execution";

import Card from "../components/ui/Card";
import PageHero from "../components/ui/PageHero";
import StatCard from "../components/ui/StatCard";

export default function Statistics() {
  // ==========================================
  // Universal Tasks
  // ==========================================

  const {
    tasks,
  } = useTasks();

  // ==========================================
  // Execution History
  // ==========================================

  const [
    executionRecords,
    setExecutionRecords,
  ] = useState<ExecutionRecord[]>(
    () =>
      ExecutionHistoryService.getAll()
  );

  useEffect(() => {
    function refreshHistory() {
      setExecutionRecords(
        ExecutionHistoryService.getAll()
      );
    }

    refreshHistory();

    const unsubscribe =
      ExecutionHistoryService.subscribe(
        refreshHistory
      );

    return unsubscribe;
  }, []);

  // ==========================================
  // Analytics
  // ==========================================

  const {
    totalTasks,
    completedTasks,
    pendingTasks,
    completionRate,
  } = getTaskAnalytics(
    tasks,
    executionRecords
  );

  const today =
    getTodayAnalytics(
      tasks,
      executionRecords
    );

  const week =
    getWeeklyAnalytics(
      tasks,
      executionRecords
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

      {/* Statistics */}

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          icon={
            <FaClipboardList />
          }
          title="Total Tasks"
          value={totalTasks}
        />

        <StatCard
          icon={
            <FaCheckCircle />
          }
          title="Completed"
          value={
            completedTasks
          }
          color="text-green-400"
        />

        <StatCard
          icon={
            <FaClock />
          }
          title="Pending"
          value={
            pendingTasks
          }
          color="text-yellow-400"
        />
      </div>

      {/* Progress */}

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

          <p className="mt-6 leading-7 text-slate-400">
            You've completed{" "}
            <strong>
              {completedTasks}
            </strong>{" "}
            out of{" "}
            <strong>
              {totalTasks}
            </strong>{" "}
            tasks.

            {completionRate >=
              80 && (
              <>
                {" "}
                Outstanding
                productivity
                today.
              </>
            )}

            {completionRate >=
              50 &&
              completionRate <
                80 && (
                <>
                  {" "}
                  You're
                  making solid
                  progress.
                </>
              )}

            {completionRate <
              50 && (
              <>
                {" "}
                ATLAS
                recommends
                completing a
                few more
                missions.
              </>
            )}
          </p>
        </Card>

        <Card className="flex items-center justify-center">
          <ProgressRing
            value={
              completionRate
            }
          />
        </Card>
      </div>

      {/* Charts */}

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

      {/* ATLAS */}

      <AtlasReport
        completionRate={
          completionRate
        }
        pendingTasks={
          pendingTasks
        }
      />

      <DailyReview
        completedTasks={
          today.completedTasks
        }
        pendingTasks={
          pendingTasks
        }
        xpEarned={
          today.xpEarned
        }
      />

      <WeeklyReview
        completedTasks={
          week.completedTasks
        }
        completionRate={
          completionRate
        }
        xpEarned={
          week.xpEarned
        }
      />
    </div>
  );
}