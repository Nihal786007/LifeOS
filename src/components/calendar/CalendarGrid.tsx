import DayCell from "./DayCell";
import { generateMonth } from "../../calendar/calendar";

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export default function CalendarGrid({
  currentDate,
  selectedDate,
  onSelectDate,
}: CalendarGridProps) {
  const days = generateMonth(currentDate);

  return (
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
          onClick={() => onSelectDate(day.date)}
        />
      ))}
    </div>
  );
}