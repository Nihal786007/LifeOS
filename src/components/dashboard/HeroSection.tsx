import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  AtlasResult,
} from "../../atlas/types";

import {
  useTasks,
} from "../../context/TaskContext";

interface HeroSectionProps {
  name: string;
  atlas: AtlasResult;
}

export default function HeroSection({
  name,
  atlas,
}: HeroSectionProps) {
  // ==========================================
  // Universal Tasks
  // ==========================================

  const {
    tasks,
  } = useTasks();

  // ==========================================
  // Live Time
  // ==========================================

  const [
    now,
    setNow,
  ] = useState(
    new Date()
  );

  useEffect(() => {
    const timer =
      setInterval(() => {
        setNow(
          new Date()
        );
      }, 1000);

    return () =>
      clearInterval(
        timer
      );
  }, []);

  const hour =
    now.getHours();

  // ==========================================
  // Mission Status
  // ==========================================

  const missionStatus =
    useMemo(() => {
      if (hour < 12) {
        return "MISSION READY";
      }

      if (hour < 18) {
        return "MISSION IN PROGRESS";
      }

      if (hour < 22) {
        return "MISSION REVIEW";
      }

      return "SYSTEM WIND DOWN";
    }, [hour]);

  // ==========================================
  // Dynamic Theme
  // ==========================================

  const heroTheme =
    useMemo(() => {
      if (hour < 12) {
        return {
          background:
            "from-lifeos-accent via-lifeos-app to-lifeos-surface",

          border:
            "border-lifeos-accent/30",
        };
      }

      if (hour < 18) {
        return {
          background:
            "from-lifeos-accent via-lifeos-app to-lifeos-surface",

          border:
            "border-lifeos-accent/30",
        };
      }

      if (hour < 22) {
        return {
          background:
            "from-lifeos-chart-secondary via-lifeos-app to-lifeos-surface",

          border:
            "border-lifeos-chart-secondary/30",
        };
      }

      return {
        background:
          "from-lifeos-app via-black to-black",

        border:
          "border-lifeos-border/40",
      };
    }, [hour]);

  // ==========================================
  // Time & Date
  // ==========================================

  const currentTime =
    now.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  const currentDate =
    now.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      }
    );

  // ==========================================
  // Dashboard Data
  // ==========================================

  const activeMissions =
    tasks.filter(
      (task) =>
        !task.completed
    ).length;

  const primaryObjective =
    atlas.briefing
      .recommendedMission ??
    atlas.missions[0]
      ?.title ??
    "No Active Mission";

  const completionRate =
    atlas.analysis
      .completionRate;

  const focusScore =
    atlas.analysis
      .focusScore;

  const successChance =
    atlas.prediction
      .successChance;

  const streak =
    atlas.xp.streak;

  const motivation =
    atlas.briefing
      .motivation;

  const atlasInsight =
    atlas.recommendations[0]
      ?.description ??
    "Everything is operating normally.";

  return (
    <section
      className={`relative overflow-hidden rounded-[32px] border ${heroTheme.border} bg-gradient-to-br ${heroTheme.background} shadow-2xl transition-all duration-700`}
    >
      {/* Background Glow */}

      <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-lifeos-accent/10 blur-3xl" />

      <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-lifeos-accent/10 blur-3xl" />

      <div className="absolute inset-0 bg-lifeos-surface-secondary/30" />

      <div className="relative z-10 p-8 md:p-10 xl:p-14">

        {/* ========================================= */}
        {/* Header */}
        {/* ========================================= */}

        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.55em] text-lifeos-accent">
              LIFEOS
            </p>

            <p className="mt-2 text-sm uppercase tracking-[0.45em] text-lifeos-muted">
              AI OPERATING SYSTEM
            </p>

            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-lifeos-accent/20 bg-lifeos-accent/10 px-5 py-2 backdrop-blur-xl">

              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-lifeos-success" />

              <span className="text-xs font-bold uppercase tracking-[0.12em] text-lifeos-accent">
                ATLAS ONLINE
              </span>

            </div>

          </div>

          {/* Live Status */}

          <div className="rounded-3xl border border-lifeos-accent/20 bg-lifeos-surface/50 px-8 py-6 backdrop-blur-xl">

            <p className="text-xs uppercase tracking-[0.12em] text-lifeos-accent">
              SYSTEM STATUS
            </p>

            <div className="mt-5 flex items-center gap-3">

              <div className="h-3 w-3 animate-pulse rounded-full bg-lifeos-success" />

              <span className="text-sm font-medium text-lifeos-text-secondary">
                All Systems Operational
              </span>

            </div>

            <div className="mt-6 h-px bg-lifeos-hover" />

            <p className="mt-6 text-4xl font-bold">
              {currentTime}
            </p>

            <p className="mt-2 text-lifeos-text-secondary">
              {currentDate}
            </p>

          </div>

        </div>

        {/* ========================================= */}
        {/* Welcome */}
        {/* ========================================= */}

        <div className="mt-16 max-w-4xl">

          <p className="text-sm font-semibold uppercase tracking-[0.45em] text-lifeos-accent">
            {missionStatus}
          </p>

          <h1 className="mt-6 text-5xl font-bold leading-tight md:text-6xl xl:text-7xl">

            Welcome back,

            <br />

            <span className="bg-gradient-to-r from-lifeos-accent via-lifeos-accent to-lifeos-chart-secondary bg-clip-text text-transparent">
              {name || "Operator"}
            </span>

          </h1>

          <p className="mt-8 max-w-3xl text-lg leading-8 text-lifeos-text-secondary">
            {motivation}
          </p>

        </div>

        <div className="my-14 h-px bg-gradient-to-r from-lifeos-accent/40 via-lifeos-hover to-transparent" />

        {/* ========================================= */}
        {/* Primary Objective */}
        {/* ========================================= */}

        <div className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">

          <div className="rounded-3xl border border-lifeos-accent/20 bg-lifeos-surface/40 p-8 backdrop-blur-xl">

            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lifeos-accent">
              PRIMARY OBJECTIVE
            </p>

            <h2 className="mt-5 text-3xl font-bold leading-tight xl:text-4xl">
              {primaryObjective}
            </h2>

            <p className="mt-4 text-lifeos-text-secondary">
              Complete your highest-impact mission first to maximize today's progress and long-term growth.
            </p>

            <div className="mt-10">

              <div className="mb-3 flex items-center justify-between">

                <span className="text-sm font-medium text-lifeos-text-secondary">
                  Mission Progress
                </span>

                <span className="text-lg font-bold text-lifeos-accent">
                  {completionRate}%
                </span>

              </div>

              <div className="h-4 overflow-hidden rounded-full bg-lifeos-elevated">

                <div
                  className="h-full rounded-full bg-gradient-to-r from-lifeos-accent via-lifeos-accent to-lifeos-accent transition-all duration-1000"
                  style={{
                    width: `${completionRate}%`,
                  }}
                />

              </div>

            </div>

            <div className="mt-10 rounded-2xl border border-lifeos-accent/10 bg-lifeos-app/40 p-5">

              <p className="text-xs uppercase tracking-[0.12em] text-lifeos-muted">
                NEXT MILESTONE
              </p>

              <p className="mt-3 text-lg font-semibold text-lifeos-text">
                Complete your highest-priority task and keep your current plan moving forward.
              </p>

            </div>

          </div>

          {/* ========================================= */}
          {/* Performance Metrics */}
          {/* ========================================= */}

          <div className="grid grid-cols-2 gap-5">

            <div className="rounded-3xl border border-lifeos-accent/10 bg-lifeos-surface/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1">

              <p className="text-3xl">
                🎯
              </p>

              <p className="mt-5 text-4xl font-bold">
                {focusScore}
              </p>

              <p className="mt-2 text-sm uppercase tracking-[0.12em] text-lifeos-muted">
                Focus
              </p>

            </div>

            <div className="rounded-3xl border border-lifeos-accent/10 bg-lifeos-surface/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1">

              <p className="text-3xl">
                🔥
              </p>

              <p className="mt-5 text-4xl font-bold text-lifeos-warning">
                {streak}
              </p>

              <p className="mt-2 text-sm uppercase tracking-[0.12em] text-lifeos-muted">
                Day Streak
              </p>

            </div>

            <div className="rounded-3xl border border-lifeos-accent/10 bg-lifeos-surface/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1">

              <p className="text-3xl">
                📋
              </p>

              <p className="mt-5 text-4xl font-bold">
                {activeMissions}
              </p>

              <p className="mt-2 text-sm uppercase tracking-[0.12em] text-lifeos-muted">
                Missions
              </p>

            </div>

          </div>

        </div>

        <div className="my-14 h-px bg-gradient-to-r from-lifeos-accent/40 via-lifeos-hover to-transparent" />

        {/* ========================================= */}
        {/* ATLAS Analysis */}
        {/* ========================================= */}

        <div className="grid gap-8 xl:grid-cols-[1.45fr_0.9fr]">

          <div className="rounded-3xl border border-lifeos-accent/20 bg-lifeos-surface/40 p-8 backdrop-blur-xl">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lifeos-accent">
                  ATLAS ANALYSIS
                </p>

                <h3 className="mt-3 text-3xl font-bold">
                  Daily Intelligence Brief
                </h3>

              </div>

              <div className="rounded-full border border-lifeos-accent/20 bg-lifeos-accent/10 px-4 py-2">

                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-lifeos-accent">
                  LIVE
                </span>

              </div>

            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">

              <div className="rounded-2xl bg-lifeos-app/60 p-6">

                <p className="text-xs uppercase tracking-[0.12em] text-lifeos-muted">
                  Success Probability
                </p>

                <p className="mt-4 text-5xl font-bold text-lifeos-success">
                  {successChance}%
                </p>

                <p className="mt-2 text-sm text-lifeos-text-secondary">
                  High confidence
                </p>

              </div>

              <div className="rounded-2xl bg-lifeos-app/60 p-6">

                <p className="text-xs uppercase tracking-[0.12em] text-lifeos-muted">
                  Focus Forecast
                </p>

                <p className="mt-4 text-5xl font-bold text-lifeos-accent">
                  {focusScore}
                </p>

                <p className="mt-2 text-sm text-lifeos-text-secondary">
                  Stay distraction free.
                </p>

              </div>

            </div>

            <div className="mt-8 rounded-2xl border border-lifeos-accent/10 bg-lifeos-accent/5 p-6">

              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lifeos-accent">
                AI Recommendation
              </p>

              <p className="mt-4 text-lg leading-8 text-lifeos-text-secondary">
                {atlasInsight}
              </p>

            </div>

          </div>

          {/* ========================================= */}
          {/* Mission Status */}
          {/* ========================================= */}

          <div className="rounded-3xl border border-lifeos-accent/20 bg-lifeos-surface/40 p-8 backdrop-blur-xl">

            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lifeos-accent">
              MISSION STATUS
            </p>

            <div className="mt-8 space-y-6">

              <div className="flex items-center justify-between">

                <span className="text-lifeos-text-secondary">
                  ATLAS
                </span>

                <span className="font-semibold text-lifeos-success">
                  ONLINE
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-lifeos-text-secondary">
                  Objective
                </span>

                <span className="font-semibold text-lifeos-text">
                  Active
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-lifeos-text-secondary">
                  Progress
                </span>

                <span className="font-semibold text-lifeos-accent">
                  {completionRate}%
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-lifeos-text-secondary">
                  Day Streak
                </span>

                <span className="font-semibold text-lifeos-warning">
                  {streak} Days
                </span>

              </div>

            </div>

            <div className="mt-10 rounded-2xl bg-gradient-to-r from-lifeos-accent/10 to-lifeos-accent/10 p-5">

              <p className="text-xs uppercase tracking-[0.12em] text-lifeos-accent">
                TODAY'S OUTLOOK
              </p>

              <p className="mt-3 text-lg font-semibold leading-7">
                Keep your highest-impact task first and avoid unnecessary context switching.
              </p>

            </div>

          </div>

        </div>

        {/* ========================================= */}
        {/* Bottom Signature */}
        {/* ========================================= */}

        <div className="mt-14">

          <div className="rounded-3xl border border-lifeos-accent/15 bg-gradient-to-r from-lifeos-accent/5 via-transparent to-lifeos-accent/5 p-6 backdrop-blur-xl">

            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

              <div>

                <p className="text-xs uppercase tracking-[0.12em] text-lifeos-accent">
                  LIFEOS CORE
                </p>

                <h3 className="mt-3 text-2xl font-bold">
                  One Mission.
                  <span className="bg-gradient-to-r from-lifeos-accent via-lifeos-accent to-lifeos-chart-secondary bg-clip-text text-transparent">
                    {" "}
                    One System.
                  </span>
                </h3>

                <p className="mt-4 max-w-2xl leading-7 text-lifeos-text-secondary">
                  Every action you complete moves your plans forward. Consistent progress compounds into extraordinary results.
                </p>

              </div>

              <div className="flex flex-wrap gap-4">

                <div className="rounded-2xl border border-lifeos-accent/10 bg-lifeos-app/60 px-5 py-4">

                  <p className="text-xs uppercase tracking-[0.12em] text-lifeos-muted">
                    VERSION
                  </p>

                  <p className="mt-2 text-xl font-bold text-lifeos-accent">
                    V2.0
                  </p>

                </div>

                <div className="rounded-2xl border border-lifeos-accent/10 bg-lifeos-app/60 px-5 py-4">

                  <p className="text-xs uppercase tracking-[0.12em] text-lifeos-muted">
                    ENGINE
                  </p>

                  <p className="mt-2 text-xl font-bold">
                    ATLAS
                  </p>

                </div>

                <div className="rounded-2xl border border-lifeos-accent/10 bg-lifeos-app/60 px-5 py-4">

                  <p className="text-xs uppercase tracking-[0.12em] text-lifeos-muted">
                    STATUS
                  </p>

                  <p className="mt-2 text-xl font-bold text-lifeos-success">
                    READY
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}