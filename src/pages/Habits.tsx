import { useState } from "react";
import {
  FaFire,
  FaCheckCircle,
  FaChartLine,
  FaBullseye,
  FaPlus,
} from "react-icons/fa";

import { useApp } from "../context/AppContext";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PageHero from "../components/ui/PageHero";
import StatCard from "../components/ui/StatCard";

export default function Habits() {
  const {
    habits,
    addHabit,
    toggleHabit,
    deleteHabit,
  } = useApp();

  const [newHabit, setNewHabit] = useState("");

  function handleAddHabit() {
    if (!newHabit.trim()) return;

    addHabit(newHabit);
    setNewHabit("");
  }

  const completedToday = habits.filter(
    (habit) => habit.completedToday
  ).length;

  const progress =
    habits.length === 0
      ? 0
      : Math.round(
          (completedToday / habits.length) * 100
        );

  const totalStreak = habits.reduce(
    (sum, habit) => sum + habit.streak,
    0
  );

  return (
    <div className="space-y-10">

      <PageHero
        badge="Daily Discipline"
        title="Habit Tracker"
        description="Small habits repeated every day create extraordinary results."
      >
        <Card className="border-orange-500/20 bg-orange-500/5">

          <p className="text-sm uppercase tracking-widest text-orange-300">
            Today's Progress
          </p>

          <h2 className="mt-3 text-5xl font-black">
            {progress}%
          </h2>

          <p className="mt-3 text-slate-400">
            Habits Completed
          </p>

        </Card>
      </PageHero>

      <div className="grid gap-6 md:grid-cols-4">

        <StatCard
          icon={<FaBullseye />}
          title="Habits"
          value={habits.length}
        />

        <StatCard
          icon={<FaCheckCircle />}
          title="Completed"
          value={completedToday}
          color="text-green-400"
        />

        <StatCard
          icon={<FaFire />}
          title="Total Streak"
          value={totalStreak}
          color="text-orange-400"
        />

        <StatCard
          icon={<FaChartLine />}
          title="Progress"
          value={`${progress}%`}
          color="text-cyan-400"
        />

      </div>
            <Card>

        <h2 className="text-2xl font-bold">
          Add New Habit
        </h2>

        <div className="mt-6 flex gap-3">

          <Input
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="Create a new habit..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddHabit();
              }
            }}
          />

          <Button onClick={handleAddHabit}>
            <FaPlus />
            Add
          </Button>

        </div>

      </Card>

      <div className="space-y-4">

        {habits.length === 0 ? (

          <Card className="p-10 text-center">

            <FaBullseye className="mx-auto text-5xl text-cyan-400" />

            <h3 className="mt-6 text-2xl font-bold">
              No Habits Yet
            </h3>

            <p className="mt-3 text-slate-400">
              Build your future one habit at a time.
              Create your first habit to begin your journey.
            </p>

          </Card>

        ) : (

          habits.map((habit) => (

            <Card
              key={habit.id}
              className="p-6"
            >

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-2xl font-bold">
                    {habit.name}
                  </h2>

                  <p className="mt-2 text-orange-400">
                    🔥 Streak: {habit.streak} day(s)
                  </p>

                </div>

                <div className="flex gap-3">
                                  <Button
                    onClick={() => toggleHabit(habit.id)}
                    variant={
                      habit.completedToday
                        ? "primary"
                        : "secondary"
                    }
                  >
                    <FaCheckCircle />

                    {habit.completedToday
                      ? "Completed"
                      : "Complete"}
                  </Button>

                  <Button
                    variant="danger"
                    onClick={() => deleteHabit(habit.id)}
                  >
                    Delete
                  </Button>

                </div>

              </div>

            </Card>

          ))

        )}

      </div>

    </div>
  );
}