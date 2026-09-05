import {
  FaArrowRight,
  FaCalendarCheck,
  FaCheck,
  FaClock,
  FaListCheck,
} from "react-icons/fa6";

import type { Task } from "../../shared/types";

interface DayPanelProps {
  selectedDate: Date;
  tasks: Task[];
  onOpenTasks: () => void;
}

type TaskDateStatus = "overdue" | "today" | "upcoming" | "completed";

const STATUS_STYLES: Readonly<
  Record<TaskDateStatus, { label: string; className: string }>
> = {
  overdue: {
    label: "Overdue",
    className: "border-red-400/20 bg-red-400/10 text-red-300",
  },
  today: {
    label: "Due today",
    className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  },
  upcoming: {
    label: "Upcoming",
    className: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  },
  completed: {
    label: "Completed",
    className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  },
};

const PRIORITY_ORDER: Readonly<Record<Task["priority"], number>> = {
  high: 0,
  medium: 1,
  low: 2,
};

function formatLocalDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getTaskStatus(task: Task, selectedDate: Date): TaskDateStatus {
  if (task.completed) {
    return "completed";
  }

  const selected = formatLocalDate(selectedDate);
  const today = formatLocalDate(new Date());

  if (selected < today) {
    return "overdue";
  }

  if (selected === today) {
    return "today";
  }

  return "upcoming";
}

export default function DayPanel({
  selectedDate,
  tasks,
  onOpenTasks,
}: DayPanelProps) {
  const fullDate = selectedDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isToday = formatLocalDate(selectedDate) === formatLocalDate(new Date());
  const orderedTasks = [...tasks].sort((first, second) => {
    if (first.completed !== second.completed) {
      return first.completed ? 1 : -1;
    }

    const priorityDifference =
      PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority];

    return priorityDifference || first.title.localeCompare(second.title);
  });

  const openTaskCount = tasks.filter((task) => !task.completed).length;

  return (
    <aside className="self-start rounded-[1.75rem] border border-slate-800 bg-slate-900/75 p-5 xl:sticky xl:top-0">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Selected day
            </p>
            {isToday && (
              <span className="rounded-md bg-cyan-300 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-950">
                Today
              </span>
            )}
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">{fullDate}</h2>
          <p className="mt-2 text-xs text-slate-500">
            {tasks.length === 0
              ? "No tasks due"
              : `${openTaskCount} open · ${tasks.length} total`}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
          <FaCalendarCheck />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {orderedTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 px-5 py-8 text-center">
            <FaClock className="mx-auto text-xl text-slate-600" />
            <h3 className="mt-3 text-sm font-bold text-slate-300">
              No tasks for this day
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-600">
              Choose another date or open Tasks to plan the next concrete action.
            </p>
            <button
              type="button"
              onClick={onOpenTasks}
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-cyan-300 transition hover:text-cyan-200"
            >
              Open Tasks
              <FaArrowRight />
            </button>
          </div>
        ) : (
          orderedTasks.map((task) => {
            const status = getTaskStatus(task, selectedDate);
            const statusStyle = STATUS_STYLES[status];

            return (
              <article
                key={task.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      task.completed
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {task.completed ? <FaCheck /> : <FaListCheck />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`truncate text-sm font-bold ${
                        task.completed
                          ? "text-slate-500 line-through"
                          : "text-slate-200"
                      }`}
                      title={task.title}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p
                        className="mt-1 truncate text-xs text-slate-600"
                        title={task.description}
                      >
                        {task.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase ${
                          statusStyle.className
                        }`}
                      >
                        {statusStyle.label}
                      </span>
                      <span className="text-[10px] capitalize text-slate-600">
                        {task.priority} priority
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {orderedTasks.length > 0 && (
        <button
          type="button"
          onClick={onOpenTasks}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:border-cyan-400/25 hover:text-cyan-200"
        >
          Manage in Tasks
          <FaArrowRight />
        </button>
      )}
    </aside>
  );
}
