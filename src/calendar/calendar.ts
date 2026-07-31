export interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function generateMonth(date: Date): CalendarDay[] {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();

  const days: CalendarDay[] = [];

  const today = new Date();

  // Previous month's trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    days.push({
      date: new Date(year, month - 1, d),
      day: d,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const current = new Date(year, month, d);

    days.push({
      date: current,
      day: d,
      isCurrentMonth: true,
      isToday:
        current.toDateString() === today.toDateString(),
    });
  }

  // Fill remaining cells (42 total)
  while (days.length < 42) {
    const d = days.length - (startWeekday + daysInMonth) + 1;

    days.push({
      date: new Date(year, month + 1, d),
      day: d,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  return days;
}