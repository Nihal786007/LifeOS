import {
  FaArrowRight,
  FaBullseye,
  FaCalendarDays,
  FaFlagCheckered,
  FaListCheck,
  FaUser,
} from "react-icons/fa6";

import LifeGoalPlanner from "../components/planning/LifeGoalPlanner";
import PersonalPlanner from "../components/planning/PersonalPlanner";
import PlanningSummary from "../components/planning/PlanningSummary";

type PlanningDestination = "tasks" | "calendar";

interface PlanningProps {
  onNavigate: (destination: PlanningDestination) => void;
}

const PLANNING_LAYERS = [
  { label: "Life Goal", icon: FaBullseye },
  { label: "Monthly Outcome", icon: FaCalendarDays },
  { label: "Weekly Focus", icon: FaFlagCheckered },
  { label: "Task", icon: FaListCheck },
] as const;

export default function Planning({ onNavigate }: PlanningProps) {
  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-10">
      <header className="rounded-[2rem] border border-cyan-400/15 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/25 p-7 lg:p-9">
        <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
              Life architecture
            </p>
            <h1 className="mt-3 text-4xl font-black text-white">Planning</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Connect long-term direction to the concrete work that moves it
              forward.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate("calendar")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-200"
            >
              <FaCalendarDays />
              Open Calendar
            </button>
            <button
              type="button"
              onClick={() => onNavigate("tasks")}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              <FaListCheck />
              Open Tasks
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-2 sm:grid-cols-4">
          {PLANNING_LAYERS.map((layer, index) => {
            const Icon = layer.icon;

            return (
              <div
                key={layer.label}
                className="flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-xs text-cyan-300">
                  <Icon />
                </span>
                <span className="min-w-0 truncate text-xs font-semibold text-slate-300">
                  {layer.label}
                </span>
                {index < PLANNING_LAYERS.length - 1 && (
                  <FaArrowRight className="ml-auto hidden text-[10px] text-slate-700 sm:block" />
                )}
              </div>
            );
          })}
        </div>
      </header>

      <PlanningSummary />

      <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/75 p-5 sm:p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
            <FaBullseye />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Goal Planning
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              Build from a Life Goal
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Shape each goal into Monthly Outcomes, Weekly Focus, and Tasks.
            </p>
          </div>
        </div>
        <LifeGoalPlanner />
      </section>

      <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/75 p-5 sm:p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
            <FaUser />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
              Personal Planning
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              Plan without a Life Goal
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create standalone Monthly Outcomes and Weekly Focus for personal
              priorities.
            </p>
          </div>
        </div>
        <PersonalPlanner />
      </section>
    </div>
  );
}
