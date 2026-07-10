import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function Habits() {
  const {
    habits,
    addHabit,
    toggleHabit,
    deleteHabit,
  } = useApp();

  const [newHabit, setNewHabit] = useState("");

  function handleAddHabit() {
    addHabit(newHabit);
    setNewHabit("");
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold">
          🔥 Habit Tracker
        </h1>

        <p className="mt-2 text-slate-400">
          Build consistency one day at a time.
        </p>
      </div>

      {/* Add Habit */}
      <div className="rounded-2xl bg-slate-900 p-6">

        <div className="flex gap-4">

          <input
            type="text"
            value={newHabit}
            onChange={(e) =>
              setNewHabit(e.target.value)
            }
            placeholder="Enter a new habit..."
            className="flex-1 rounded-xl bg-slate-800 p-3 outline-none"
          />

          <button
            onClick={handleAddHabit}
            className="rounded-xl bg-blue-600 px-6 py-3 font-bold hover:bg-blue-700"
          >
            Add
          </button>

        </div>

      </div>

      {/* Habits List */}

      <div className="space-y-4">

        {habits.length === 0 ? (
          <div className="rounded-2xl bg-slate-900 p-10 text-center text-slate-400">
            No habits yet. Create your first habit!
          </div>
        ) : (
          habits.map((habit) => (
            <div
              key={habit.id}
              className="rounded-2xl bg-slate-900 p-6 flex items-center justify-between"
            >
              <div>

                <h2 className="text-2xl font-bold">
                  {habit.name}
                </h2>

                <p className="text-orange-400 mt-2">
                  🔥 Streak: {habit.streak} day(s)
                </p>

              </div>

              <div className="flex gap-3">

                <button
                  onClick={() =>
                    toggleHabit(habit.id)
                  }
                  className={`rounded-xl px-5 py-2 font-bold ${
                    habit.completedToday
                      ? "bg-green-600"
                      : "bg-slate-700"
                  }`}
                >
                  {habit.completedToday
                    ? "Completed"
                    : "Complete"}
                </button>

                <button
                  onClick={() =>
                    deleteHabit(habit.id)
                  }
                  className="rounded-xl bg-red-600 px-5 py-2 font-bold hover:bg-red-700"
                >
                  Delete
                </button>

              </div>

            </div>
          ))
        )}

      </div>

    </div>
  );
}