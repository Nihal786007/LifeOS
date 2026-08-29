import PlanningSummary from "../components/planning/PlanningSummary";
import LifeGoalPlanner from "../components/planning/LifeGoalPlanner";
import PersonalPlanner from "../components/planning/PersonalPlanner";

export default function Planning() {
  return (
    <div className="space-y-6">

      {/* ======================================
          Planning Header
      ====================================== */}

      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
            Life Architecture
          </p>

          <h1 className="mt-1 text-3xl font-bold text-white">
            Planning
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Design where your life is going, organize what matters,
            and turn every plan into real execution.
          </p>
        </div>

      </header>

      {/* ======================================
          Real Planning Summary
      ====================================== */}

      <PlanningSummary />

      {/* ======================================
          Planner Surfaces
      ====================================== */}

      <div className="grid gap-4 xl:grid-cols-2">

        {/* ====================================
            Life Goal Planner
        ==================================== */}

        <section
          className="
            min-h-64
            rounded-2xl
            border
            border-slate-800
            bg-slate-900
            p-5
          "
        >
          <div className="flex items-start justify-between gap-4">

            <div>
              <div className="flex items-center gap-2">

                <span className="text-lg">
                  🎯
                </span>

                <h2 className="text-xl font-bold text-white">
                  Life Goal Planner
                </h2>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                Build long-term goals into months, weeks, and
                Universal Tasks.
              </p>
            </div>

            <span
              className="
                rounded-lg
                border
                border-cyan-500/20
                bg-cyan-500/10
                px-2.5
                py-1
                text-xs
                font-medium
                text-cyan-300
              "
            >
              Goal path
            </span>

          </div>

          <div className="mt-5">
            <LifeGoalPlanner />
          </div>

        </section>

        {/* ====================================
            Personal Planner
        ==================================== */}

        <section
          className="
            min-h-64
            rounded-2xl
            border
            border-slate-800
            bg-slate-900
            p-5
          "
        >
          <div className="flex items-start justify-between gap-4">

            <div>
              <div className="flex items-center gap-2">

                <span className="text-lg">
                  👤
                </span>

                <h2 className="text-xl font-bold text-white">
                  Personal Planner
                </h2>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                Plan personal months and weeks without attaching
                them to a Life Goal.
              </p>
            </div>

            <span
              className="
                rounded-lg
                border
                border-slate-700
                bg-slate-800/60
                px-2.5
                py-1
                text-xs
                font-medium
                text-slate-300
              "
            >
              Personal path
            </span>

          </div>

          <div className="mt-5">
            <PersonalPlanner />
          </div>

        </section>

      </div>

    </div>
  );
}