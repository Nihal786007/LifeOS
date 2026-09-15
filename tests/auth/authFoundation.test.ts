import assert from "node:assert/strict";
import test from "node:test";

import {
  authErrorState,
  authStateFromSession,
  selectAuthDataAccess,
} from "../../src/auth/authState.ts";
import { INITIAL_AUTH_STATE } from "../../src/auth/types.ts";
import {
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "../../src/auth/authActions.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

function fakeClient(overrides?: {
  signInError?: Error;
  signUpError?: Error;
  signOutError?: Error;
}) {
  const calls: unknown[] = [];
  const client = {
    auth: {
      signInWithPassword: async (credentials: unknown) => {
        calls.push(["sign-in", credentials]);
        return { error: overrides?.signInError ?? null };
      },
      signUp: async (credentials: unknown) => {
        calls.push(["sign-up", credentials]);
        return { error: overrides?.signUpError ?? null };
      },
      signOut: async () => {
        calls.push(["sign-out"]);
        return { error: overrides?.signOutError ?? null };
      },
    },
  } as unknown as SupabaseClient;

  return { client, calls };
}

test("auth hydration blocks canonical data access", () => {
  assert.equal(selectAuthDataAccess(INITIAL_AUTH_STATE), "wait-for-auth");
});

test("signed-out state shows authentication without canonical providers", () => {
  const state = authStateFromSession(null);
  assert.equal(state.phase, "signed-out");
  assert.equal(state.identity, null);
  assert.equal(selectAuthDataAccess(state), "show-auth");
});

test("session exposes only the bounded account identity", () => {
  const state = authStateFromSession({
    user: {
      id: "63f8f743-5638-45cf-889f-bff2478288df",
      email: "person@example.com",
    },
  } as Parameters<typeof authStateFromSession>[0]);

  assert.deepEqual(state, {
    phase: "signed-in",
    identity: {
      userId: "63f8f743-5638-45cf-889f-bff2478288df",
      email: "person@example.com",
    },
    error: null,
  });
});

test("signed-in auth alone cannot mount the account-neutral database", () => {
  const state = authStateFromSession({
    user: { id: "user-a" },
  } as Parameters<typeof authStateFromSession>[0]);

  assert.equal(selectAuthDataAccess(state), "require-local-data-setup");
});

test("auth failures stay outside canonical data providers", () => {
  const state = authErrorState(new Error("session unavailable"));
  assert.equal(state.error, "session unavailable");
  assert.equal(selectAuthDataAccess(state), "show-auth-error");
});

test("password sign-in trims email and preserves the password verbatim", async () => {
  const { client, calls } = fakeClient();
  assert.deepEqual(
    await signInWithPassword(client, "  person@example.com  ", " secret "),
    { ok: true, error: null }
  );
  assert.deepEqual(calls, [[
    "sign-in",
    { email: "person@example.com", password: " secret " },
  ]]);
});

test("sign-up and sign-out use only the Supabase auth boundary", async () => {
  const { client, calls } = fakeClient();
  assert.equal((await signUpWithPassword(
    client,
    "new@example.com",
    "password"
  )).ok, true);
  assert.equal((await signOut(client)).ok, true);
  assert.deepEqual(calls, [
    ["sign-up", { email: "new@example.com", password: "password" }],
    ["sign-out"],
  ]);
});

test("auth action failures remain structured", async () => {
  const { client } = fakeClient({
    signInError: new Error("invalid credentials"),
  });
  assert.deepEqual(
    await signInWithPassword(client, "person@example.com", "password"),
    { ok: false, error: "invalid credentials" }
  );
});
