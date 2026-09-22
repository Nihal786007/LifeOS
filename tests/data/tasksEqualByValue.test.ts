import assert from "node:assert/strict";
import test from "node:test";
import type { Task } from "../../src/shared/types.ts";
import { tasksEqualByValue } from "../../src/data/tasks/tasksEqualByValue.ts";

const task: Task = {
  id: 1700000000001,
  title: "Study SAT",
  description: undefined,
  dueDate: "2026-09-22",
  priority: "medium",
  weeklyTargetId: undefined,
  completed: false,
  completedAt: undefined,
  createdAt: "2026-09-21T10:00:00.000Z",
};

test("equal Task fields are accepted regardless of key order", () => {
  const rehydrated: Task = {
    id: task.id, title: task.title, priority: task.priority,
    completed: task.completed, createdAt: task.createdAt, dueDate: task.dueDate,
  };
  assert.notEqual(JSON.stringify(task), JSON.stringify(rehydrated));
  assert.equal(tasksEqualByValue([rehydrated], [task]), true);
});

test("every canonical Task field remains part of persistence verification", () => {
  const changes: Task[] = [
    { ...task, id: task.id + 1 },
    { ...task, title: "Different" },
    { ...task, description: "Different" },
    { ...task, dueDate: "2026-09-23" },
    { ...task, priority: "high" },
    { ...task, weeklyTargetId: 1700000000002 },
    { ...task, completed: true },
    { ...task, completedAt: "2026-09-22T10:00:00.000Z" },
    { ...task, createdAt: "2026-09-21T11:00:00.000Z" },
  ];
  for (const changed of changes) assert.equal(tasksEqualByValue([changed], [task]), false);
  assert.equal(tasksEqualByValue([], [task]), false);
});

test("absent and undefined optional fields agree, but empty and populated values do not", () => {
  const withoutOptionals: Task = {
    id: task.id, title: task.title, dueDate: task.dueDate,
    priority: task.priority, completed: task.completed, createdAt: task.createdAt,
  };
  assert.equal(tasksEqualByValue([withoutOptionals], [task]), true);
  assert.equal(tasksEqualByValue([{ ...withoutOptionals, description: "" }], [task]), false);
  assert.equal(tasksEqualByValue([{ ...withoutOptionals, dueDate: undefined }], [task]), false);
});

test("preserved extra values compare structurally without hiding mismatches", () => {
  const left = { ...task, legacy: { tags: ["a", "b"], flag: false } } as Task;
  const same = { ...task, legacy: { flag: false, tags: ["a", "b"] } } as Task;
  const changed = { ...task, legacy: { flag: false, tags: ["b", "a"] } } as Task;
  assert.equal(tasksEqualByValue([left], [same]), true);
  assert.equal(tasksEqualByValue([left], [changed]), false);
  assert.equal(tasksEqualByValue([left], [task]), false);
});
