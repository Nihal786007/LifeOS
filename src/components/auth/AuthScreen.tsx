import { useState } from "react";

import { useAuth } from "../../auth/AuthContext";

type AuthMode = "sign-in" | "sign-up";

export default function AuthScreen() {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!email.trim() || !password) {
      setMessage("Enter your email and password.");
      return;
    }

    setBusy(true);
    const result = mode === "sign-in"
      ? await signInWithPassword(email, password)
      : await signUpWithPassword(email, password);
    setBusy(false);

    if (!result.ok) {
      setMessage(result.error ?? "Authentication failed.");
      return;
    }

    if (mode === "sign-up") {
      setMessage("Account created. Check your email if confirmation is required.");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-400">
          LifeOS
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {mode === "sign-in" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Sign in securely. Your existing device data will not be uploaded or attached to an account without your explicit approval.
        </p>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-slate-200">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-60"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-200">
            Password
            <input
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-60"
            />
          </label>

          {message && (
            <p className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-300" role="status">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-wait disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setMode((current) => current === "sign-in" ? "sign-up" : "sign-in");
            setMessage(null);
          }}
          className="mt-5 w-full text-sm font-semibold text-cyan-300 transition hover:text-cyan-200 disabled:opacity-60"
        >
          {mode === "sign-in"
            ? "New to LifeOS? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
