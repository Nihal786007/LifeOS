import {
  useEffect,
  useState,
} from "react";
import {
  FaBrain,
  FaBriefcase,
  FaCheckCircle,
  FaClock,
  FaDatabase,
  FaExclamationCircle,
  FaSignOutAlt,
  FaTrophy,
  FaUser,
} from "react-icons/fa";

import { useAuth } from "../auth/AuthContext";
import { useApp } from "../context/AppContext";
import { useXP } from "../context/XPContext";
import { useDataServices } from "../data/DataServicesContext";
import { resetLocalTaskActivity } from "../data/reset/resetLocalTaskActivity";
import type { UserProfile } from "../shared/types";
import { useTheme } from "../theme/themeContext";
import type { AppearancePreference } from "../theme/appearance";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import PageHero from "../components/ui/PageHero";

type ProfileDraft = Pick<
  UserProfile,
  "name" | "occupation" | "timezone" | "atlasPersonality"
>;

type SaveFeedback =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

type ResetState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "error"; message: string };

type SignOutState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "error"; message: string };

const ATLAS_PERSONALITIES: readonly UserProfile["atlasPersonality"][] = [
  "Professional",
  "Friendly",
  "Motivational",
];

function createDraft(profile: UserProfile): ProfileDraft {
  return {
    name: profile.name,
    occupation: profile.occupation,
    timezone: profile.timezone,
    atlasPersonality: profile.atlasPersonality,
  };
}

function isSupportedTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    }).format(new Date());

    return true;
  } catch {
    return false;
  }
}

function Settings() {
  const { preference, setPreference } = useTheme();
  const auth = useAuth();
  const { profile, updateProfile } = useApp();
  const {
    taskRepository,
    executionHistoryRepository,
  } = useDataServices();
  const {
    totalXP,
    level,
    progress,
    xpNeededForNextLevel,
  } = useXP();

  const [draft, setDraft] = useState<ProfileDraft>(() =>
    createDraft(profile)
  );
  const [feedback, setFeedback] = useState<SaveFeedback>({ kind: "idle" });
  const [resetState, setResetState] = useState<ResetState>({ kind: "idle" });
  const [signOutState, setSignOutState] = useState<SignOutState>({
    kind: "idle",
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(createDraft(profile));
  }, [profile]);

  function updateDraft<K extends keyof ProfileDraft>(
    field: K,
    value: ProfileDraft[K]
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setFeedback({ kind: "idle" });
  }

  function saveProfile() {
    const name = draft.name.trim();
    const occupation = draft.occupation.trim();
    const timezone = draft.timezone.trim();

    if (!name) {
      setFeedback({
        kind: "error",
        message: "Enter a display name before saving.",
      });
      return;
    }

    if (!timezone || !isSupportedTimeZone(timezone)) {
      setFeedback({
        kind: "error",
        message:
          "Enter a valid IANA timezone, such as Asia/Kolkata or America/New_York.",
      });
      return;
    }

    updateProfile({
      name,
      occupation,
      timezone,
      atlasPersonality: draft.atlasPersonality,
    });

    setFeedback({
      kind: "success",
      message: "Profile saved to this LifeOS workspace.",
    });
  }

  async function resetTestActivity() {
    const confirmed = confirm(
      "Permanently reset Tasks and Execution History in this account, including synced copies? Derived XP will reset.\n\nYour profile, goals, habits, captures, ATLAS Memory, and notification settings will be preserved."
    );

    if (!confirmed) {
      return;
    }

    setResetState({ kind: "working" });

    try {
      await resetLocalTaskActivity({
        taskRepository,
        executionHistoryRepository,
      });
      location.reload();
    } catch (error) {
      setResetState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function signOutCurrentSession() {
    setSignOutState({ kind: "working" });
    const result = await auth.signOut();

    if (!result.ok) {
      setSignOutState({
        kind: "error",
        message: result.error ?? "Sign out failed. Please try again.",
      });
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 pb-10">
      <PageHero
        badge="Personal Workspace"
        title="Profile & Settings"
        description="Keep your identity and ATLAS preferences accurate while your progress remains grounded in real execution history."
      >
        <Card className="border-cyan-500/20 bg-cyan-500/5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
            LifeOS profile
          </p>
          <p className="mt-4 text-3xl font-black text-white">
            {profile.name.trim() || "Profile not named yet"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {profile.occupation.trim() || "Add what you are working toward"}
          </p>
        </Card>
      </PageHero>

      <div className="grid gap-7 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-7">
          <Card className="border-slate-800 bg-slate-900/70">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-300">
                <FaUser size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  Identity
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">
                  How LifeOS addresses you
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  These details are part of your existing local profile.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <FaUser className="text-slate-500" />
                  Display name
                </span>
                <Input
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  placeholder="Enter your name"
                  autoComplete="name"
                />
                <span className="mt-2 block text-xs text-slate-600">
                  Required. Whitespace-only names are not accepted.
                </span>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <FaBriefcase className="text-slate-500" />
                  Occupation or focus
                </span>
                <Input
                  value={draft.occupation}
                  onChange={(event) =>
                    updateDraft("occupation", event.target.value)
                  }
                  placeholder="Student, engineer, designer..."
                  autoComplete="organization-title"
                />
                <span className="mt-2 block text-xs text-slate-600">
                  Optional context for your LifeOS profile.
                </span>
              </label>
            </div>
          </Card>

          <Card className="border-slate-800 bg-slate-900/70">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-violet-500/10 p-3 text-violet-300">
                <FaBrain size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                  Preferences
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">
                  Appearance, time, and ATLAS style
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Only preferences that are currently supported are shown.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <fieldset className="md:col-span-2">
                <legend className="mb-2 text-sm font-semibold text-lifeos-text-secondary">
                  Appearance
                </legend>
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-lifeos-border bg-lifeos-surface-secondary p-1" aria-label="Appearance">
                  {(["system", "light", "dark"] as const satisfies readonly AppearancePreference[]).map((mode) => (
                    <label key={mode} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="appearance"
                        value={mode}
                        checked={preference === mode}
                        onChange={() => setPreference(mode)}
                        className="peer sr-only"
                      />
                      <span className="block rounded-xl px-3 py-3 text-center text-sm font-semibold capitalize text-lifeos-text-secondary transition hover:bg-lifeos-hover peer-checked:bg-lifeos-selected peer-checked:text-lifeos-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lifeos-focus">
                        {mode}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-lifeos-muted">System follows this device’s appearance. This preference saves immediately.</p>
              </fieldset>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <FaClock className="text-slate-500" />
                  Timezone
                </span>
                <Input
                  value={draft.timezone}
                  onChange={(event) =>
                    updateDraft("timezone", event.target.value)
                  }
                  placeholder="Asia/Kolkata"
                  spellCheck={false}
                />
                <span className="mt-2 block text-xs text-slate-600">
                  Use an IANA timezone such as Europe/London.
                </span>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <FaBrain className="text-slate-500" />
                  ATLAS personality
                </span>
                <select
                  className="lifeos-field w-full"
                  value={draft.atlasPersonality}
                  onChange={(event) =>
                    updateDraft(
                      "atlasPersonality",
                      event.target.value as UserProfile["atlasPersonality"]
                    )
                  }
                >
                  {ATLAS_PERSONALITIES.map((personality) => (
                    <option key={personality} value={personality}>
                      {personality}
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-xs text-slate-600">
                  Controls the supported communication preference in your profile.
                </span>
              </label>
            </div>

            <div className="mt-7 flex flex-col gap-4 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div aria-live="polite" className="min-h-5">
                {feedback.kind !== "idle" && (
                  <p
                    className={`flex items-center gap-2 text-sm ${
                      feedback.kind === "success"
                        ? "text-emerald-300"
                        : "text-red-300"
                    }`}
                  >
                    {feedback.kind === "success" ? (
                      <FaCheckCircle />
                    ) : (
                      <FaExclamationCircle />
                    )}
                    {feedback.message}
                  </p>
                )}
              </div>
              <Button type="button" onClick={saveProfile}>
                Save profile
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-7">
          <Card className="border-amber-400/15 bg-gradient-to-br from-slate-900 to-amber-950/20">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber-400/10 p-3 text-amber-300">
                <FaTrophy size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                  Progress
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">
                  Level {level}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Read-only progress from execution history.
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
                <p className="text-3xl font-black text-white">
                  {totalXP.toLocaleString()}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Total XP
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
                <p className="text-3xl font-black text-amber-300">{progress}%</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Level progress
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-cyan-400 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {totalXP === 0
                  ? "Complete trusted work to begin earning XP."
                  : `${xpNeededForNextLevel} XP needed for level ${level + 1}.`}
              </p>
            </div>
          </Card>

          <Card className="border-slate-800 bg-slate-900/70">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-red-500/10 p-3 text-red-300">
                <FaDatabase size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
                  Data / System
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">
                  Local activity data
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  LifeOS keeps this account's data available locally and syncs it to your account.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-5">
              <h3 className="font-semibold text-white">
                Reset Tasks and Execution History
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Permanently removes Tasks and Execution History from this account,
                including synced copies. XP is derived from the remaining history.
                Profile, planning, habits, captures, ATLAS Memory, and notification
                settings remain intact.
              </p>
              <Button
                type="button"
                variant="danger"
                onClick={() => void resetTestActivity()}
                disabled={resetState.kind === "working"}
                className="mt-5"
              >
                {resetState.kind === "working"
                  ? "Resetting account activity…"
                  : "Reset account activity"}
              </Button>
              {resetState.kind === "error" && (
                <p className="mt-3 text-xs text-red-300" role="alert">
                  Reset failed. No reload was performed. {resetState.message}
                </p>
              )}
            </div>
          </Card>

          <Card className="border-slate-800 bg-slate-900/70">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-slate-800 p-3 text-slate-300">
                <FaSignOutAlt size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Account session
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">
                  Sign out of LifeOS
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  End this session and return to the sign-in screen. Your
                  LifeOS data is not deleted.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => void signOutCurrentSession()}
              disabled={signOutState.kind === "working"}
              className="mt-6"
            >
              <FaSignOutAlt />
              {signOutState.kind === "working" ? "Signing out…" : "Sign out"}
            </Button>
            {signOutState.kind === "error" && (
              <p className="mt-3 text-xs text-red-300" role="alert">
                {signOutState.message}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Settings;
