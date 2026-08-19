// ==========================================
// LifeOS XP Models
// Version: 1.0
// ==========================================

// XP Rewards
export const XP_REWARDS = {
  TASK: 25,
  WEEKLY_TARGET: 100,
  MONTHLY_TARGET: 300,
  LIFE_GOAL: 1000,
} as const;

// Leveling
export const XP_PER_LEVEL = 1000;

// ==========================================
// XP Record
// ==========================================

export interface XPRecord {
  id: number;

  amount: number;

  reason: string;

  createdAt: string;
}

// ==========================================
// XP State
// ==========================================

export interface XPState {
  totalXP: number;

  currentLevel: number;

  records: XPRecord[];
}