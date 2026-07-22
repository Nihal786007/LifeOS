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
    profile,
  } = useApp();

  const atlas = new AtlasEngine(tasks, habits);
  const atlasData = atlas.run();

  return (
    <div className="space-y-8">
      {/* Hero */}
     <HeroSection
  name={profile.name}
  atlas={atlasData}
/>

      {/* Performance Overview */}
      <PerformanceOverview atlas={atlasData} />

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main ATLAS Section */}
        <div className="xl:col-span-2">
          <AtlasCommandCenter atlas={atlasData} />
        </div>

        {/* Mission Pulse */}
        <AtlasPulse atlas={atlasData} />
      </div>
    </div>
  );
}