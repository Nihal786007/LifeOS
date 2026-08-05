import GoalsCard from "../components/planning/GoalsCard";
import MilestoneCard from "../components/planning/MilestoneCard";
import MonthlyPlanner from "../components/planning/MonthlyPlanner";
import WeeklyPlanner from "../components/planning/WeeklyPlanner";
import TodayTasks from "../components/planning/TodayTasks";
import HabitTracker from "../components/planning/HabitTracker";

export default function Planning() {
  return (
    <div className="space-y-8">

      {/* Header */}

      <div>
        <h1 className="text-4xl font-bold text-white">
          📖 Planning
        </h1>

        <p className="mt-2 text-slate-400">
          Turn your long-term goals into daily progress.
        </p>
      </div>

      <GoalsCard />

      <MilestoneCard />

      <MonthlyPlanner />

      <WeeklyPlanner />

      <TodayTasks />

      <HabitTracker />

    </div>
  );
}