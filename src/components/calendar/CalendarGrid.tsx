import { generateMonth } from "../../calendar/calendar";
import type { Task } from "../../shared/types";

import DayCell from "./DayCell";
import type { CalendarTaskStatus } from "./DayCell";

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: Task[];
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
}: CalendarGridProps) {
  const days = generateMonth(currentDate);
  const today = formatLocalDate(new Date());

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900/55 p-4 sm:p-5">
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="mb-2 grid grid-cols-7 gap-2">
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-600"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const dateKey = formatLocalDate(day.date);
              const dayTasks = tasks.filter((task) => task.dueDate === dateKey);

              return (
                <DayCell
                  key={dateKey}
                  day={day.day}
                  isCurrentMonth={day.isCurrentMonth}
                  isToday={day.isToday}
                  isSelected={dateKey === formatLocalDate(selectedDate)}
                  taskCount={dayTasks.length}
                  taskStatus={getTaskStatus(dayTasks, day.date, today)}
                  onClick={() => onSelectDate(day.date)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 pt-4 text-[10px] text-slate-500">
        <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-red-400" />Overdue</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-cyan-400" />Active</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-400" />Mixed</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400" />Completed</span>
      </div>
    </section>
  );
}
