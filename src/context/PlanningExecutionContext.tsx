// ==========================================
// LifeOS Planning Execution Context
// Version: 5.1
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
  PlanningMutationEngine,
} from "../engines/PlanningMutationEngine";

import {
  GoalPlanningMutationEngine,
} from "../engines/GoalPlanningMutationEngine";

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
  PlanningState,
} from "../engines/PlanningKernel";

import type {
  GoalWeeklyFocusCreationResult,
  MonthlyOutcomeCreationResult,
  MonthlyOutcomeUpdateResult,
  PersonalWeeklyFocusCreationResult,
  TaskUpdateResult,
  WeeklyFocusUpdateResult,
} from "../engines/planningMutationTypes";

import type {
  CreateLifeGoalInput,
  LifeGoalCreationResult,
  LifeGoalUpdateResult,
  UpdateLifeGoalInput,
} from "../engines/GoalPlanningMutationEngine";

import type {
  CreateTaskInput,
  UpdateTaskInput,
} from "../shared/types";

// ==========================================
// Context Type
// ==========================================

interface PlanningExecutionContextType {
  // ========================================
  // Life Goal Planning
  // ========================================

  createLifeGoal: (
    input: CreateLifeGoalInput
  ) => LifeGoalCreationResult;

  updateLifeGoal: (
    goalId: number,
    updates: UpdateLifeGoalInput
  ) => LifeGoalUpdateResult;

  // ========================================
  // Monthly Outcome Planning
  // ========================================

  createMonthlyOutcome: (
    title: string,
    month: number,
    year: number,
    goalId?: number
  ) => MonthlyOutcomeCreationResult;

  updateMonthlyOutcomeTitle: (
    monthlyTargetId: number,
    title: string
  ) => MonthlyOutcomeUpdateResult;

  // ========================================
  // Weekly Focus Planning
  // ========================================

  createGoalWeeklyFocus: (
    title: string,
    monthlyTargetId: number,
    weekStartDate: string,
    weekEndDate: string
  ) => GoalWeeklyFocusCreationResult;

  createPersonalWeeklyFocus: (
    title: string,
    monthlyTargetId: number,
    weekStartDate: string,
    weekEndDate: string
  ) => PersonalWeeklyFocusCreationResult;

  updateWeeklyFocusTitle: (
    weeklyTargetId: number,
    title: string
  ) => WeeklyFocusUpdateResult;

  // ========================================
  // Universal Task Planning
  // ========================================

  createTask: (
    input: CreateTaskInput
  ) => void;

  updateTask: (
    taskId: number,
    updates: UpdateTaskInput
  ) => TaskUpdateResult;

  // ========================================
  // Task Execution
  // ========================================

  completeTask: (
    taskId: number
  ) => void;

  uncompleteTask: (
    taskId: number
  ) => void;

  deleteTask: (
    taskId: number
  ) => void;

  // ========================================
  // Weekly Execution
  // ========================================

  completeWeeklyTarget: (
    weeklyTargetId: number
  ) => void;

  uncompleteWeeklyTarget: (
    weeklyTargetId: number
  ) => void;

  deleteWeeklyTarget: (
    weeklyTargetId: number
  ) => void;

  // ========================================
  // Monthly Execution
  // ========================================

  completeMonthlyTarget: (
    monthlyTargetId: number
  ) => void;

  uncompleteMonthlyTarget: (
    monthlyTargetId: number
  ) => void;

  deleteMonthlyTarget: (
    monthlyTargetId: number
  ) => void;

  // ========================================
  // Life Goal Execution
  // ========================================

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
    addCalendarWeeklyTarget,
    replaceWeeklyTargets,
  } = useWeeklyPlanning();

  const {
    tasks,
    replaceTasks,
  } = useTasks();

  // ==========================================
  // Current Planning State
  // ==========================================

  function getState(): PlanningState {
    return {
      lifeGoals,

      monthlyTargets:
        monthlyPlans,

      weeklyTargets,

      tasks,
    };
  }

  // ==========================================
  // State Synchronization Boundary
  // ==========================================

  function applyState(
    state: PlanningState
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
  // Life Goal Planning
  // ==========================================

  function createLifeGoal(
    input: CreateLifeGoalInput
  ): LifeGoalCreationResult {
    const result =
      GoalPlanningMutationEngine.createGoal(
        getState(),
        input
      );

    if (
      result.created
    ) {
      applyState(
        result.state
      );
    }

    return result;
  }

  function updateLifeGoal(
    goalId: number,
    updates: UpdateLifeGoalInput
  ): LifeGoalUpdateResult {
    const result =
      GoalPlanningMutationEngine.updateGoal(
        getState(),
        goalId,
        updates
      );

    if (
      result.updated
    ) {
      applyState(
        result.state
      );
    }

    return result;
  }

  // ==========================================
  // Monthly Outcome Planning
  // ==========================================

  function createMonthlyOutcome(
    title: string,
    month: number,
    year: number,
    goalId?: number
  ): MonthlyOutcomeCreationResult {
    const result =
      PlanningMutationEngine.createMonthlyOutcome(
        getState(),
        title,
        month,
        year,
        goalId
      );

    if (
      result.created
    ) {
      applyState(
        result.state
      );
    }

    return result;
  }

  function updateMonthlyOutcomeTitle(
    monthlyTargetId: number,
    title: string
  ): MonthlyOutcomeUpdateResult {
    const result =
      PlanningMutationEngine.updateMonthlyOutcomeTitle(
        getState(),
        monthlyTargetId,
        title
      );

    if (
      result.updated
    ) {
      applyState(
        result.state
      );
    }

    return result;
  }

  // ==========================================
  // Weekly Focus Planning
  // ==========================================

  function createGoalWeeklyFocus(
    title: string,
    monthlyTargetId: number,
    weekStartDate: string,
    weekEndDate: string
  ): GoalWeeklyFocusCreationResult {
    const validation =
      PlanningMutationEngine.validateGoalWeeklyFocus(
        getState(),
        title,
        monthlyTargetId,
        weekStartDate,
        weekEndDate
      );

    if (
      validation.status !==
      "available"
    ) {
      return {
        status:
          validation.status,

        created:
          false,

        message:
          validation.message,

        ownerMonth:
          validation.ownerMonth,

        ownerYear:
          validation.ownerYear,

        ownerMonthlyTargetId:
          validation.ownerMonthlyTargetId,

        existingWeeklyTargetId:
          validation.existingWeeklyTargetId,
      };
    }

    if (
      !validation.title
    ) {
      return {
        status:
          "invalid_title",

        created:
          false,

        message:
          "Weekly Focus title cannot be empty.",
      };
    }

    addCalendarWeeklyTarget(
      validation.title,
      monthlyTargetId,
      weekStartDate,
      weekEndDate
    );

    return {
      status:
        "created",

      created:
        true,

      message:
        "Weekly Focus created successfully.",

      ownerMonth:
        validation.ownerMonth,

      ownerYear:
        validation.ownerYear,

      ownerMonthlyTargetId:
        validation.ownerMonthlyTargetId,
    };
  }

  function createPersonalWeeklyFocus(
    title: string,
    monthlyTargetId: number,
    weekStartDate: string,
    weekEndDate: string
  ): PersonalWeeklyFocusCreationResult {
    const validation =
      PlanningMutationEngine.validatePersonalWeeklyFocus(
        getState(),
        title,
        monthlyTargetId,
        weekStartDate,
        weekEndDate
      );

    if (
      validation.status !==
      "available"
    ) {
      return {
        status:
          validation.status,

        created:
          false,

        message:
          validation.message,

        ownerMonth:
          validation.ownerMonth,

        ownerYear:
          validation.ownerYear,

        ownerMonthlyTargetId:
          validation.ownerMonthlyTargetId,

        existingWeeklyTargetId:
          validation.existingWeeklyTargetId,
      };
    }

    if (
      !validation.title
    ) {
      return {
        status:
          "invalid_title",

        created:
          false,

        message:
          "Weekly Focus title cannot be empty.",
      };
    }

    const ownerMonthlyTargetId =
      validation.ownerMonthlyTargetId ??
      monthlyTargetId;

    addCalendarWeeklyTarget(
      validation.title,
      ownerMonthlyTargetId,
      weekStartDate,
      weekEndDate
    );

    return {
      status:
        "created",

      created:
        true,

      message:
        "Personal Weekly Focus created successfully.",

      ownerMonth:
        validation.ownerMonth,

      ownerYear:
        validation.ownerYear,

      ownerMonthlyTargetId,
    };
  }

  function updateWeeklyFocusTitle(
    weeklyTargetId: number,
    title: string
  ): WeeklyFocusUpdateResult {
    const result =
      PlanningMutationEngine.updateWeeklyFocusTitle(
        getState(),
        weeklyTargetId,
        title
      );

    if (
      result.updated
    ) {
      applyState(
        result.state
      );
    }

    return result;
  }

  // ==========================================
  // Universal Task Planning
  // ==========================================

  function createTask(
    input: CreateTaskInput
  ) {
    const result =
      PlanningMutationEngine.createTask(
        getState(),
        input
      );

    if (
      !result.created
    ) {
      return;
    }

    applyState(
      result.state
    );
  }

  function updateTask(
    taskId: number,
    updates: UpdateTaskInput
  ): TaskUpdateResult {
    const result =
      PlanningMutationEngine.updateTask(
        getState(),
        taskId,
        updates
      );

    if (
      result.updated
    ) {
      applyState(
        result.state
      );
    }

    return result;
  }

  // ==========================================
  // Task Execution
  // ==========================================

  function completeTask(
    taskId: number
  ) {
    const result =
      ExecutionCoordinator.completeTask(
        getState(),
        taskId
      );

    applyState(
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

    applyState(
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

    applyState(
      result
    );
  }

  // ==========================================
  // Weekly Execution
  // ==========================================

  function completeWeeklyTarget(
    weeklyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.completeWeeklyTarget(
        getState(),
        weeklyTargetId
      );

    applyState(
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

    applyState(
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

    applyState(
      result
    );
  }

  // ==========================================
  // Monthly Execution
  // ==========================================

  function completeMonthlyTarget(
    monthlyTargetId: number
  ) {
    const result =
      ExecutionCoordinator.completeMonthlyTarget(
        getState(),
        monthlyTargetId
      );

    applyState(
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

    applyState(
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

    applyState(
      result
    );
  }

  // ==========================================
  // Life Goal Execution
  // ==========================================

  function completeLifeGoal(
    goalId: number
  ) {
    const result =
      ExecutionCoordinator.completeLifeGoal(
        getState(),
        goalId
      );

    applyState(
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

    applyState(
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

    applyState(
      result
    );
  }

  // ==========================================
  // Provider
  // ==========================================

  return (
    <PlanningExecutionContext.Provider
      value={{
        createLifeGoal,
        updateLifeGoal,

        createMonthlyOutcome,
        updateMonthlyOutcomeTitle,

        createGoalWeeklyFocus,
        createPersonalWeeklyFocus,
        updateWeeklyFocusTitle,

        createTask,
        updateTask,

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