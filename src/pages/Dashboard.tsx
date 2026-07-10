import StatCard from "../components/StatCard";
import ProductivityChart from "../components/ProductivityChart";
import MissionCard from "../components/MissionCard";
import AICard from "../components/AICard";
import { useApp } from "../context/AppContext";

import {
  FaTasks,
  FaBullseye,
  FaChartLine,
  FaFire,
} from "react-icons/fa";

export default function Dashboard() {
  const { tasks, completedTasks } = useApp();

  const productivity =
    tasks.length === 0
      ? 0
      : Math.round((completedTasks / tasks.length) * 100);

  const remainingTasks = Math.max(tasks.length - completedTasks, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-4xl font-bold">
          👋 Good Afternoon, Commander
        </h1>

        <p className="text-slate-400 mt-2">
          Welcome back to LifeOS Mission Control.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Tasks"
          value={tasks.length}
          icon={<FaTasks />}
          color="text-blue-400"
        />

        <StatCard
          title="Completed"
          value={completedTasks}
          icon={<FaBullseye />}
          color="text-green-400"
        />

        <StatCard
          title="Productivity"
          value={`${productivity}%`}
          icon={<FaChartLine />}
          color="text-cyan-400"
        />

        <StatCard
          title="Remaining"
          value={remainingTasks}
          icon={<FaFire />}
          color="text-orange-400"
        />
      </div>

      {/* Productivity Graph */}
      <ProductivityChart />

      {/* Bottom Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <AICard />
        </div>

        <MissionCard />
      </div>
    </div>
  );
}