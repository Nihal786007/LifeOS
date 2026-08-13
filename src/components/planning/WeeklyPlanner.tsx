import { useState } from "react";

import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";

import Button from "../ui/Button";

import WeeklyTargetCard from "./WeeklyTargetCard";
import WeeklyTargetModal from "./WeeklyTargetModal";
import WeeklyTargetEmptyState from "./WeeklyTargetEmptyState";

export default function WeeklyPlanner() {
  const { weeklyTargets } =
    useWeeklyPlanning();

  const [open, setOpen] =
    useState(false);

  const weeks = [1, 2, 3, 4, 5] as const;

  return (
    <section className="space-y-8">

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-3xl font-bold text-white">
            📆 Weekly Targets
          </h2>

          <p className="mt-2 text-slate-400">
            Break your monthly goals into weekly execution.
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

      {weeklyTargets.length === 0 ? (

        <WeeklyTargetEmptyState
          hasMonthlyTargets={true}
          onAdd={() =>
            setOpen(true)
          }
        />

      ) : (

        <div className="space-y-10">

          {weeks.map((week) => {

            const targets =
              weeklyTargets.filter(
                (target) =>
                  target.week === week
              );

            if (targets.length === 0) {
              return null;
            }

            return (

              <div
                key={week}
                className="space-y-5"
              >

                <h3 className="text-2xl font-semibold text-cyan-400">
                  Week {week}
                </h3>

                <div className="space-y-4">

                  {targets.map((target) => (

                    <WeeklyTargetCard
                      key={target.id}
                      id={target.id}
                    />

                  ))}

                </div>

              </div>

            );

          })}

        </div>

      )}

      <WeeklyTargetModal
        open={open}
        onClose={() =>
          setOpen(false)
        }
      />

    </section>
  );
}