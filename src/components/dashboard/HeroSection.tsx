import StatCard from "../ui/StatCard";
import { useEffect, useMemo, useState } from "react";
import type { AtlasResult } from "../../atlas/types";
import { useApp } from "../../context/AppContext";

interface HeroSectionProps {
  name: string;
  atlas: AtlasResult;
}

export default function HeroSection({
  name,
  atlas,
}: HeroSectionProps) {
  const { tasks } = useApp();

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();

  /* ----------------------------------------
     Mission Status
  ---------------------------------------- */

  const missionStatus = useMemo(() => {
    if (hour < 12) return "MISSION READY";
    if (hour < 18) return "MISSION IN PROGRESS";
    if (hour < 22) return "MISSION REVIEW";

    return "SYSTEM WIND DOWN";
  }, [hour]);

  /* ----------------------------------------
     Dynamic Theme
  ---------------------------------------- */

  const heroTheme = useMemo(() => {
    if (hour < 12) {
      return {
        background:
          "from-sky-950 via-slate-950 to-slate-900",
        border: "border-sky-700/30",
      };
    }

    if (hour < 18) {
      return {
        background:
          "from-cyan-950 via-slate-950 to-slate-900",
        border: "border-cyan-700/30",
      };
    }

    if (hour < 22) {
      return {
        background:
          "from-indigo-950 via-slate-950 to-slate-900",
        border: "border-indigo-700/30",
      };
    }

    return {
      background:
        "from-slate-950 via-black to-black",
      border: "border-slate-700/40",
    };
  }, [hour]);

  /* ----------------------------------------
     Time & Date
  ---------------------------------------- */

  const currentTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const currentDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  /* ----------------------------------------
     Dashboard Data
  ---------------------------------------- */

  const activeMissions = tasks.filter(
    (task) => !task.completed
  ).length;

  const primaryObjective =
    atlas.briefing.recommendedMission ??
    atlas.missions[0]?.title ??
    "No Active Mission";

  const completionRate =
    atlas.analysis.completionRate;

  const focusScore =
    atlas.analysis.focusScore;

  const potentialXP =
    atlas.analysis.potentialXP;

  const successChance =
    atlas.prediction.successChance;

  const streak =
    atlas.xp.streak;

  const motivation =
    atlas.briefing.motivation;

  const atlasInsight =
    atlas.recommendations[0]?.description ??
    "Everything is operating normally.";

  // JSX starts in Phase Alpha – Part 2
    return (
    <section
      className={`relative overflow-hidden rounded-[32px] border ${heroTheme.border} bg-gradient-to-br ${heroTheme.background} shadow-2xl transition-all duration-700`}
    >
      {/* Background Glow */}
      <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_45%)]" />

      <div className="relative z-10 p-8 md:p-10 xl:p-14">

        {/* ========================================= */}
        {/* Header */}
        {/* ========================================= */}

        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.55em] text-cyan-400">
              LIFEOS
            </p>

            <p className="mt-2 text-sm uppercase tracking-[0.45em] text-slate-500">
              AI OPERATING SYSTEM
            </p>

            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 py-2 backdrop-blur-xl">

              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />

              <span className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
                ATLAS ONLINE
              </span>

            </div>

          </div>

          {/* Live Status */}

          <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/50 px-8 py-6 backdrop-blur-xl">

            <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
              SYSTEM STATUS
            </p>

            <div className="mt-5 flex items-center gap-3">

              <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />

              <span className="text-sm font-medium text-slate-300">
                All Systems Operational
              </span>

            </div>

            <div className="mt-6 h-px bg-slate-700" />

            <p className="mt-6 text-4xl font-black">
              {currentTime}
            </p>

            <p className="mt-2 text-slate-400">
              {currentDate}
            </p>

          </div>

        </div>

        {/* ========================================= */}
        {/* Welcome */}
        {/* ========================================= */}

        <div className="mt-16 max-w-4xl">

          <p className="text-sm font-semibold uppercase tracking-[0.45em] text-cyan-400">

            {missionStatus}

          </p>

          <h1 className="mt-6 text-5xl font-black leading-tight md:text-6xl xl:text-7xl">

            Welcome back,

            <br />

            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">

              {name || "Operator"}

            </span>

          </h1>

          <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-300">

            {motivation}

          </p>

        </div>

        {/* Divider */}

        <div className="my-14 h-px bg-gradient-to-r from-cyan-500/40 via-slate-700 to-transparent" />

        {/* Objective + Metrics start in Phase Bravo */}
                {/* ========================================= */}
        {/* Primary Objective */}
        {/* ========================================= */}

        <div className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">

          {/* Objective Panel */}

          <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/40 p-8 backdrop-blur-xl">

            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-400">
              PRIMARY OBJECTIVE
            </p>

            <h2 className="mt-5 text-3xl font-black leading-tight xl:text-4xl">
              {primaryObjective}
            </h2>

            <p className="mt-4 text-slate-400">
              Complete your highest-impact mission first to maximize today's
              progress and long-term growth.
            </p>

            {/* Progress */}

            <div className="mt-10">

              <div className="mb-3 flex items-center justify-between">

                <span className="text-sm font-medium text-slate-400">
                  Mission Progress
                </span>

                <span className="text-lg font-bold text-cyan-400">
                  {completionRate}%
                </span>

              </div>

              <div className="h-4 overflow-hidden rounded-full bg-slate-800">

                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 transition-all duration-1000"
                  style={{
                    width: `${completionRate}%`,
                  }}
                />

              </div>

            </div>

            {/* Next Milestone */}

            <div className="mt-10 rounded-2xl border border-cyan-500/10 bg-slate-950/40 p-5">

              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                NEXT MILESTONE
              </p>

              <p className="mt-3 text-lg font-semibold text-white">
                Complete today's Robotics work and push your latest progress to
                GitHub.
              </p>

            </div>

          </div>

        {/* Performance Metrics */}

<div className="grid grid-cols-2 gap-5">

  <StatCard
    icon="⚡"
    title="XP"
    value={potentialXP}
    color="text-cyan-400"
  />

  <div className="rounded-3xl border border-cyan-500/10 bg-slate-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1">

    <p className="text-3xl">🎯</p>

    <p className="mt-5 text-4xl font-black">
      {focusScore}
    </p>

    <p className="mt-2 text-sm uppercase tracking-[0.25em] text-slate-500">
      Focus
    </p>

  </div>

            <div className="rounded-3xl border border-cyan-500/10 bg-slate-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1">

              <p className="text-3xl">🔥</p>

              <p className="mt-5 text-4xl font-black text-orange-400">
                {streak}
              </p>

              <p className="mt-2 text-sm uppercase tracking-[0.25em] text-slate-500">
                Day Streak
              </p>

            </div>

            <div className="rounded-3xl border border-cyan-500/10 bg-slate-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1">

              <p className="text-3xl">📋</p>

              <p className="mt-5 text-4xl font-black">
                {activeMissions}
              </p>

              <p className="mt-2 text-sm uppercase tracking-[0.25em] text-slate-500">
                Missions
              </p>

            </div>

          </div>

        </div>

        {/* Divider */}

        <div className="my-14 h-px bg-gradient-to-r from-cyan-500/40 via-slate-700 to-transparent" />

        {/* ATLAS Analysis starts in Phase Delta */}
                {/* ========================================= */}
        {/* ATLAS ANALYSIS */}
        {/* ========================================= */}

        <div className="grid gap-8 xl:grid-cols-[1.45fr_0.9fr]">

          {/* Atlas Intelligence */}

          <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/40 p-8 backdrop-blur-xl">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-400">
                  ATLAS ANALYSIS
                </p>

                <h3 className="mt-3 text-3xl font-black">
                  Daily Intelligence Brief
                </h3>

              </div>

              <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2">

                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
                  LIVE
                </span>

              </div>

            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">

              {/* Success */}

              <div className="rounded-2xl bg-slate-950/60 p-6">

                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Success Probability
                </p>

                <p className="mt-4 text-5xl font-black text-emerald-400">
                  {successChance}%
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  High confidence
                </p>

              </div>

              {/* Focus */}

              <div className="rounded-2xl bg-slate-950/60 p-6">

                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Focus Forecast
                </p>

                <p className="mt-4 text-5xl font-black text-cyan-400">
                  {focusScore}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Stay distraction free.
                </p>

              </div>

            </div>

            {/* AI Message */}

            <div className="mt-8 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-6">

              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">
                AI Recommendation
              </p>

              <p className="mt-4 text-lg leading-8 text-slate-300">
                {atlasInsight}
              </p>

            </div>

          </div>

          {/* Mission Status */}

          <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/40 p-8 backdrop-blur-xl">

            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-400">
              MISSION STATUS
            </p>

            <div className="mt-8 space-y-6">

              <div className="flex items-center justify-between">

                <span className="text-slate-400">
                  ATLAS
                </span>

                <span className="font-semibold text-emerald-400">
                  ONLINE
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-slate-400">
                  Objective
                </span>

                <span className="font-semibold text-white">
                  Active
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-slate-400">
                  Progress
                </span>

                <span className="font-semibold text-cyan-400">
                  {completionRate}%
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-slate-400">
                  XP Potential
                </span>

                <span className="font-semibold text-cyan-400">
                  {potentialXP}
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-slate-400">
                  Day Streak
                </span>

                <span className="font-semibold text-orange-400">
                  {streak} Days
                </span>

              </div>

            </div>

            <div className="mt-10 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-5">

              <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">
                TODAY'S OUTLOOK
              </p>

              <p className="mt-3 text-lg font-semibold leading-7">
                Excellent momentum. Keep your highest-impact mission first and
                avoid unnecessary context switching.
              </p>

            </div>

          </div>

        </div>
                {/* ========================================= */}
        {/* Bottom Signature */}
        {/* ========================================= */}

        <div className="mt-14">

          <div className="rounded-3xl border border-cyan-500/15 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5 p-6 backdrop-blur-xl">

            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

              <div>

                <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">

                  LIFEOS CORE

                </p>

                <h3 className="mt-3 text-2xl font-black">

                  One Mission.
                  <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                    {" "}One System.
                  </span>

                </h3>

                <p className="mt-4 max-w-2xl text-slate-400 leading-7">

                  Every mission completed today moves you one step closer to
                  becoming the engineer you aspire to be. Keep building
                  consistently. Small progress compounds into extraordinary
                  results.

                </p>

              </div>

              <div className="flex flex-wrap gap-4">

                <div className="rounded-2xl border border-cyan-500/10 bg-slate-950/60 px-5 py-4">

                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    VERSION
                  </p>

                  <p className="mt-2 text-xl font-bold text-cyan-400">
                    V2.0
                  </p>

                </div>

                <div className="rounded-2xl border border-cyan-500/10 bg-slate-950/60 px-5 py-4">

                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    ENGINE
                  </p>

                  <p className="mt-2 text-xl font-bold">
                    ATLAS
                  </p>

                </div>

                <div className="rounded-2xl border border-cyan-500/10 bg-slate-950/60 px-5 py-4">

                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    STATUS
                  </p>

                  <p className="mt-2 text-xl font-bold text-emerald-400">
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