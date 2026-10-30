import {
  FaArrowRight,
  FaCalendarCheck,
  FaCheck,
  FaClock,
  FaListCheck,
  FaLocationDot,
} from "react-icons/fa6";

import type { Task } from "../../shared/types";
import type { ExternalCalendarEvent, GoogleCalendarConnectionState } from "../../connectors/googleCalendar/types";

interface DayPanelProps {
  selectedDate: Date;
  tasks: Task[];
  externalEvents: readonly ExternalCalendarEvent[];
  externalConnection: GoogleCalendarConnectionState;
  onOpenTasks: () => void;
}

type TaskDateStatus = "overdue" | "today" | "upcoming" | "completed";

const STATUS_STYLES: Readonly<
  Record<TaskDateStatus, { label: string; className: string }>
> = {
  overdue: {
    label: "Overdue",
    className: "border-lifeos-danger/20 bg-lifeos-danger/10 text-lifeos-danger",
  },
  today: {
    label: "Due today",
    className: "border-lifeos-accent/20 bg-lifeos-accent/10 text-lifeos-accent",
  },
  upcoming: {
    label: "Upcoming",
    className: "border-lifeos-chart-secondary/20 bg-lifeos-chart-secondary/10 text-lifeos-chart-secondary",
  },
  completed: {
    label: "Completed",
    className: "border-lifeos-success/20 bg-lifeos-success/10 text-lifeos-success",
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
  externalEvents,
  externalConnection,
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
  const eventTime = (event: ExternalCalendarEvent) => event.start.kind === "date"
    ? "All day"
    : new Date(event.start.dateTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <aside className="self-start rounded-[var(--lifeos-radius-surface)] border border-lifeos-border bg-lifeos-surface/75 p-5 xl:sticky xl:top-0">
      <div className="flex items-start justify-between gap-4 border-b border-lifeos-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-accent">
              Selected day
            </p>
            {isToday && (
              <span className="rounded-md bg-lifeos-accent px-1.5 py-0.5 text-[11px] font-bold uppercase text-lifeos-accent-foreground">
                Today
              </span>
            )}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-lifeos-text">{fullDate}</h2>
          <p className="mt-2 text-xs text-lifeos-muted">
            {tasks.length === 0
              ? "No tasks due"
              : `${openTaskCount} open · ${tasks.length} total`}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lifeos-accent/10 text-lifeos-accent">
          <FaCalendarCheck />
        </div>
      </div>

      <div className="mt-5 border-b border-lifeos-border pb-5">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-lifeos-text">Google Calendar</h3><span className="text-[11px] font-bold uppercase tracking-wider text-lifeos-accent">External · read-only</span></div>
        {externalConnection !== "connected" ? <p className="mt-3 text-xs text-lifeos-muted">Connect Google Calendar in Settings to see external events.</p>
          : externalEvents.length === 0 ? <p className="mt-3 text-xs text-lifeos-muted">No Google events for this day.</p>
          : <div className="mt-3 space-y-2">{externalEvents.map((event) => <article key={`${event.calendarId}:${event.externalId}`} className="rounded-xl border border-lifeos-accent/15 bg-lifeos-accent/5 p-3">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-lifeos-text">{event.title}</p><p className="mt-1 text-xs text-lifeos-accent">{eventTime(event)} · {event.calendarName}</p></div><span className="shrink-0 rounded-md bg-lifeos-accent/10 px-2 py-1 text-[11px] font-bold uppercase text-lifeos-accent">Google</span></div>
              {event.location && <p className="mt-2 flex items-center gap-2 truncate text-xs text-lifeos-muted"><FaLocationDot />{event.location}</p>}
            </article>)}</div>}
      </div>

      <div className="mt-5 space-y-3">
        {orderedTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-lifeos-border bg-lifeos-app/30 px-5 py-8 text-center">
            <FaClock className="mx-auto text-xl text-lifeos-muted" />
            <h3 className="mt-3 text-sm font-bold text-lifeos-text-secondary">
              No tasks for this day
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-lifeos-muted">
              Choose another date or open Tasks to plan the next concrete action.
            </p>
            <button
              type="button"
              onClick={onOpenTasks}
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-lifeos-accent transition hover:text-lifeos-accent"
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
                className="rounded-2xl border border-lifeos-border bg-lifeos-app/45 p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      task.completed
                        ? "bg-lifeos-success/10 text-lifeos-success"
                        : "bg-lifeos-elevated text-lifeos-text-secondary"
                    }`}
                  >
                    {task.completed ? <FaCheck /> : <FaListCheck />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`truncate text-sm font-bold ${
                        task.completed
                          ? "text-lifeos-muted line-through"
                          : "text-lifeos-text"
                      }`}
                      title={task.title}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p
                        className="mt-1 truncate text-xs text-lifeos-muted"
                        title={task.description}
                      >
                        {task.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ${
                          statusStyle.className
                        }`}
                      >
                        {statusStyle.label}
                      </span>
                      <span className="text-[11px] capitalize text-lifeos-muted">
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
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-lifeos-border bg-lifeos-app/40 px-4 py-2.5 text-xs font-bold text-lifeos-text-secondary transition hover:border-lifeos-accent/25 hover:text-lifeos-accent"
        >
          Manage in Tasks
          <FaArrowRight />
        </button>
      )}
    </aside>
  );
}
