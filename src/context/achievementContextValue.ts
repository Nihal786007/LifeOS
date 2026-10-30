import { createContext, useContext } from "react";
import type { Achievement } from "../shared/achievements";

export interface AchievementContextType {
  unlockedAchievements: Achievement[];

  unlockAchievement: (
    achievement: Achievement
  ) => void;

  isUnlocked: (
    achievementId: string
  ) => boolean;

  clearAchievements: () => void;
}

export const AchievementContext =
  createContext<
    AchievementContextType | null
  >(null);

export function useAchievements() {
  const context =
    useContext(
      AchievementContext
    );

  if (!context) {
    throw new Error(
      "useAchievements must be used inside AchievementProvider."
    );
  }

  return context;
}
