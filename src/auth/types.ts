export type AuthPhase =
  | "hydrating"
  | "signed-out"
  | "signed-in"
  | "error";

export interface AuthIdentity {
  userId: string;
  email: string | null;
}

export interface AuthState {
  phase: AuthPhase;
  identity: AuthIdentity | null;
  error: string | null;
}

export interface AuthActionResult {
  ok: boolean;
  error: string | null;
}

export const INITIAL_AUTH_STATE: AuthState = {
  phase: "hydrating",
  identity: null,
  error: null,
};
