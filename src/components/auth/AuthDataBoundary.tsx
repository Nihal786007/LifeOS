import type { ReactNode } from "react";

import { selectAuthDataAccess } from "../../auth/authState";
import { useAuth } from "../../auth/AuthContext";
import AuthScreen from "./AuthScreen";

interface AuthDataBoundaryProps {
  children: ReactNode;
}

export default function AuthDataBoundary({ children }: AuthDataBoundaryProps) {
  const auth = useAuth();
  const access = selectAuthDataAccess(auth);

  if (access === "wait-for-auth") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 text-sm text-slate-400" role="status">
        Restoring your secure session…
      </main>
    );
  }

  if (access === "show-auth-error") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 text-center text-sm text-rose-300" role="alert">
        Authentication could not start. {auth.error ?? "Check the local Supabase configuration."}
      </main>
    );
  }

  if (access === "show-auth") return <AuthScreen />;

  if (access === "show-app") return <>{children}</>;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/80 p-7 text-center shadow-2xl shadow-cyan-950/20">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">
          Account secured
        </p>
        <h1 className="mt-3 text-2xl font-black">
          Choose your data setup next
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Signed in as {auth.identity?.email ?? "your account"}. LifeOS is intentionally not opening the unbound device database until you choose whether to adopt it or use cloud data.
        </p>
        <button
          type="button"
          onClick={() => void auth.signOut()}
          className="mt-6 rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
