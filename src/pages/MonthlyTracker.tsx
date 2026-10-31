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
        <Card className="border-lifeos-accent/20 bg-lifeos-accent/5">

          <p className="text-sm uppercase tracking-widest text-lifeos-accent">
            Monthly Progress
          </p>

          <h2 className="mt-3 text-5xl font-bold">
            {progress}%
          </h2>

          <p className="mt-3 text-lifeos-text-secondary">
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
          color="text-lifeos-accent"
        />

        <StatCard
          icon={<FaCheckCircle />}
          title="Completed"
          value={completedGoals}
          color="text-lifeos-success"
        />

        <StatCard
          icon={<FaChartLine />}
          title="Progress"
          value={`${progress}%`}
          color="text-lifeos-warning"
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
              className="font-semibold uppercase tracking-wider text-lifeos-muted"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: 31 }, (_, i) => (

            <button
              key={i}
              className="rounded-2xl border border-lifeos-border bg-lifeos-surface p-4 transition-all duration-300 hover:border-lifeos-accent hover:bg-lifeos-accent/10"
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

            <div className="rounded-2xl border border-dashed border-lifeos-border p-8 text-center">

              <FaBullseye className="mx-auto text-4xl text-lifeos-accent" />

              <h3 className="mt-4 text-xl font-bold">
                No Monthly Goals
              </h3>

              <p className="mt-2 text-lifeos-text-secondary">
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
                          ? "text-lifeos-success"
                          : "text-lifeos-muted"
                      }`}
                    />

                    <span
                      className={`text-lg ${
                        goal.completed
                          ? "line-through text-lifeos-muted"
                          : "text-lifeos-text"
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