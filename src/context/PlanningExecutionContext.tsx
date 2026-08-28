// ==========================================
// LifeOS Planning Execution Context
// Version: 2.1
// ==========================================

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
  PlanningKernel,
} from "../engines/PlanningKernel";

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

import type {
  CreateTaskInput,
  Task,
} from "../shared/types";

// ==========================================
// Context Type
// ==========================================

interface PlanningExecutionContextType {
  /**
   * Creates one Universal Task as a planning
   * mutation.
   *
   * Creation does not award XP and does not
   * create an execution-history record.
   *
   * Planning progress is recalculated immediately.
   */
  createTask: (
    input: CreateTaskInput
  ) => void;

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

// ==========================================
// Context
// ==========================================

const PlanningExecutionContext =
  createContext<
    PlanningExecutionContextType | null
  >(null);

// ==========================================
// Provider
// ==========================================

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
  // Apply Planning State
  // ==========================================

  function applyPlanningState(
    state: {
      lifeGoals: typeof lifeGoals;
      monthlyTargets: typeof monthlyPlans;
      weeklyTargets: typeof weeklyTargets;
      tasks: Task[];
    }
  ) {
    replaceLifeGoals(
      state.lifeGoals
    );

    replaceMonthlyPlans(
      state.monthlyTargets
    );

    replaceWeeklyTargets(
      state.weeklyTargets
    );

    replaceTasks(
      state.tasks
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
  // Universal Task Creation
  // ==========================================

  function createTask(
    input: CreateTaskInput
  ) {
    const trimmedTitle =
      input.title.trim();

    if (!trimmedTitle) {
      return;
    }

    const task: Task = {
      id:
        Date.now(),

      title:
        trimmedTitle,

      description:
        input.description?.trim() ||
        undefined,

      dueDate:
        input.dueDate,

      priority:
        input.priority ??
        "medium",

      weeklyTargetId:
        input.weeklyTargetId,

      completed:
        false,

      completedAt:
        undefined,

      createdAt:
        new Date().toISOString(),
    };

    const nextTasks = [
      ...tasks,
      task,
    ];

    // ========================================
    // Creation is Planning, not Execution
    // ========================================

    const recalculated =
      PlanningKernel.recalculateAll({
        lifeGoals,

        monthlyTargets:
          monthlyPlans,

        weeklyTargets,

        tasks:
          nextTasks,
      });

    applyPlanningState(
      recalculated
    );
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

    applyResult(
      result
    );
  }

  function uncompleteTask(
    taskId: number
  ) {
    const result =
      ExecutionCoordinator.uncompleteTask(
        getState(),
        taskId
      );

    applyResult(
      result
    );
  }

  function deleteTask(
    taskId: number
  ) {
    const result =
      ExecutionCoordinator.deleteTask(
        getState(),
        taskId
      );

    applyResult(
      result
    );
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

    applyResult(
      result
    );
  }

  function uncompleteWeeklyTarget(
    weeklyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.uncompleteWeeklyTarget(
        getState(),
        weeklyTargetId
      );

    applyResult(
      result
    );
  }

  function deleteWeeklyTarget(
    weeklyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.deleteWeeklyTarget(
        getState(),
        weeklyTargetId
      );

    applyResult(
      result
    );
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

    applyResult(
      result
    );
  }

  function uncompleteMonthlyTarget(
    monthlyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.uncompleteMonthlyTarget(
        getState(),
        monthlyTargetId
      );

    applyResult(
      result
    );
  }

  function deleteMonthlyTarget(
    monthlyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.deleteMonthlyTarget(
        getState(),
        monthlyTargetId
      );

    applyResult(
      result
    );
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

    applyResult(
      result
    );
  }

  function uncompleteLifeGoal(
    goalId: number
  ) {
    const result =
      ExecutionCoordinator.uncompleteLifeGoal(
        getState(),
        goalId
      );

    applyResult(
      result
    );
  }

  function deleteLifeGoal(
    goalId: number
  ) {
    const result =
      ExecutionCoordinator.deleteLifeGoal(
        getState(),
        goalId
      );

    applyResult(
      result
    );
  }

  // ==========================================
  // Provider
  // ==========================================

  return (
    <PlanningExecutionContext.Provider
      value={{
        createTask,

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

// ==========================================
// Hook
// ==========================================

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