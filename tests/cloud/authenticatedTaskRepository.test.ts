import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import type { PowerSyncDatabase } from "@powersync/web";
import type { Task } from "../../src/shared/types.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { createAuthenticatedDataServices } = await import("../../src/data/account/authenticatedDataServices.ts");

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const COLUMNS = ["title", "description", "due_date", "priority", "weekly_target_id", "completed", "completed_at", "created_at", "sort_order", "extras_json"] as const;
type Stored = Record<(typeof COLUMNS)[number], unknown> & { id: string; user_id: string; entity_id: string };

class TaskDatabase {
  rows: Stored[] = [];
  corruptVerification = false;

  async init() {}
  async getAll<T>(sql: string): Promise<T[]> { return this.select(sql, this.rows) as T[]; }
  async getUploadQueueStats() { return { count: 0 }; }

  async writeTransaction<T>(run: (tx: { getAll: TaskDatabase["getAll"]; execute: (sql: string, args: unknown[]) => Promise<void> }) => Promise<T>): Promise<T> {
    const pending = structuredClone(this.rows);
    const tx = {
      getAll: async <Row>(sql: string): Promise<Row[]> => this.select(sql, pending) as Row[],
      execute: async (sql: string, args: unknown[]) => {
        if (sql.startsWith("INSERT INTO tasks")) {
          const row = { id: args[0], user_id: args[1], entity_id: args[2] } as Stored;
          COLUMNS.forEach((column, index) => { row[column] = args[index + 3]; });
          pending.push(row);
        } else if (sql.startsWith("UPDATE tasks")) {
          const row = pending.find(item => item.id === args[COLUMNS.length]);
          assert.ok(row);
          COLUMNS.forEach((column, index) => { row[column] = args[index]; });
        } else if (sql.startsWith("DELETE FROM tasks")) {
          const index = pending.findIndex(row => row.id === args[0]);
          assert.ok(index >= 0);
          pending.splice(index, 1);
        } else throw new Error("Unexpected Task SQL");
      },
    };
    const result = await run(tx);
    this.rows = pending;
    return result;
  }

  private select(sql: string, rows: Stored[]): unknown[] {
    if (sql.startsWith("SELECT id AS row_id")) return rows.map(row => ({ row_id: row.id, entity_id: row.entity_id }));
    if (sql.startsWith("SELECT entity_id AS id")) return rows.map(row => ({
      ...row, id: row.entity_id,
      title: this.corruptVerification ? "Incorrect title" : row.title,
    }));
    throw new Error("Unexpected Task query");
  }
}

const task: Task = {
  id: 1700000000001, title: "Authenticated replacement regression",
  description: undefined, dueDate: "2026-09-22", priority: "medium",
  weeklyTargetId: undefined, completed: false, completedAt: undefined,
  createdAt: "2026-09-21T10:00:00.000Z",
};

test("authenticated Task replacement accepts a canonical round-trip and survives reopening", async () => {
  const database = new TaskDatabase();
  const first = createAuthenticatedDataServices(database as unknown as PowerSyncDatabase, USER_A);
  assert.deepEqual(await first.taskRepository.initialize(), []);
  await first.taskRepository.replace([task]);
  assert.deepEqual(await first.taskRepository.readCurrent(), [{
    id: task.id, title: task.title, priority: task.priority,
    completed: task.completed, createdAt: task.createdAt, dueDate: task.dueDate,
  }]);
  const reopened = createAuthenticatedDataServices(database as unknown as PowerSyncDatabase, USER_A);
  assert.deepEqual(await reopened.taskRepository.initialize(), await first.taskRepository.readCurrent());
  assert.equal(database.rows[0]?.user_id, USER_A);
});

test("authenticated Task replacement rejects a real field mismatch and rolls back", async () => {
  const database = new TaskDatabase();
  const services = createAuthenticatedDataServices(database as unknown as PowerSyncDatabase, USER_A);
  await services.taskRepository.initialize();
  database.corruptVerification = true;
  await assert.rejects(services.taskRepository.replace([task]), /Authenticated Task replacement failed/);
  assert.deepEqual(database.rows, []);
});

test("authenticated Task repositories retain separate user-scoped storage", async () => {
  const aDatabase = new TaskDatabase();
  const bDatabase = new TaskDatabase();
  const a = createAuthenticatedDataServices(aDatabase as unknown as PowerSyncDatabase, USER_A);
  const b = createAuthenticatedDataServices(bDatabase as unknown as PowerSyncDatabase, USER_B);
  await a.taskRepository.replace([task]);
  assert.equal((await a.taskRepository.readCurrent()).length, 1);
  assert.deepEqual(await b.taskRepository.readCurrent(), []);
  assert.deepEqual(bDatabase.rows, []);
});
