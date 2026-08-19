// ==========================================
// LifeOS XP Award Engine
// Version: 1.0
// ==========================================

import type { ExecutionType } from "../shared/execution";

import { XP_REWARDS } from "../shared/xp";

export class XPAwardEngine {
  static getXP(
    type: ExecutionType
  ): number {
    switch (type) {
      case "task_completed":
  return XP_REWARDS.TASK;

case "weekly_completed":
  return XP_REWARDS.WEEKLY_TARGET;

case "monthly_completed":
  return XP_REWARDS.MONTHLY_TARGET;

case "life_goal_completed":
  return XP_REWARDS.LIFE_GOAL;

default:
  return 0;}
  }
}