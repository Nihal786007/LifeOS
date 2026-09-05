import {
  FaBullseye,
  FaCalendarDays,
  FaListCheck,
  FaClock,
} from "react-icons/fa6";

import {
  useLifeGoals,
} from "../../context/LifeGoalsContext";

import {
  useMonthlyPlanning,
} from "../../context/MonthlyPlanningContext";

import {
  useWeeklyPlanning,
} from "../../context/WeeklyPlanningContext";

import {
  useTasks,
} from "../../context/TaskContext";

function getLocalDateString() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

export default function PlanningSummary() {
  const {
    lifeGoals,
  } = useLifeGoals();

  const {
    monthlyPlans,
  } = useMonthlyPlanning();

  const {
    weeklyTargets,
  } = useWeeklyPlanning();

  const {
    tasks,
  } = useTasks();

  const now =
    new Date();

  const currentMonth =
    now.getMonth() + 1;

  const currentYear =
    now.getFullYear();

  const today =
    getLocalDateString();

  // ==========================================
  // Real Derived Planning Metrics
  // ==========================================

  const activeGoals =
    lifeGoals.filter(
      (goal) =>
        !goal.completed
    ).length;

  const thisMonthTargets =
    monthlyPlans.filter(
      (plan) =>
        plan.month ===
          currentMonth &&
        plan.year ===
          currentYear &&
        !plan.completed
    ).length;

  const activeWeeks =
    weeklyTargets.filter(
      (target) =>
        !target.completed
    ).length;

  const dueToday =
    tasks.filter(
      (task) =>
        !task.completed &&
        task.dueDate ===
          today
    ).length;

  const metrics = [
    {
      label:
        "Life Goals",

      value:
        activeGoals,

      icon:
        <FaBullseye />,

      detail:
        "active",
    },
    {
      label:
        "Monthly Outcomes",

      value:
        thisMonthTargets,

      icon:
        <FaCalendarDays />,

      detail:
        "this month",
    },
    {
      label:
        "Weekly Focus",

      value:
        activeWeeks,

      icon:
        <FaListCheck />,

      detail:
        "active",
    },
    {
      label:
        "Tasks Today",

      value:
        dueToday,

      icon:
        <FaClock />,

      detail:
        "due",
    },
  ];

  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

        {metrics.map(
          (metric) => (
            <div
              key={
                metric.label
              }
              className="
                flex
                min-h-24
                items-center
                gap-4
                rounded-xl
                border
                border-slate-800
                bg-slate-900
                px-4
                py-3
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-cyan-500/20
                  bg-cyan-500/10
                  text-sm
                  text-cyan-400
                "
              >
                {metric.icon}
              </div>

              <div className="min-w-0">

                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {metric.label}
                </p>

                <div className="mt-1 flex items-baseline gap-2">

                  <span className="text-2xl font-bold text-white">
                    {metric.value}
                  </span>

                  <span className="truncate text-xs text-slate-500">
                    {metric.detail}
                  </span>

                </div>

              </div>
            </div>
          )
        )}

      </div>
    </section>
  );
}
