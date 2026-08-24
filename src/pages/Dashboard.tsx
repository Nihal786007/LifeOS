import HeroSection from "../components/dashboard/HeroSection";
import PerformanceOverview from "../components/dashboard/PerformanceOverview";
import AtlasCommandCenter from "../components/dashboard/AtlasCommandCenter";
import AtlasPulse from "../components/dashboard/AtlasPulse";

import RecentCaptures from "../components/capture/RecentCaptures";

import { AtlasEngine } from "../atlas/atlasEngine";

import { useApp } from "../context/AppContext";
import { useTasks } from "../context/TaskContext";

export default function Dashboard() {
  // ==========================================
  // Legacy App State
  // ==========================================
  // Profile and habits remain here temporarily
  // until their dedicated systems are migrated.
  // ==========================================

  const {
    habits,
    profile,
  } = useApp();

  // ==========================================
  // Universal Task State
  // ==========================================

  const {
    tasks,
  } = useTasks();

  // ==========================================
  // ATLAS
  // ==========================================
  // ATLAS now receives the same task state used
  // by Planning, Tasks, Calendar and Analytics.
  // ==========================================

  const atlas =
    new AtlasEngine(
      tasks,
      habits
    );

  const atlasData =
    atlas.run();

  return (
    <div className="space-y-8">
      {/* Hero */}

      <HeroSection
        name={profile.name}
        atlas={atlasData}
      />

      {/* Performance Overview */}

      <PerformanceOverview
        atlas={atlasData}
      />

      {/* Dashboard Content */}

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <AtlasCommandCenter
            atlas={atlasData}
          />

          <RecentCaptures />
        </div>

        <AtlasPulse
          atlas={atlasData}
        />
      </div>
    </div>
  );
}