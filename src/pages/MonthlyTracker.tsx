import { useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaBullseye,
  FaCheckCircle,
  FaChartLine,
  FaPlus,
} from "react-icons/fa";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PageHero from "../components/ui/PageHero";
import StatCard from "../components/ui/StatCard";

type MonthlyGoal = {
  id: number;
  text: string;
  completed: boolean;
};

export default function MonthlyTracker() {
  const [goal, setGoal] = useState("");

  const [goals, setGoals] = useState<MonthlyGoal[]>(() => {
    const saved = localStorage.getItem("lifeos-monthly-goals");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(
      "lifeos-monthly-goals",
      JSON.stringify(goals)
    );
  }, [goals]);

  function addGoal() {
    if (!goal.trim()) return;

    setGoals([
      ...goals,
      {
        id: Date.now(),
        text: goal.trim(),
        completed: false,
      },
    ]);

    setGoal("");
  }

  function deleteGoal(id: number) {
    setGoals(goals.filter((goal) => goal.id !== id));
  }

  function toggleGoal(id: number) {
    setGoals(
      goals.map((goal) =>
        goal.id === id
          ? { ...goal, completed: !goal.completed }
          : goal
      )
    );
  }

  const completedGoals = goals.filter(
    (goal) => goal.completed
  ).length;

  const progress =
    goals.length === 0
      ? 0
      : Math.round((completedGoals / goals.length) * 100);

  return (
    <div className="space-y-10">

      <PageHero
        badge="Mission Timeline"
        title="Monthly Planner"
        description="Plan your month, track milestones, and achieve every objective with precision."
      >
        <Card className="border-cyan-500/20 bg-cyan-500/5">

          <p className="text-sm uppercase tracking-widest text-cyan-300">
            Monthly Progress
          </p>

          <h2 className="mt-3 text-5xl font-black">
            {progress}%
          </h2>

          <p className="mt-3 text-slate-400">
            Goals Completed
          </p>

        </Card>
      </PageHero>

      <div className="grid gap-6 md:grid-cols-4">

        <StatCard
          icon={<FaCalendarAlt />}
          title="Days"
          value={31}
        />

        <StatCard
          icon={<FaBullseye />}
          title="Goals"
          value={goals.length}
          color="text-cyan-400"
        />

        <StatCard
          icon={<FaCheckCircle />}
          title="Completed"
          value={completedGoals}
          color="text-green-400"
        />

        <StatCard
          icon={<FaChartLine />}
          title="Progress"
          value={`${progress}%`}
          color="text-orange-400"
        />

      </div>

      <div className="grid gap-8 xl:grid-cols-2">
                 {/* Calendar */}

      <Card>

        <h2 className="mb-6 text-2xl font-bold">
          July 2026
        </h2>

        <div className="grid grid-cols-7 gap-3 text-center">

          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
            <div
              key={day}
              className="font-semibold uppercase tracking-wider text-slate-500"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: 31 }, (_, i) => (

            <button
              key={i}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-4 transition-all duration-300 hover:border-cyan-500 hover:bg-cyan-500/10"
            >
              {i + 1}
            </button>

          ))}

        </div>

      </Card>

      {/* Monthly Goals */}

      <Card>

        <h2 className="text-2xl font-bold">
          Monthly Goals
        </h2>

        <div className="mt-6 flex gap-3">

          <Input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Create a new monthly goal..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addGoal();
              }
            }}
          />

          <Button
            onClick={addGoal}
          >
            <FaPlus />
            Add
          </Button>

        </div>

        <div className="mt-8 space-y-4">

          {goals.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">

              <FaBullseye className="mx-auto text-4xl text-cyan-400" />

              <h3 className="mt-4 text-xl font-bold">
                No Monthly Goals
              </h3>

              <p className="mt-2 text-slate-400">
                Start planning your month by creating your first goal.
              </p>

            </div>

          ) : (

            goals.map((goal) => (

              <Card
                key={goal.id}
                className="p-5"
              >

                <div className="flex items-center justify-between">

                  <div
                    onClick={() => toggleGoal(goal.id)}
                    className="flex cursor-pointer items-center gap-4"
                  >

                    <FaCheckCircle
                      className={`text-2xl ${
                        goal.completed
                          ? "text-green-400"
                          : "text-slate-600"
                      }`}
                    />

                    <span
                      className={`text-lg ${
                        goal.completed
                          ? "line-through text-slate-500"
                          : "text-white"
                      }`}
                    >
                      {goal.text}
                    </span>

                  </div>

                  <Button
                    variant="danger"
                    onClick={() => deleteGoal(goal.id)}
                  >
                    Delete
                  </Button>

                </div>

              </Card>

            ))

          )}

        </div>

      </Card>
                 </div>

    </div>
  );
}