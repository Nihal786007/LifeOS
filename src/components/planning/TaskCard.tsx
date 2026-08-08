import {
  FaCheckCircle,
  FaTrash,
  FaCalendarAlt,
  FaFlag,
} from "react-icons/fa";

import { useTasks } from "../../context/TaskContext";
import { useWeeklyPlanning } from "../../context/WeeklyPlanningContext";

import Button from "../ui/Button";
import Card from "../ui/Card";

interface Props {
  id: number;
}

export default function TaskCard({
  id,
}: Props) {
  const {
    tasks,
    toggleTask,
    deleteTask,
  } = useTasks();

  const { weeklyTargets } =
    useWeeklyPlanning();

  const task = tasks.find(
    (t) => t.id === id
  );

  if (!task) return null;

  const weeklyTarget =
    weeklyTargets.find(
      (w) =>
        w.id === task.weeklyTargetId
    );

  const priorityColor = {
    low: "text-green-400",
    medium: "text-yellow-400",
    high: "text-red-400",
  };

  return (
    <Card>

      <div className="flex items-start justify-between">

        <div>

          <h3 className="text-xl font-bold text-white">
            {task.title}
          </h3>

          {weeklyTarget && (

            <p className="mt-2 text-cyan-400">
              📆 {weeklyTarget.title}
            </p>

          )}

          <div className="mt-3 flex items-center gap-2">

            <FaFlag
              className={
                priorityColor[
                  task.priority
                ]
              }
            />

            <span
              className={
                priorityColor[
                  task.priority
                ]
              }
            >
              {task.priority
                .charAt(0)
                .toUpperCase() +
                task.priority.slice(1)}
            </span>

          </div>

        </div>

        <button
          onClick={() => {
            if (
              window.confirm(
                `Delete "${task.title}"?`
              )
            ) {
              deleteTask(task.id);
            }
          }}
          className="rounded-xl p-3 text-red-400 transition hover:bg-red-500/10"
        >
          <FaTrash />
        </button>

      </div>

      <div className="mt-6 flex items-center justify-between">

        <div>

          <div className="flex items-center gap-2 text-sm text-slate-400">

            <FaCalendarAlt />

            <span>
              Created{" "}
              {new Date(
                task.createdAt
              ).toLocaleDateString()}
            </span>

          </div>

          {task.completedAt && (

            <div className="mt-2 flex items-center gap-2 text-sm text-green-400">

              <FaCheckCircle />

              <span>
                Completed{" "}
                {new Date(
                  task.completedAt
                ).toLocaleDateString()}
              </span>

            </div>

          )}

        </div>

        <Button
          variant={
            task.completed
              ? "secondary"
              : "primary"
          }
          onClick={() =>
            toggleTask(task.id)
          }
        >
          {task.completed
            ? "✅ Completed"
            : "Mark Complete"}
        </Button>

      </div>

    </Card>
  );
}