import { useState } from "react";
import { useApp } from "../context/AppContext";

function Tasks() {
  const [task, setTask] = useState("");

  const {
    tasks,
    addTask,
    deleteTask,
    toggleTask,
    completedTasks,
  } = useApp();

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-4xl font-bold">✅ Task Manager</h1>

        <p className="text-slate-400 mt-2">
          Organize your day efficiently.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">

        <div className="rounded-2xl bg-slate-900 p-6">
          <p>Total Tasks</p>
          <h2 className="text-4xl font-bold mt-2">
            {tasks.length}
          </h2>
        </div>

        <div className="rounded-2xl bg-slate-900 p-6">
          <p>Completed</p>
          <h2 className="text-4xl font-bold mt-2">
            {completedTasks}
          </h2>
        </div>

        <div className="rounded-2xl bg-slate-900 p-6">
          <p>Remaining</p>
          <h2 className="text-4xl font-bold mt-2">
            {tasks.length - completedTasks}
          </h2>
        </div>

      </div>

      <div className="flex gap-4">

        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addTask(task);
              setTask("");
            }
          }}
          placeholder="Enter a task..."
          className="flex-1 rounded-xl bg-slate-900 p-4 outline-none"
        />

        <button
          onClick={() => {
            addTask(task);
            setTask("");
          }}
          className="rounded-xl bg-blue-600 px-6 font-semibold hover:bg-blue-700"
        >
          Add
        </button>

      </div>

      <div className="space-y-3">

        {tasks.length === 0 && (
          <p className="text-slate-500">
            No tasks yet.
          </p>
        )}

        {tasks.map((item) => (

          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl bg-slate-900 p-4"
          >

            <div
              onClick={() => toggleTask(item.id)}
              className="cursor-pointer flex items-center gap-3"
            >
              <span className="text-2xl">
                {item.completed ? "✅" : "⬜"}
              </span>

              <span
                className={
                  item.completed
                    ? "line-through text-slate-500"
                    : ""
                }
              >
                {item.text}
              </span>

            </div>

            <button
              onClick={() => deleteTask(item.id)}
              className="rounded-lg bg-red-500 px-3 py-2 hover:bg-red-600"
            >
              Delete
            </button>

          </div>

        ))}

      </div>

    </div>
  );
}

export default Tasks;