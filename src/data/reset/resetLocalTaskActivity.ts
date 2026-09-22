import type {
  AsyncExecutionHistoryRepository,
} from "../execution/asyncExecutionHistoryRepository";

import type {
  AsyncTaskRepository,
} from "../tasks/asyncTaskRepository";

export interface LocalTaskActivityResetDependencies {
  taskRepository: Pick<
    AsyncTaskRepository,
    "readCurrent" | "replace" | "waitForPersistence"
  >;
  executionHistoryRepository: Pick<
    AsyncExecutionHistoryRepository,
    "readCurrent" | "replace" | "clear" | "waitForPersistence"
  >;
}

export interface LocalTaskActivityResetResult {
  clearedTaskCount: number;
  clearedExecutionRecordCount: number;
}

function rejectionReason(result: PromiseSettledResult<unknown>): unknown {
  return result.status === "rejected" ? result.reason : undefined;
}

/**
 * Clears only canonical Tasks and Execution History.
 *
 * The original snapshots are retained solely for bounded compensating rollback
 * if one repository rejects. Migration journals and every unrelated domain are
 * outside this coordinator's authority.
 */
export async function resetLocalTaskActivity({
  taskRepository,
  executionHistoryRepository,
}: LocalTaskActivityResetDependencies): Promise<LocalTaskActivityResetResult> {
  const [tasks, executionRecords] = await Promise.all([
    taskRepository.readCurrent(),
    executionHistoryRepository.readCurrent(),
  ]);

  if (tasks.length === 0 && executionRecords.length === 0) {
    return {
      clearedTaskCount: 0,
      clearedExecutionRecordCount: 0,
    };
  }

  const clearResults = await Promise.allSettled([
    taskRepository.replace([]),
    executionHistoryRepository.clear(),
  ]);
  const clearFailure = clearResults.find(
    (result) => result.status === "rejected"
  );

  if (clearFailure) {
    const rollbackResults = await Promise.allSettled([
      taskRepository.replace(structuredClone(tasks)),
      executionHistoryRepository.replace(structuredClone(executionRecords)),
    ]);
    const rollbackFailures = rollbackResults
      .map(rejectionReason)
      .filter((reason) => reason !== undefined);

    if (rollbackFailures.length > 0) {
      throw new AggregateError(
        [rejectionReason(clearFailure), ...rollbackFailures],
        "Local task activity reset failed and could not restore every snapshot"
      );
    }

    throw rejectionReason(clearFailure);
  }

  await Promise.all([
    taskRepository.waitForPersistence(),
    executionHistoryRepository.waitForPersistence(),
  ]);
  const [remainingTasks, remainingRecords] = await Promise.all([
    taskRepository.readCurrent(),
    executionHistoryRepository.readCurrent(),
  ]);
  if (remainingTasks.length !== 0 || remainingRecords.length !== 0) {
    throw new Error("Task activity reset did not persist an empty account state");
  }

  return {
    clearedTaskCount: tasks.length,
    clearedExecutionRecordCount: executionRecords.length,
  };
}
