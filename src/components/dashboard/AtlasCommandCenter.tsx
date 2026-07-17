import AtlasGreeting from "./AtlasGreeting";
import AtlasBriefing from "./AtlasBriefing";
import AtlasPrediction from "./AtlasPrediction";
import AtlasTrend from "./AtlasTrend";
import AtlasXP from "./AtlasXP";
import AtlasMission from "./AtlasMission";
import AtlasRecommendations from "./AtlasRecommendations";
import AtlasStats from "./AtlasStats";

import { AtlasEngine } from "../../atlas/atlasEngine";
import { useApp } from "../../context/AppContext";

export default function AtlasCommandCenter() {
  const { tasks, habits, completedTasks } = useApp();

  const atlas = new AtlasEngine(tasks, habits);
  const ai = atlas.run();

  return (
    <div className="space-y-8">

      <AtlasGreeting
        greeting={ai.greeting}
        motivation={ai.motivation}
      />

      <AtlasStats
        productivity={ai.analysis.completionRate}
        completed={completedTasks}
        total={tasks.length}
        remaining={tasks.length - completedTasks}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <AtlasBriefing
          summary={ai.briefing.summary}
          recommendation={ai.briefing.recommendation}
        />

        <AtlasXP
          xp={ai.xp.xp}
          level={ai.xp.level}
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <AtlasMission
          missions={ai.missions}
        />

        <AtlasPrediction
          successChance={ai.prediction.successChance}
          burnoutRisk={ai.prediction.burnoutRisk}
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <AtlasTrend
          trend={ai.trend}
          averageCompletion={ai.averageCompletion}
        />

        <AtlasRecommendations
          recommendations={ai.recommendations}
        />

      </div>

    </div>
  );
}