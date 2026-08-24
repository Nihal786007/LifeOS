import {
  createContext,
  useContext,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  ExecutionCoordinator,
} from "../engines/ExecutionCoordinator";

import {
  useLifeGoals,
} from "./LifeGoalsContext";

import {
  useMonthlyPlanning,
} from "./MonthlyPlanningContext";

import {
  useWeeklyPlanning,
} from "./WeeklyPlanningContext";

import {
  useTasks,
} from "./TaskContext";

interface PlanningExecutionContextType {
  completeTask: (
    taskId: number
  ) => void;

  uncompleteTask: (
    taskId: number
  ) => void;

  deleteTask: (
    taskId: number
  ) => void;

  completeWeeklyTarget: (
    weeklyTargetId: number
  ) => void;

  uncompleteWeeklyTarget: (
    weeklyTargetId: number
  ) => void;

  deleteWeeklyTarget: (
    weeklyTargetId: number
  ) => void;

  completeMonthlyTarget: (
    monthlyTargetId: number
  ) => void;

  uncompleteMonthlyTarget: (
    monthlyTargetId: number
  ) => void;

  deleteMonthlyTarget: (
    monthlyTargetId: number
  ) => void;

  completeLifeGoal: (
    goalId: number
  ) => void;

  uncompleteLifeGoal: (
    goalId: number
  ) => void;

  deleteLifeGoal: (
    goalId: number
  ) => void;
}

const PlanningExecutionContext =
  createContext<
    PlanningExecutionContextType | null
  >(null);

export function PlanningExecutionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    lifeGoals,
    replaceLifeGoals,
  } = useLifeGoals();

  const {
    monthlyPlans,
    replaceMonthlyPlans,
  } = useMonthlyPlanning();

  const {
    weeklyTargets,
    replaceWeeklyTargets,
  } = useWeeklyPlanning();

  const {
    tasks,
    replaceTasks,
  } = useTasks();

  // ==========================================
  // Apply Execution Result
  // ==========================================

  function applyResult(
    result: ReturnType<
      typeof ExecutionCoordinator.completeTask
    >
  ) {
    replaceLifeGoals(
      result.lifeGoals
    );

    replaceMonthlyPlans(
      result.monthlyTargets
    );

    replaceWeeklyTargets(
      result.weeklyTargets
    );

    replaceTasks(
      result.tasks
    );
  }

  // ==========================================
  // Current Planning State
  // ==========================================

  function getState() {
    return {
      lifeGoals,

      monthlyTargets:
        monthlyPlans,

      weeklyTargets,

      tasks,
    };
  }

  // ==========================================
  // Tasks
  // ==========================================

  function completeTask(
    taskId: number
  ) {
    const result =
      ExecutionCoordinator.completeTask(
        getState(),
        taskId
      );

    applyResult(result);
  }

  function uncompleteTask(
    taskId: number
  ) {
    const result =
      ExecutionCoordinator.uncompleteTask(
        getState(),
        taskId
      );

    applyResult(result);
  }

  function deleteTask(
    taskId: number
  ) {
    const result =
      ExecutionCoordinator.deleteTask(
        getState(),
        taskId
      );

    applyResult(result);
  }

  // ==========================================
  // Weekly Targets
  // ==========================================

  function completeWeeklyTarget(
    weeklyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.completeWeeklyTarget(
        getState(),
        weeklyTargetId
      );

    applyResult(result);
  }

  function uncompleteWeeklyTarget(
    weeklyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.uncompleteWeeklyTarget(
        getState(),
        weeklyTargetId
      );

    applyResult(result);
  }

  function deleteWeeklyTarget(
    weeklyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.deleteWeeklyTarget(
        getState(),
        weeklyTargetId
      );

    applyResult(result);
  }

  // ==========================================
  // Monthly Targets
  // ==========================================

  function completeMonthlyTarget(
    monthlyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.completeMonthlyTarget(
        getState(),
        monthlyTargetId
      );

    applyResult(result);
  }

  function uncompleteMonthlyTarget(
    monthlyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.uncompleteMonthlyTarget(
        getState(),
        monthlyTargetId
      );

    applyResult(result);
  }

  function deleteMonthlyTarget(
    monthlyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.deleteMonthlyTarget(
        getState(),
        monthlyTargetId
      );

    applyResult(result);
  }

  // ==========================================
  // Life Goals
  // ==========================================

  function completeLifeGoal(
    goalId: number
  ) {
    const result =
      ExecutionCoordinator.completeLifeGoal(
        getState(),
        goalId
      );

    applyResult(result);
  }

  function uncompleteLifeGoal(
    goalId: number
  ) {
    const result =
      ExecutionCoordinator.uncompleteLifeGoal(
        getState(),
        goalId
      );

    applyResult(result);
  }

  function deleteLifeGoal(
    goalId: number
  ) {
    const result =
      ExecutionCoordinator.deleteLifeGoal(
        getState(),
        goalId
      );

    applyResult(result);
  }

  return (
    <PlanningExecutionContext.Provider
      value={{
        completeTask,
        uncompleteTask,
        deleteTask,

        completeWeeklyTarget,
        uncompleteWeeklyTarget,
        deleteWeeklyTarget,

        completeMonthlyTarget,
        uncompleteMonthlyTarget,
        deleteMonthlyTarget,

        completeLifeGoal,
        uncompleteLifeGoal,
        deleteLifeGoal,
      }}
    >
      {children}
    </PlanningExecutionContext.Provider>
  );
}

export function usePlanningExecution() {
  const context =
    useContext(
      PlanningExecutionContext
    );

  if (!context) {
    throw new Error(
      "usePlanningExecution must be used inside PlanningExecutionProvider"
    );
  }

  return context;
}