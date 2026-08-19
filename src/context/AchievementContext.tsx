// ==========================================
// LifeOS Achievement Context
// Version: 1.0
// ==========================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import type {
  Achievement,
} from "../shared/achievements";

interface AchievementContextType {
  unlockedAchievements: Achievement[];

  unlockAchievement: (
    achievement: Achievement
  ) => void;

  isUnlocked: (
    achievementId: string
  ) => boolean;

  clearAchievements: () => void;
}

const AchievementContext =
  createContext<
    AchievementContextType | null
  >(null);

const STORAGE_KEY =
  "lifeos-achievements";

export function AchievementProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    unlockedAchievements,
    setUnlockedAchievements,
  ] = useState<Achievement[]>(() => {
    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!saved) return [];

    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        unlockedAchievements
      )
    );
  }, [unlockedAchievements]);

  function unlockAchievement(
    achievement: Achievement
  ) {
    setUnlockedAchievements(
      (previous) => {
        const alreadyUnlocked =
          previous.some(
            (item) =>
              item.id === achievement.id
          );

        if (alreadyUnlocked) {
          return previous;
        }

        return [
          ...previous,
          achievement,
        ];
      }
    );
  }

  function isUnlocked(
    achievementId: string
  ) {
    return unlockedAchievements.some(
      (achievement) =>
        achievement.id ===
        achievementId
    );
  }

  function clearAchievements() {
    setUnlockedAchievements([]);
  }

  return (
    <AchievementContext.Provider
      value={{
        unlockedAchievements,
        unlockAchievement,
        isUnlocked,
        clearAchievements,
      }}
    >
      {children}
    </AchievementContext.Provider>
  );
}

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