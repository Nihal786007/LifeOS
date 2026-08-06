import { useState } from "react";

import Button from "../ui/Button";

import { useMonthlyPlanning } from "../../context/MonthlyPlanningContext";

import MonthlyTargetCard from "./MonthlyTargetCard";
import MonthlyTargetModal from "./MonthlyTargetModal";
import MonthlyTargetEmptyState from "./MonthlyTargetEmptyState";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function MonthlyPlanner() {
  const { monthlyPlans } = useMonthlyPlanning();

  const today = new Date();

  const [selectedMonth, setSelectedMonth] =
    useState(today.getMonth() + 1);

  const [selectedYear, setSelectedYear] =
    useState(today.getFullYear());

  const [open, setOpen] = useState(false);

  function previousMonth() {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((year) => year - 1);
    } else {
      setSelectedMonth((month) => month - 1);
    }
  }

  function nextMonth() {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((year) => year + 1);
    } else {
      setSelectedMonth((month) => month + 1);
    }
  }

const filteredPlans = monthlyPlans
  .filter(
    (plan) =>
      plan.month === selectedMonth &&
      plan.year === selectedYear
  )
  .sort((a, b) => {
    if (a.completed === b.completed) {
      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    }

    return Number(a.completed) - Number(b.completed);
  });

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-2xl font-bold text-white">
            📅 Monthly Targets
          </h2>

          <p className="mt-2 text-slate-400">
            Turn your monthly goals into progress.
          </p>
        </div>

        <Button onClick={() => setOpen(true)}>
          + Add Target
        </Button>

      </div>

      <div className="mt-8 flex items-center justify-center gap-6">

        <button
          onClick={previousMonth}
          className="text-xl text-cyan-400 hover:text-cyan-300"
        >
          ◀
        </button>

        <h3 className="text-xl font-semibold text-white">
          {MONTHS[selectedMonth - 1]} {selectedYear}
        </h3>

        <button
          onClick={nextMonth}
          className="text-xl text-cyan-400 hover:text-cyan-300"
        >
          ▶
        </button>

      </div>

      <div className="mt-8">

        {filteredPlans.length === 0 ? (
          <MonthlyTargetEmptyState
            onAdd={() => setOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {filteredPlans.map((plan) => (
              <MonthlyTargetCard
                key={plan.id}
                id={plan.id}
              />
            ))}
          </div>
        )}

      </div>

      <MonthlyTargetModal
        open={open}
        onClose={() => setOpen(false)}
        month={selectedMonth}
        year={selectedYear}
      />

    </section>
  );
}