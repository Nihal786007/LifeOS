import { useEffect, useState } from "react";
import { AtlasEngine } from "../../atlas/atlasEngine";
import { useApp } from "../../context/AppContext";

interface HeroSectionProps {
  name: string;
}

export default function HeroSection({
  name,
}: HeroSectionProps) {

  const { tasks, habits } = useApp();

  const atlas = new AtlasEngine(tasks, habits);
  const ai = atlas.run();

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();

  const greeting =
    hour < 12
      ? "Good Morning"
      : hour < 18
      ? "Good Afternoon"
      : "Good Evening";

  const heroTheme =
    hour < 12
      ? "from-sky-900/60 via-slate-900 to-slate-900 border-sky-700/30"
      : hour < 18
      ? "from-cyan-900/50 via-slate-900 to-slate-900 border-cyan-700/30"
      : hour < 21
      ? "from-indigo-900/50 via-slate-900 to-slate-900 border-indigo-700/30"
      : "from-slate-950 via-slate-900 to-black border-slate-700";

  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const activeMissions = tasks.filter(
    (task) => !task.completed
  ).length;

  const focus =
    ai.missions.length > 0
      ? ai.missions[0].title
      : "No Active Mission";

  const insight =
    ai.recommendations.length > 0
      ? ai.recommendations[0].description
      : "Everything is running smoothly.";

  return (
    <section
      className={`rounded-3xl border bg-gradient-to-br ${heroTheme} p-12 xl:p-16 shadow-2xl transition-all duration-700`}
    >
      {/* Header */}
      <div className="flex flex-col gap-14 xl:flex-row xl:items-start xl:justify-between">

        <div className="max-w-3xl">

          <p className="text-xs uppercase tracking-[0.45em] text-cyan-400">
            LifeOS
          </p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 py-2">

            <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />

            <span className="text-xs uppercase tracking-[0.3em] text-cyan-300">
              Mission Control
            </span>

          </div>

          <h1 className="mt-8 text-6xl xl:text-7xl font-black tracking-tight">
  {greeting}
  {name && (
    <>
      <br />
      <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        {name}
      </span>
    </>
  )}
</h1>

         <h1 className="mt-8 text-6xl xl:text-7xl font-black tracking-tight">
  {greeting}
  {name && (
    <>
      <br />
      <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        {name}
      </span>
    </>
  )}
</h1>

        </div>

        <div className="text-left xl:text-right">

          <p className="text-xl text-slate-300">
            {date}
          </p>

          <h2 className="mt-4 text-5xl font-black">
            {time}
          </h2>

        </div>

      </div>

      {/* Divider */}

      <div className="my-14 h-px bg-gradient-to-r from-cyan-500/40 via-slate-700 to-transparent" />

      {/* Statistics */}

      <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">

        <div className="flex-1">

          <p className="text-sm uppercase tracking-[0.35em] text-slate-500">
            Today's Focus
          </p>

          <h2 className="mt-6 text-4xl font-bold leading-tight">
            {focus}
          </h2>

        </div>

        <div className="flex-1">

          <p className="text-sm uppercase tracking-[0.35em] text-slate-500">
            Today's Progress
          </p>

          <h2 className="mt-6 text-6xl xl:text-7xl font-black text-cyan-400">
            {ai.analysis.completionRate}%
          </h2>

        </div>

        <div className="flex-1">

          <p className="text-sm uppercase tracking-[0.35em] text-slate-500">
            Active Missions
          </p>

          <h2 className="mt-6 text-6xl xl:text-7xl font-black">
            {activeMissions}
          </h2>

        </div>

      </div>

      {/* Insight */}

      <div className="mt-16 rounded-3xl border border-slate-700 bg-slate-950/70 p-10 backdrop-blur-sm">

        <p className="text-xs uppercase tracking-[0.45em] text-cyan-400">
          System Insight
        </p>

        <p className="mt-6 max-w-4xl text-2xl leading-10 text-slate-300">
          {insight}
        </p>

      </div>

    </section>
  );
}