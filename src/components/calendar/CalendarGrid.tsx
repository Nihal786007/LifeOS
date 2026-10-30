import { generateMonth } from "../../calendar/calendar";
import type { Task } from "../../shared/types";
import type { ExternalCalendarEvent } from "../../connectors/googleCalendar/types";
import { eventOccursOnLocalDate } from "../../connectors/googleCalendar/mapping";

import DayCell from "./DayCell";
import type { CalendarTaskStatus } from "./DayCell";

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: Task[];
  externalEvents: readonly ExternalCalendarEvent[];
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function formatLocalDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getTaskStatus(
  tasks: Task[],
  date: Date,
  today: string
): CalendarTaskStatus {
  if (tasks.length === 0) {
    return "none";
  }

  const completed = tasks.filter((task) => task.completed).length;

  if (completed === tasks.length) {
    return "completed";
  }

  if (formatLocalDate(date) < today) {
    return "overdue";
  }

  if (completed > 0) {
    return "mixed";
  }

  return "active";
}

export default function CalendarGrid({
  currentDate,
  selectedDate,
  onSelectDate,
  tasks,
  externalEvents,
}: CalendarGridProps) {
  const days = generateMonth(currentDate);
  const today = formatLocalDate(new Date());

  return (
    <section className="min-w-0 overflow-hidden rounded-[var(--lifeos-radius-surface)] border border-lifeos-border bg-lifeos-surface/55 p-2.5 sm:p-5">
      <div>
        <div>
          <div className="mb-1 grid grid-cols-7 gap-1 sm:mb-2 sm:gap-2">
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className="py-1.5 text-center text-[11px] font-bold uppercase tracking-normal text-lifeos-muted sm:py-2 sm:text-[11px] sm:tracking-[0.12em]"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((day) => {
              const dateKey = formatLocalDate(day.date);
              const dayTasks = tasks.filter((task) => task.dueDate === dateKey);
              const dayEvents = externalEvents.filter((event) => eventOccursOnLocalDate(event, dateKey));

              return (
                <DayCell
                  key={dateKey}
                  day={day.day}
                  isCurrentMonth={day.isCurrentMonth}
                  isToday={day.isToday}
                  isSelected={dateKey === formatLocalDate(selectedDate)}
                  taskCount={dayTasks.length}
                  taskStatus={getTaskStatus(dayTasks, day.date, today)}
                  externalEventCount={dayEvents.length}
                  onClick={() => onSelectDate(day.date)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-lifeos-border pt-4 text-[11px] text-lifeos-muted">
        <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-lifeos-danger" />Overdue</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-lifeos-accent" />Active</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-lifeos-warning" />Mixed</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-lifeos-success" />Completed</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-lifeos-accent" />Google event</span>
      </div>
    </section>
  );
}
