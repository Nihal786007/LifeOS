import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  authErrorState,
  authStateFromSession,
} from "./authState";
import {
  signInWithPassword as executeSignIn,
  signOut as executeSignOut,
  signUpWithPassword as executeSignUp,
} from "./authActions";
import {
  supabaseClient,
  supabaseConfigurationError,
} from "./supabaseClient";
import { INITIAL_AUTH_STATE } from "./types";
import type { AuthActionResult, AuthState } from "./types";

interface AuthContextValue extends AuthState {
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<AuthActionResult>;
  signUpWithPassword: (
    email: string,
    password: string
  ) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
}

interface AuthProviderProps {
  children: ReactNode;
  client?: SupabaseClient | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  client = supabaseClient,
}: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => client
    ? INITIAL_AUTH_STATE
    : authErrorState(
        supabaseConfigurationError ?? "Supabase is unavailable."
      ));

  useEffect(() => {
    if (!client) return;

    let active = true;
    let authEventObserved = false;

    const { data: listener } = client.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        authEventObserved = true;
        setState(authStateFromSession(session));
      }
    );

    void client.auth.getSession().then(({ data, error }) => {
      if (!active || authEventObserved) return;
      setState(error ? authErrorState(error) : authStateFromSession(data.session));
    }).catch((error: unknown) => {
      if (active && !authEventObserved) setState(authErrorState(error));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  const signInWithPassword = useCallback(async (
    email: string,
    password: string
  ): Promise<AuthActionResult> => {
    if (!client) return { ok: false, error: "Supabase is unavailable." };
    return executeSignIn(client, email, password);
  }, [client]);

  const signUpWithPassword = useCallback(async (
    email: string,
    password: string
  ): Promise<AuthActionResult> => {
    if (!client) return { ok: false, error: "Supabase is unavailable." };
    return executeSignUp(client, email, password);
  }, [client]);

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!client) return { ok: false, error: "Supabase is unavailable." };
    return executeSignOut(client);
  }, [client]);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  }), [state, signInWithPassword, signUpWithPassword, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
