import {
  useEffect,
  useMemo,
  useState,
} from "react";

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

import {
  AnalyticsEngine,
} from "../engines/AnalyticsEngine";

import type {
  ExecutionRecord,
} from "../shared/execution";

import Card from "../components/ui/Card";
import PageHero from "../components/ui/PageHero";
import StatCard from "../components/ui/StatCard";

// ==========================================
// Page
// ==========================================

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
  // Canonical Analytics
  // ==========================================

  const analytics =
    useMemo(
      () =>
        AnalyticsEngine.analyze({
          tasks,

          executionRecords,
        }),
      [
        tasks,
        executionRecords,
      ]
    );

  const {
    overall,
    today,
    week,
  } = analytics;

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="space-y-10">

      {/* ======================================
          Hero
      ====================================== */}

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
            {
              overall.completionRate
            }%
          </h2>

          <p className="mt-3 text-slate-400">
            Overall Productivity
          </p>

        </Card>
      </PageHero>

      {/* ======================================
          Overall Statistics
      ====================================== */}

      <div className="grid gap-6 md:grid-cols-3">

        <StatCard
          icon={
            <FaClipboardList />
          }
          title="Total Tasks"
          value={
            overall.totalTasks
          }
        />

        <StatCard
          icon={
            <FaCheckCircle />
          }
          title="Completed"
          value={
            overall.completedTasks
          }
          color="text-green-400"
        />

        <StatCard
          icon={
            <FaClock />
          }
          title="Pending"
          value={
            overall.pendingTasks
          }
          color="text-yellow-400"
        />

      </div>

      {/* ======================================
          Overall Progress
      ====================================== */}

      <div className="grid gap-6 xl:grid-cols-2">

        <Card>

          <h2 className="mb-6 text-2xl font-bold">
            Productivity Progress
          </h2>

          <div className="h-5 overflow-hidden rounded-full bg-slate-800">

            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-700"
              style={{
                width:
                  `${overall.completionRate}%`,
              }}
            />

          </div>

          <p className="mt-6 leading-7 text-slate-400">

            You've completed{" "}

            <strong>
              {
                overall.completedTasks
              }
            </strong>{" "}

            out of{" "}

            <strong>
              {
                overall.totalTasks
              }
            </strong>{" "}

            tasks.

            {overall.completionRate >=
              80 && (
              <>
                {" "}
                Outstanding productivity.
              </>
            )}

            {overall.completionRate >=
              50 &&
              overall.completionRate <
                80 && (
                <>
                  {" "}
                  You're making solid
                  progress.
                </>
              )}

            {overall.completionRate <
              50 && (
              <>
                {" "}
                Focus on completing your
                highest-priority tasks.
              </>
            )}

          </p>

        </Card>

        <Card className="flex items-center justify-center">

          <ProgressRing
            value={
              overall.completionRate
            }
          />

        </Card>

      </div>

      {/* ======================================
          Charts
      ====================================== */}

      <div className="grid gap-6 xl:grid-cols-2">

        <Card>

          <h2 className="mb-6 text-2xl font-bold">
            Task Distribution
          </h2>

          <StatisticsPieChart
            completedTasks={
              overall.completedTasks
            }
            pendingTasks={
              overall.pendingTasks
            }
          />

        </Card>

        <Card>

          <div className="mb-6">

            <h2 className="text-2xl font-bold">
              Weekly Productivity
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {
                week.weekStartDate
              }{" "}
              →{" "}
              {
                week.weekEndDate
              }
            </p>

          </div>

          <WeeklyProductivityChart
            data={
              week.trend
            }
          />

        </Card>

      </div>

      {/* ======================================
          ATLAS Summary
      ====================================== */}

      <AtlasReport
        completionRate={
          overall.completionRate
        }
        pendingTasks={
          overall.pendingTasks
        }
      />

      {/* ======================================
          Daily Review
      ====================================== */}

      <DailyReview
        completedTasks={
          today.completedTasks
        }
        pendingTasks={
          today.pendingTasks
        }
        xpEarned={
          today.xpEarned
        }
      />

      {/* ======================================
          Weekly Review
      ====================================== */}

      <WeeklyReview
        completedTasks={
          week.completedTasks
        }
        completionRate={
          week.completionRate
        }
        xpEarned={
          week.xpEarned
        }
      />

    </div>
  );
}