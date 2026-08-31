// ==========================================
// LifeOS ATLAS Canonical State Hook
// ==========================================
//
// The React boundary that gathers ATLAS's trusted
// read models. ATLAS remains read-only: this hook
// does not expose any mutation capability.
// ==========================================

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useApp,
} from "../../context/AppContext";

import {
  useLifeGoals,
} from "../../context/LifeGoalsContext";

import {
  useMonthlyPlanning,
} from "../../context/MonthlyPlanningContext";

import {
  useTasks,
} from "../../context/TaskContext";

import {
  useWeeklyPlanning,
} from "../../context/WeeklyPlanningContext";

import {
  ExecutionHistoryService,
} from "../../services/ExecutionHistoryService";

import type {
  ExecutionRecord,
} from "../../shared/execution";

import {
  buildAtlasState,
} from "./buildAtlasState";

export function useAtlasCanonicalState() {
  const {
    habits,
    captures,
    profile,
  } = useApp();

  const {
    tasks,
  } = useTasks();

  const {
    lifeGoals,
  } = useLifeGoals();

  const {
    monthlyPlans,
  } = useMonthlyPlanning();

  const {
    weeklyTargets,
  } = useWeeklyPlanning();

  const [
    executionHistory,
    setExecutionHistory,
  ] = useState<ExecutionRecord[]>(
    () => ExecutionHistoryService.getAll()
  );

  useEffect(() => {
    return ExecutionHistoryService.subscribe(
      () => {
        setExecutionHistory(
          ExecutionHistoryService.getAll()
        );
      }
    );
  }, []);

  return useMemo(
    () =>
      buildAtlasState({
        tasks,
        habits,
        lifeGoals,
        monthlyTargets: monthlyPlans,
        weeklyTargets,
        executionHistory,
        captures,
        profile,
      }),
    [
      tasks,
      habits,
      lifeGoals,
      monthlyPlans,
      weeklyTargets,
      executionHistory,
      captures,
      profile,
    ]
  );
}
