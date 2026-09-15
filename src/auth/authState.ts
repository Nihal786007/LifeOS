import type { Session } from "@supabase/supabase-js";

import type { AuthState } from "./types";

export type AuthDataAccess =
  | "wait-for-auth"
  | "show-auth"
  | "show-auth-error"
  | "require-local-data-setup"
  | "show-app";

export function authStateFromSession(session: Session | null): AuthState {
  if (!session) {
    return {
      phase: "signed-out",
      identity: null,
      error: null,
    };
  }

  return {
    phase: "signed-in",
    identity: {
      userId: session.user.id,
      email: session.user.email ?? null,
    },
    error: null,
  };
}

export function authErrorState(error: unknown): AuthState {
  return {
    phase: "error",
    identity: null,
    error: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Auth alone never grants access to the account-neutral local database.
 * A later checkpoint must resolve the explicit adoption choice and mount a
 * user-scoped database before canonical providers may render.
 */
export function selectAuthDataAccess(state: AuthState): AuthDataAccess {
  switch (state.phase) {
    case "hydrating":
      return "wait-for-auth";
    case "signed-out":
      return "show-auth";
    case "error":
      return "show-auth-error";
    case "signed-in":
      return "require-local-data-setup";
  }
}
