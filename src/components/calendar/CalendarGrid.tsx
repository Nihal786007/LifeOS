import DayCell from "./DayCell";
import { generateMonth } from "../../calendar/calendar";

import type { Task } from "../../shared/types";

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: Task[];
}

const weekDays = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

export default function CalendarGrid({
  currentDate,
  selectedDate,
  onSelectDate,
  tasks,
}: CalendarGridProps) {
  const days = generateMonth(currentDate);
  function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

  return (
    <div className="space-y-4">

      {/* Weekday Header */}

      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-bold uppercase tracking-[0.25em] text-cyan-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar */}

      <div className="grid grid-cols-7 gap-4">
        {days.map((day) => (
          <DayCell
  key={day.date.toISOString()}
  day={day.day}
  isCurrentMonth={day.isCurrentMonth}
  isToday={day.isToday}
  isSelected={
    day.date.toDateString() ===
    selectedDate.toDateString()
  }
  hasTasks={tasks.some(
    (task) =>
      task.dueDate === formatLocalDate(day.date)
  )}
  onClick={() => onSelectDate(day.date)}
/>
        ))}
      </div>

    </div>
  );
}