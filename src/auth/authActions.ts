import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthActionResult } from "./types";

function failure(error: unknown): AuthActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
}

export async function signInWithPassword(
  client: SupabaseClient,
  email: string,
  password: string
): Promise<AuthActionResult> {
  try {
    const { error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? failure(error) : { ok: true, error: null };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function signUpWithPassword(
  client: SupabaseClient,
  email: string,
  password: string
): Promise<AuthActionResult> {
  try {
    const { error } = await client.auth.signUp({
      email: email.trim(),
      password,
    });
    return error ? failure(error) : { ok: true, error: null };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function signOut(
  client: SupabaseClient
): Promise<AuthActionResult> {
  try {
    const { error } = await client.auth.signOut();
    return error ? failure(error) : { ok: true, error: null };
  } catch (error: unknown) {
    return failure(error);
  }
}
