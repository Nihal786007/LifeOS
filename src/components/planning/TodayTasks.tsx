import { useMemo, useState } from "react";

import { useTasks } from "../../context/TaskContext";

import Button from "../ui/Button";

import TaskModal from "./TaskModal";
import TaskCard from "./TaskCard";
import TaskEmptyState from "./TaskEmptyState";

export default function TodayTasks() {
  const { tasks } = useTasks();

  const [open, setOpen] =
    useState(false);

  const today =
    new Date().toISOString().split("T")[0];

  const todayTasks = useMemo(
  () =>
    tasks.filter(
      (task) =>
        task.dueDate === today
    ),
  [tasks, today]
);

  const completed =
    todayTasks.filter(
      (task) => task.completed
    ).length;

  return (
    <section className="space-y-8">

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-3xl font-bold text-white">
            ✅ Today's Tasks
          </h2>

          <p className="mt-2 text-slate-400">
            Focus only on what matters today.
          </p>

        </div>

        <Button
          onClick={() =>
            setOpen(true)
          }
        >
          + Add Task
        </Button>

      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

        <div className="flex items-center justify-between">

          <h3 className="text-xl font-semibold text-white">
            Progress
          </h3>

          <span className="text-cyan-400 font-semibold">
            {completed} / {todayTasks.length}
          </span>

        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">

          <div
            className="h-full rounded-full bg-cyan-500 transition-all"
            style={{
              width:
                todayTasks.length === 0
                  ? "0%"
                  : `${
                      (completed /
                        todayTasks.length) *
                      100
                    }%`,
            }}
          />

        </div>

      </div>

      {todayTasks.length === 0 ? (

        <TaskEmptyState
          onAdd={() =>
            setOpen(true)
          }
        />

      ) : (

        <div className="space-y-4">

          {todayTasks.map((task) => (

            <TaskCard
              key={task.id}
              id={task.id}
            />

          ))}

        </div>

      )}

      <TaskModal
        open={open}
        onClose={() =>
          setOpen(false)
        }
      />

    </section>
  );
}