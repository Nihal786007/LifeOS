import assert from "node:assert/strict";
import {
  registerHooks,
} from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  POWERSYNC_PROBE_CAPTURES_TABLE,
  lifeOSPowerSyncProbeSchema,
} = await import(
  "../../src/data/database/lifeOSPowerSyncSchema.ts"
);

const {
  POWERSYNC_PROBE_DATABASE_NAME,
  POWERSYNC_PROBE_VFS,
  createLifeOSPowerSyncProbeDatabase,
} = await import(
  "../../src/data/database/createLifeOSPowerSyncDatabase.ts"
);

test("probe schema contains only the local-only captures table", () => {
  assert.equal(lifeOSPowerSyncProbeSchema.tables.length, 1);

  const [captures] = lifeOSPowerSyncProbeSchema.tables;
  assert.equal(captures.name, POWERSYNC_PROBE_CAPTURES_TABLE);
  assert.equal(captures.localOnly, true);
  assert.deepEqual(
    captures.columns.map((column) => column.name),
    ["text", "created_at"]
  );
});

test("PowerSync automatically supplies the text database id", () => {
  const schema = lifeOSPowerSyncProbeSchema.toJSON() as {
    tables: Array<{
      name: string;
      columns: Array<{ name: string }>;
    }>;
  };
  const captures = schema.tables.find(
    (table) => table.name === POWERSYNC_PROBE_CAPTURES_TABLE
  );

  assert.ok(captures);
  assert.equal(
    captures.columns.some((column) => column.name === "id"),
    false
  );
});

test("probe database identity cannot be confused with production data", () => {
  assert.equal(POWERSYNC_PROBE_DATABASE_NAME, "lifeos-ps-probe-v1.sqlite");
  assert.match(POWERSYNC_PROBE_DATABASE_NAME, /probe-v1/);
  assert.notEqual(POWERSYNC_PROBE_DATABASE_NAME, "lifeos.sqlite");
});

test("database construction succeeds without a backend connector", async () => {
  const database = createLifeOSPowerSyncProbeDatabase();

  assert.equal(database.schema, lifeOSPowerSyncProbeSchema);
  assert.equal(database.connected, false);
  assert.equal(POWERSYNC_PROBE_VFS, "IDBBatchAtomicVFS");

  await database.close();
});

test("browser runtime operations remain in the explicit manual probe", async () => {
  const module = await import(
    "../../src/data/database/createLifeOSPowerSyncDatabase.ts"
  );

  assert.equal(
    typeof module.runLifeOSPowerSyncCompatibilityProbe,
    "function"
  );
});
