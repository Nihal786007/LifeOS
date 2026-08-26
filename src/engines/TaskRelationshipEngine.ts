import type {
  LifeGoal,
  MonthlyTarget,
  Task,
  WeeklyTarget,
} from "../shared/types";

export type TaskRelationshipScope =
  | "standalone"
  | "weekly"
  | "personal"
  | "goal";

export interface TaskRelationshipState {
  lifeGoals: LifeGoal[];
  monthlyTargets: MonthlyTarget[];
  weeklyTargets: WeeklyTarget[];
  tasks: Task[];
}

export interface TaskRelationship {
  task: Task;

  weeklyTarget?: WeeklyTarget;

  monthlyTarget?: MonthlyTarget;

  lifeGoal?: LifeGoal;

  scope: TaskRelationshipScope;
}

export class TaskRelationshipEngine {
  static resolve(
    state: TaskRelationshipState,
    taskId: number
  ): TaskRelationship | null {
    const task =
      state.tasks.find(
        (item) =>
          item.id === taskId
      );

    if (!task) {
      return null;
    }

    if (
      task.weeklyTargetId ===
      undefined
    ) {
      return {
        task,
        scope: "standalone",
      };
    }

    const weeklyTarget =
      state.weeklyTargets.find(
        (item) =>
          item.id ===
          task.weeklyTargetId
      );

    if (!weeklyTarget) {
      return {
        task,
        scope: "standalone",
      };
    }

    if (
      weeklyTarget.monthlyTargetId ===
      undefined
    ) {
      return {
        task,
        weeklyTarget,
        scope: "weekly",
      };
    }

    const monthlyTarget =
      state.monthlyTargets.find(
        (item) =>
          item.id ===
          weeklyTarget.monthlyTargetId
      );

    if (!monthlyTarget) {
      return {
        task,
        weeklyTarget,
        scope: "weekly",
      };
    }

    if (
      monthlyTarget.goalId ===
      undefined
    ) {
      return {
        task,
        weeklyTarget,
        monthlyTarget,
        scope: "personal",
      };
    }

    const lifeGoal =
      state.lifeGoals.find(
        (item) =>
          item.id ===
          monthlyTarget.goalId
      );

    if (!lifeGoal) {
      return {
        task,
        weeklyTarget,
        monthlyTarget,
        scope: "personal",
      };
    }

    return {
      task,
      weeklyTarget,
      monthlyTarget,
      lifeGoal,
      scope: "goal",
    };
  }

  static resolveAll(
    state: TaskRelationshipState
  ): TaskRelationship[] {
    return state.tasks.map(
      (task) =>
        this.resolve(
          state,
          task.id
        )
    ).filter(
      (
        relationship
      ): relationship is TaskRelationship =>
        relationship !== null
    );
  }

  static getStandaloneTasks(
    state: TaskRelationshipState
  ): Task[] {
    return this.resolveAll(
      state
    )
      .filter(
        (relationship) =>
          relationship.scope ===
          "standalone"
      )
      .map(
        (relationship) =>
          relationship.task
      );
  }

  static getWeeklyTasks(
    state: TaskRelationshipState
  ): Task[] {
    return this.resolveAll(
      state
    )
      .filter(
        (relationship) =>
          relationship.scope ===
          "weekly"
      )
      .map(
        (relationship) =>
          relationship.task
      );
  }

  static getPersonalPlannerTasks(
    state: TaskRelationshipState
  ): Task[] {
    return this.resolveAll(
      state
    )
      .filter(
        (relationship) =>
          relationship.scope ===
          "personal"
      )
      .map(
        (relationship) =>
          relationship.task
      );
  }

  static getGoalPlannerTasks(
    state: TaskRelationshipState
  ): Task[] {
    return this.resolveAll(
      state
    )
      .filter(
        (relationship) =>
          relationship.scope ===
          "goal"
      )
      .map(
        (relationship) =>
          relationship.task
      );
  }

  static getTasksForWeeklyTarget(
    state: TaskRelationshipState,
    weeklyTargetId: number
  ): Task[] {
    return state.tasks.filter(
      (task) =>
        task.weeklyTargetId ===
        weeklyTargetId
    );
  }

  static getTasksForMonthlyTarget(
    state: TaskRelationshipState,
    monthlyTargetId: number
  ): Task[] {
    const weeklyTargetIds =
      new Set(
        state.weeklyTargets
          .filter(
            (target) =>
              target.monthlyTargetId ===
              monthlyTargetId
          )
          .map(
            (target) =>
              target.id
          )
      );

    return state.tasks.filter(
      (task) =>
        task.weeklyTargetId !==
          undefined &&
        weeklyTargetIds.has(
          task.weeklyTargetId
        )
    );
  }

  static getTasksForLifeGoal(
    state: TaskRelationshipState,
    goalId: number
  ): Task[] {
    const monthlyTargetIds =
      new Set(
        state.monthlyTargets
          .filter(
            (target) =>
              target.goalId ===
              goalId
          )
          .map(
            (target) =>
              target.id
          )
      );

    const weeklyTargetIds =
      new Set(
        state.weeklyTargets
          .filter(
            (target) =>
              target.monthlyTargetId !==
                undefined &&
              monthlyTargetIds.has(
                target.monthlyTargetId
              )
          )
          .map(
            (target) =>
              target.id
          )
      );

    return state.tasks.filter(
      (task) =>
        task.weeklyTargetId !==
          undefined &&
        weeklyTargetIds.has(
          task.weeklyTargetId
        )
    );
  }
}