import assert from "node:assert/strict";
import test from "node:test";
import { containsBundleExposure, containsCredentialFormat, forbiddenSourcePath } from "./security-check.mjs";

test("Supabase secret-shaped fixtures are detected without returning values", () => {
  assert.equal(containsCredentialFormat("sb_" + "secret_" + "A".repeat(32)), true);
});
test("provider key and JWT-shaped synthetic fixtures are detected", () => {
  assert.equal(containsCredentialFormat("sk-" + "a".repeat(32)), true);
  assert.equal(containsCredentialFormat(["eyJ" + "a".repeat(24), "b".repeat(24), "c".repeat(24)].join(".")), true);
});
test("Google-shaped synthetic credentials are detected", () => {
  for (const prefix of ["AIza", "ya29.", "GOCSPX-"]) {
    assert.equal(containsCredentialFormat(prefix + "a".repeat(40)), true);
  }
});
test("private key envelopes and database URI fixtures are detected", () => {
  assert.equal(containsCredentialFormat("-----BEGIN " + "PRIVATE KEY-----"), true);
  assert.equal(containsCredentialFormat("postgresql" + "://synthetic.invalid/example"), true);
});
test("ordinary config names and clearly synthetic fixture labels are not credentials", () => {
  assert.equal(containsCredentialFormat("SYNTHETIC_CONFIG GOOGLE_CALENDAR_CLIENT_SECRET synthetic-token"), false);
});
test("private environments are blocked while public examples remain visible", () => {
  for (const path of [".env", ".env.local", "nested/.env.production"]) assert.equal(forbiddenSourcePath(path), true);
  for (const path of [".env.example", ".env.production.example"]) assert.equal(forbiddenSourcePath(path), false);
});
test("all three fixed private helper paths are blocked", () => {
  for (const name of ["calendarRecoveryRehearsal.mjs", "calendarCmsRecoveryRehearsal.mjs", "calendarSyntheticKeyCustody.ps1"]) {
    assert.equal(forbiddenSourcePath(`tools/verification/${name}`), true);
  }
});
test("key and database artifacts are blocked without excluding SQL migrations/tests", () => {
  for (const path of ["private.pem", "key.dpapi", "copy.dump", "copy.sql.gz", "backups/data.zip", ".pgdata/PG_VERSION"]) assert.equal(forbiddenSourcePath(path), true);
  for (const path of ["supabase/migrations/example.sql", "tests/cloud/example.test.ts"]) assert.equal(forbiddenSourcePath(path), false);
});
test("server-only configuration markers are blocked in client output", () => {
  assert.equal(containsBundleExposure("GOOGLE_CALENDAR_CLIENT_SECRET"), true);
  assert.equal(containsBundleExposure("access_token_ciphertext"), true);
});
test("normal client output remains allowed and private recovery code is blocked", () => {
  assert.equal(containsBundleExposure("LifeOS client build"), false);
  assert.equal(containsBundleExposure("calendarCmsRecoveryRehearsal"), true);
});
