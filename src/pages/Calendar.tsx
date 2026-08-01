
import { useMemo, useState } from "react";


import { useApp } from "../context/AppContext";

import CalendarGrid from "../components/calendar/CalendarGrid";
import CalendarHeader from "../components/calendar/CalendarHeader";
import DayPanel from "../components/calendar/DayPanel";

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Calendar() {
  const { tasks } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  function previousMonth() {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      )
    );
  }

  function nextMonth() {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
      )
    );
  }

  const selectedDateString = formatLocalDate(selectedDate);

  const tasksForSelectedDate = useMemo(() => {
    return tasks.filter(
      (task) => task.dueDate === selectedDateString
    );
  }, [tasks, selectedDateString]);

  return (
    <div className="space-y-8">
      <CalendarHeader
        currentDate={currentDate}
        onPreviousMonth={previousMonth}
        onNextMonth={nextMonth}
      />
      


<div className="grid gap-8 xl:grid-cols-[2fr_1fr]">

</div>

      <div className="grid gap-8 xl:grid-cols-[2fr_1fr]">
        <CalendarGrid
  currentDate={currentDate}
  selectedDate={selectedDate}
  onSelectDate={setSelectedDate}
  tasks={tasks}
/>

        <DayPanel
          selectedDate={selectedDate}
          tasks={tasksForSelectedDate}
        />
      </div>
    </div>
  );
}