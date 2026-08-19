// ==========================================
// LifeOS Achievement Definitions
// Version: 1.0
// ==========================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-task",
    title: "First Step",
    description: "Complete your first task.",
    icon: "🎯",
    xpReward: 20,
  },

  {
    id: "ten-tasks",
    title: "Getting Started",
    description: "Complete 10 tasks.",
    icon: "🔥",
    xpReward: 40,
  },

  {
    id: "first-weekly",
    title: "Weekly Warrior",
    description: "Complete your first weekly target.",
    icon: "📅",
    xpReward: 50,
  },

  {
    id: "first-monthly",
    title: "Monthly Master",
    description: "Complete your first monthly target.",
    icon: "🚀",
    xpReward: 75,
  },

  {
    id: "first-life-goal",
    title: "Dream Chaser",
    description: "Complete your first life goal.",
    icon: "🏆",
    xpReward: 100,
  },

  {
    id: "level-5",
    title: "Rising Star",
    description: "Reach Level 5.",
    icon: "⭐",
    xpReward: 100,
  },

  {
    id: "level-10",
    title: "Life Strategist",
    description: "Reach Level 10.",
    icon: "💎",
    xpReward: 200,
  }
];
// ==========================================
// Achievement Lookup
// ==========================================

export const ACHIEVEMENTS_BY_ID =
  Object.fromEntries(
    ACHIEVEMENTS.map((achievement) => [
      achievement.id,
      achievement,
    ])
  ) as Record<string, Achievement>;