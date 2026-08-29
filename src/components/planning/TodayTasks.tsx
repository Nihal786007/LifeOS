import {
  useMemo,
  useState,
} from "react";

import {
  useTasks,
} from "../../context/TaskContext";

import Button from "../ui/Button";

import TaskModal from "./TaskModal";
import TaskCard from "./TaskCard";
import TaskEmptyState from "./TaskEmptyState";

// ==========================================
// Date Helpers
// ==========================================

function pad2(
  value: number
) {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
}

function getTodayLocalDate() {
  const today =
    new Date();

  return `${today.getFullYear()}-${pad2(
    today.getMonth() + 1
  )}-${pad2(
    today.getDate()
  )}`;
}

// ==========================================
// Component
// ==========================================

export default function TodayTasks() {
  const {
    tasks,
  } = useTasks();

  const [
    open,
    setOpen,
  ] = useState(false);

  const today =
    getTodayLocalDate();

  const todayTasks =
    useMemo(
      () =>
        tasks.filter(
          (task) =>
            task.dueDate ===
            today
        ),
      [
        tasks,
        today,
      ]
    );

  const completed =
    todayTasks.filter(
      (task) =>
        task.completed
    ).length;

  return (
    <section className="space-y-8">

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-3xl font-bold text-white">
            ✅ Today&apos;s Tasks
          </h2>

          <p className="mt-2 text-slate-400">
            Focus only on what matters today.
          </p>

        </div>

        <Button
          onClick={() =>
            setOpen(
              true
            )
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

          <span className="font-semibold text-cyan-400">
            {completed} / {todayTasks.length}
          </span>

        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">

          <div
            className="h-full rounded-full bg-cyan-500 transition-all"
            style={{
              width:
                todayTasks.length ===
                0
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
            setOpen(
              true
            )
          }
        />

      ) : (

        <div className="space-y-4">

          {todayTasks.map(
            (task) => (

              <TaskCard
                key={
                  task.id
                }
                id={
                  task.id
                }
              />

            )
          )}

        </div>

      )}

      <TaskModal
        open={
          open
        }
        defaultDueDate={
          today
        }
        onClose={() =>
          setOpen(
            false
          )
        }
      />

    </section>
  );
}