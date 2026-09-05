import {
  useMemo,
  useState,
} from "react";

import CalendarGrid from "../components/calendar/CalendarGrid";
import CalendarHeader from "../components/calendar/CalendarHeader";
import DayPanel from "../components/calendar/DayPanel";
import { useTasks } from "../context/TaskContext";

interface CalendarProps {
  onNavigate: (destination: "tasks") => void;
}

function formatLocalDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function Calendar({ onNavigate }: CalendarProps) {
  const { tasks } = useTasks();
  const initialDate = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(() =>
    startOfMonth(initialDate)
  );
  const [selectedDate, setSelectedDate] = useState(initialDate);

  function moveMonth(offset: number) {
    const nextMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + offset,
      1
    );

    setCurrentDate(nextMonth);
    setSelectedDate(nextMonth);
  }

  function selectDate(date: Date) {
    setSelectedDate(date);

    if (
      date.getMonth() !== currentDate.getMonth() ||
      date.getFullYear() !== currentDate.getFullYear()
    ) {
      setCurrentDate(startOfMonth(date));
    }
  }

  function goToToday() {
    const today = new Date();
    setCurrentDate(startOfMonth(today));
    setSelectedDate(today);
  }

  const selectedDateString = formatLocalDate(selectedDate);
  const tasksForSelectedDate = useMemo(
    () => tasks.filter((task) => task.dueDate === selectedDateString),
    [tasks, selectedDateString]
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-10">
      <CalendarHeader
        currentDate={currentDate}
        onPreviousMonth={() => moveMonth(-1)}
        onNextMonth={() => moveMonth(1)}
        onToday={goToToday}
        onOpenTasks={() => onNavigate("tasks")}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <CalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          tasks={tasks}
        />
        <DayPanel
          selectedDate={selectedDate}
          tasks={tasksForSelectedDate}
          onOpenTasks={() => onNavigate("tasks")}
        />
      </div>
    </div>
  );
}
