import HeroSection from "../components/dashboard/HeroSection";
import PerformanceOverview from "../components/dashboard/PerformanceOverview";
import AtlasCommandCenter from "../components/dashboard/AtlasCommandCenter";
import AtlasPulse from "../components/dashboard/AtlasPulse";

import { AtlasEngine } from "../atlas/atlasEngine";
import { useApp } from "../context/AppContext";

export default function Dashboard() {
 const {
  tasks,
  habits,
  completedTasks,
  profile,
} = useApp();

  const atlas = new AtlasEngine(tasks, habits);
  const atlasData = atlas.run();

  const productivity = atlasData.analysis.completionRate;

  const remainingTasks = Math.max(
    tasks.length - completedTasks,
    0
  );

  return (
    <div className="space-y-8">

      {/* Hero */}
      <HeroSection name={profile.name} />

      {/* Performance Overview */}
      <PerformanceOverview
        total={tasks.length}
        completed={completedTasks}
        productivity={productivity}
        remaining={remainingTasks}
      />

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Main ATLAS Section */}
        <div className="xl:col-span-2">
          <AtlasCommandCenter />
        </div>

        {/* Mission Pulse */}
        <AtlasPulse
          productivity={productivity}
          focus={
            atlasData.missions.length > 0
              ? atlasData.missions[0].title
              : "No Active Mission"
          }
          missions={remainingTasks}
        />

      </div>

    </div>
  );
}