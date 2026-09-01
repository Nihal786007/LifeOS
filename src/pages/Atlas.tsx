import type {
  AtlasAIOrchestrator,
} from "../atlas/orchestration/AtlasAIOrchestrator";

import AtlasInteractionPage from "../components/atlas/AtlasInteractionPage";

interface AtlasPageProps {
  orchestrator: AtlasAIOrchestrator;
}

export default function Atlas({
  orchestrator,
}: AtlasPageProps) {
  return (
    <AtlasInteractionPage
      orchestrator={orchestrator}
    />
  );
}
