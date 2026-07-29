import type { AtlasResult } from "../../atlas/types";

import AtlasGreeting from "./AtlasGreeting";
import AtlasBriefing from "./AtlasBriefing";
import AtlasPrediction from "./AtlasPrediction";
import AtlasTrend from "./AtlasTrend";
import AtlasXP from "./AtlasXP";
import AtlasMission from "./AtlasMission";
import AtlasRecommendations from "./AtlasRecommendations";
import AtlasStats from "./AtlasStats";

interface Props {
  atlas: AtlasResult;
}

export default function AtlasCommandCenter({ atlas }: Props) {
  return (
    <div className="space-y-8">

      <AtlasGreeting
        greeting={atlas.greeting}
        motivation={atlas.motivation}
      />

    <AtlasStats atlas={atlas} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      <AtlasBriefing briefing={atlas.briefing} />

        <AtlasXP
          xp={atlas.xp.xp}
          level={atlas.xp.level}
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <AtlasMission
          missions={atlas.missions}
        />

        <AtlasPrediction
          successChance={atlas.prediction.successChance}
          burnoutRisk={atlas.prediction.burnoutRisk}
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <AtlasTrend
          trend={atlas.trend}
          averageCompletion={atlas.averageCompletion}
        />

        <AtlasRecommendations
          recommendations={atlas.recommendations}
        />

      </div>

    </div>
  );
}