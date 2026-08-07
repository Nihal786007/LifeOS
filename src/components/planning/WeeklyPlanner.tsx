import { useMemo, useState } from "react";

import { useMonthlyPlanning } from "../../context/MonthlyPlanningContext";
import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";

import Button from "../ui/Button";

import WeeklyTargetCard from "./WeeklyTargetCard";
import WeeklyTargetModal from "./WeeklyTargetModal";
import WeeklyTargetEmptyState from "./WeeklyTargetEmptyState";

export default function WeeklyPlanner() {
  const { monthlyPlans } =
    useMonthlyPlanning();

  const { weeklyTargets } =
    useWeeklyPlanning();

  const [open, setOpen] =
    useState(false);

  const [selectedMonthlyTarget, setSelectedMonthlyTarget] =
    useState("");

  const selectedTarget = useMemo(
    () =>
      monthlyPlans.find(
        (plan) =>
          plan.id ===
          Number(selectedMonthlyTarget)
      ),
    [monthlyPlans, selectedMonthlyTarget]
  );

  const weeks = [1, 2, 3, 4, 5] as const;

  const filteredTargets =
    weeklyTargets.filter(
      (target) =>
        target.monthlyTargetId ===
        Number(selectedMonthlyTarget)
    );
      return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900 p-8">

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-3xl font-bold text-white">
            📆 Weekly Targets
          </h2>

          <p className="mt-2 text-slate-400">
            Break Monthly Targets into weekly milestones.
          </p>

        </div>

        <Button
          onClick={() =>
            setOpen(true)
          }
        >
          + Add Weekly Target
        </Button>

      </div>

      <div className="mt-8">

        {monthlyPlans.length === 0 ? (

          <WeeklyTargetEmptyState
            hasMonthlyTargets={false}
            onAdd={() => {}}
          />

        ) : (

          <>

            <label className="mb-2 block text-sm text-slate-400">
              Monthly Target
            </label>

            <select
              value={selectedMonthlyTarget}
              onChange={(e) =>
                setSelectedMonthlyTarget(
                  e.target.value
                )
              }
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-cyan-500"
            >
              <option value="">
                Select Monthly Target
              </option>

              {monthlyPlans.map((plan) => (
                <option
                  key={plan.id}
                  value={plan.id}
                >
                  {plan.title}
                </option>
              ))}

            </select>

            {selectedTarget && (

              <div className="mt-8 space-y-8">

                {weeks.map((week) => {

                  const targets =
                    filteredTargets.filter(
                      (target) =>
                        target.week === week
                    );

                  return (
                    <div key={week}>

                      <h3 className="mb-4 text-xl font-semibold text-white">
                        Week {week}
                      </h3>

                      {targets.length === 0 ? (

                        <p className="rounded-2xl border border-dashed border-slate-700 py-6 text-center text-slate-500">
                          No Weekly Targets
                        </p>

                      ) : (

                        <div className="space-y-4">

                          {targets.map(
                            (target) => (
                              <WeeklyTargetCard
                                key={target.id}
                                id={target.id}
                              />
                            )
                          )}

                        </div>

                      )}

                    </div>
                  );

                })}

              </div>

            )}

          </>

        )}

      </div>

      <WeeklyTargetModal
        open={open}
        onClose={() =>
          setOpen(false)
        }
      />

    </section>
  );
}