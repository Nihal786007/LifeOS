import { useEffect, useState } from "react";

function MonthlyTracker() {
  const [goal, setGoal] = useState("");

  const [goals, setGoals] = useState<string[]>(() => {
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

    setGoals([...goals, goal]);
    setGoal("");
  }

  function deleteGoal(index: number) {
    setGoals(goals.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-4xl font-bold">
          📅 Monthly Planner
        </h1>

        <p className="mt-2 text-slate-400">
          Plan your month and achieve your goals.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">

        {/* Calendar Placeholder */}
        <div className="rounded-2xl bg-slate-900 p-6 shadow-lg">

          <h2 className="mb-4 text-2xl font-bold">
            July 2026
          </h2>

          <div className="grid grid-cols-7 gap-2 text-center">

            {["Mo","Tu","We","Th","Fr","Sa","Su"].map(day => (
              <div
                key={day}
                className="font-bold text-slate-400"
              >
                {day}
              </div>
            ))}

            {Array.from({ length: 31 }, (_, i) => (
              <div
                key={i}
                className="rounded-lg bg-slate-800 p-3 hover:bg-blue-600 cursor-pointer transition"
              >
                {i + 1}
              </div>
            ))}

          </div>

        </div>

        {/* Goals */}
        <div className="rounded-2xl bg-slate-900 p-6 shadow-lg">

          <h2 className="text-2xl font-bold mb-4">
            🎯 Monthly Goals
          </h2>

          <div className="flex gap-3">

            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="New Goal..."
              className="flex-1 rounded-xl bg-slate-800 p-3 outline-none"
            />

            <button
              onClick={addGoal}
              className="rounded-xl bg-blue-600 px-5 hover:bg-blue-700"
            >
              Add
            </button>

          </div>

          <div className="mt-6 space-y-3">

            {goals.length === 0 && (
              <p className="text-slate-500">
                No goals added.
              </p>
            )}

            {goals.map((goal, index) => (

              <div
                key={index}
                className="flex items-center justify-between rounded-xl bg-slate-800 p-4"
              >

                <span>🎯 {goal}</span>

                <button
                  onClick={() => deleteGoal(index)}
                  className="rounded-lg bg-red-500 px-3 py-2 hover:bg-red-600"
                >
                  Delete
                </button>

              </div>

            ))}

          </div>

        </div>

      </div>

    </div>
  );
}

export default MonthlyTracker;