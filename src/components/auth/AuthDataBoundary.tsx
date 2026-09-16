import type { ReactNode } from "react";

import { selectAuthDataAccess } from "../../auth/authState";
import { useAuth } from "../../auth/AuthContext";
import AuthScreen from "./AuthScreen";
import { useAccountData } from "../../data/account/AccountDataContext";

interface AuthDataBoundaryProps {
  children: ReactNode;
}

export default function AuthDataBoundary({ children }: AuthDataBoundaryProps) {
  const auth = useAuth();
  const account = useAccountData();
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

  if (account.phase === "ready") return <>{children}</>;

  if (account.phase === "checking" || account.phase === "preparing") {
    return <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 text-sm text-slate-400" role="status">{account.phase === "checking" ? "Checking your account data…" : "Preparing your secure LifeOS workspace…"}</main>;
  }

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
          Signed in as {auth.identity?.email ?? "your account"}. Choose what LifeOS should do with data already stored on this device.
        </p>
        {account.error && <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200" role="alert">{account.error}</p>}
        <div className="mt-6 grid gap-3 text-left">
          <button type="button" onClick={() => void account.chooseAdoption()} className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-4 text-left transition hover:border-cyan-300"><span className="block font-black text-cyan-200">Adopt this device’s data into this account</span><span className="mt-1 block text-xs leading-5 text-slate-400">Uploads canonical LifeOS data only after conflict checks.</span></button>
          <button type="button" onClick={() => void account.chooseCloud()} className="rounded-xl border border-slate-700 px-5 py-4 text-left transition hover:border-cyan-400/50"><span className="block font-black text-slate-100">Use existing cloud data</span><span className="mt-1 block text-xs leading-5 text-slate-400">Leaves this device’s unbound data unchanged.</span></button>
        </div>
        <button
          type="button"
          onClick={() => void auth.signOut()}
          className="mt-6 rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
        >
          Cancel sign-in setup
        </button>
      </section>
    </main>
  );
}
