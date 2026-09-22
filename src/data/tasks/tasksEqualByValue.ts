import type { Task } from "../../shared/types";

const TASK_FIELDS = [
  "id", "title", "description", "dueDate", "priority",
  "weeklyTargetId", "completed", "completedAt", "createdAt",
] as const satisfies readonly (keyof Task)[];

const TASK_FIELD_SET = new Set<string>(TASK_FIELDS);

function sameStoredValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length && left.every((value, index) => sameStoredValue(value, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return leftKeys.length === rightKeys.length &&
    leftKeys.every(key => Object.hasOwn(rightRecord, key) && sameStoredValue(leftRecord[key], rightRecord[key]));
}

export function tasksEqualByValue(actual: readonly Task[], expected: readonly Task[]): boolean {
  if (actual.length !== expected.length) return false;
  return actual.every((task, index) => {
    const target = expected[index];
    if (!target || !TASK_FIELDS.every(field => task[field] === target[field])) return false;
    const actualExtras = Object.keys(task).filter(key => !TASK_FIELD_SET.has(key));
    const expectedExtras = Object.keys(target).filter(key => !TASK_FIELD_SET.has(key));
    return actualExtras.length === expectedExtras.length &&
      actualExtras.every(key => Object.hasOwn(target, key) &&
        sameStoredValue((task as unknown as Record<string, unknown>)[key], (target as unknown as Record<string, unknown>)[key]));
  });
}
