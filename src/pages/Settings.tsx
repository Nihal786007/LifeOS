import {
  useEffect,
  useState,
} from "react";
import {
  FaBrain,
  FaBriefcase,
  FaCalendarAlt,
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
import { useXP } from "../context/xpContextValue";
import { useDataServices } from "../data/DataServicesContext";
import { resetLocalTaskActivity } from "../data/reset/resetLocalTaskActivity";
import type { UserProfile } from "../shared/types";
import { useTheme } from "../theme/themeContext";
import { useGoogleCalendar } from "../connectors/googleCalendar/GoogleCalendarContext";
import { disconnectMessage, GOOGLE_CONNECTIONS_RECOVERY_URL } from "../connectors/googleCalendar/disconnectOutcome";
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
  const googleCalendar = useGoogleCalendar();
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

  async function disconnectGoogleCalendar() {
    if (!confirm("Disconnect Google Calendar from LifeOS? LifeOS will remove its stored connection and try to revoke Google authorization. Calendar access will stop and you may need to authorize again. No Google events will be deleted.")) return;
    await googleCalendar.disconnect();
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 pb-10">
      <PageHero
        badge="Personal Workspace"
        title="Profile & Settings"
        description="Keep your identity and ATLAS preferences accurate while your progress remains grounded in real execution history."
      >
        <Card className="border-lifeos-accent/20 bg-lifeos-accent/5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-lifeos-accent">
            LifeOS profile
          </p>
          <p className="mt-4 text-3xl font-bold text-lifeos-text">
            {profile.name.trim() || "Profile not named yet"}
          </p>
          <p className="mt-2 text-sm text-lifeos-text-secondary">
            {profile.occupation.trim() || "Add what you are working toward"}
          </p>
        </Card>
      </PageHero>

      <div className="grid gap-7 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-7">
          <Card className="border-lifeos-border bg-lifeos-surface/70">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-lifeos-accent/10 p-3 text-lifeos-accent"><FaCalendarAlt size={20} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-accent">Connected Apps</p>
                <h2 className="mt-1 text-xl font-bold text-lifeos-text">Google Calendar</h2>
                <p className="mt-1 text-sm text-lifeos-muted">Read-only calendars and upcoming events. Google events remain separate from LifeOS Tasks.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-lifeos-border bg-lifeos-surface-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-lifeos-text">{googleCalendar.connection.disconnectOutcome?.localAccessRemoved === false ? "Disconnect incomplete" : googleCalendar.connection.state === "connected" ? "Connected" : googleCalendar.connection.state === "connecting" ? "Checking connection…" : googleCalendar.connection.state === "network-failure" || googleCalendar.connection.state === "provider-failure" ? "Connection unverified" : "Not connected"}</p>
                {googleCalendar.connection.accountLabel && <p className="mt-1 text-sm text-lifeos-text-secondary">{googleCalendar.connection.accountLabel}</p>}
                {googleCalendar.connection.safeError && <p role="alert" className="mt-1 text-xs text-lifeos-danger">{googleCalendar.connection.safeError}</p>}
                {googleCalendar.connection.disconnectOutcome && <div role="status" aria-live="polite" className="mt-2 max-w-prose space-y-2 text-sm text-lifeos-text-secondary">
                  <p>{disconnectMessage(googleCalendar.connection.disconnectOutcome)}</p>
                  <a className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-lifeos-accent" href={GOOGLE_CONNECTIONS_RECOVERY_URL} target="_blank" rel="noopener noreferrer">Review Google Account access</a>
                </div>}
              </div>
              {googleCalendar.connection.state === "connected" || googleCalendar.connection.state === "network-failure" || googleCalendar.connection.disconnectOutcome?.reason === "in_progress" || googleCalendar.connection.disconnectOutcome?.localAccessRemoved === false
                ? <Button variant="secondary" onClick={() => void disconnectGoogleCalendar()}>Disconnect</Button>
                : <Button disabled={googleCalendar.connection.state === "connecting"} onClick={() => void googleCalendar.connect()}>{googleCalendar.connection.state === "connecting" ? "Connecting…" : "Connect"}</Button>}
            </div>
          </Card>

          <Card className="border-lifeos-border bg-lifeos-surface/70">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-lifeos-accent/10 p-3 text-lifeos-accent">
                <FaUser size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-accent">
                  Identity
                </p>
                <h2 className="mt-1 text-xl font-bold text-lifeos-text">
                  How LifeOS addresses you
                </h2>
                <p className="mt-1 text-sm text-lifeos-muted">
                  These details are part of your existing local profile.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-lifeos-text-secondary">
                  <FaUser className="text-lifeos-muted" />
                  Display name
                </span>
                <Input
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  placeholder="Enter your name"
                  autoComplete="name"
                />
                <span className="mt-2 block text-xs text-lifeos-muted">
                  Required. Whitespace-only names are not accepted.
                </span>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-lifeos-text-secondary">
                  <FaBriefcase className="text-lifeos-muted" />
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
                <span className="mt-2 block text-xs text-lifeos-muted">
                  Optional context for your LifeOS profile.
                </span>
              </label>
            </div>
          </Card>

          <Card className="border-lifeos-border bg-lifeos-surface/70">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-lifeos-chart-secondary/10 p-3 text-lifeos-chart-secondary">
                <FaBrain size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-chart-secondary">
                  Preferences
                </p>
                <h2 className="mt-1 text-xl font-bold text-lifeos-text">
                  Appearance, time, and ATLAS style
                </h2>
                <p className="mt-1 text-sm text-lifeos-muted">
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
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-lifeos-text-secondary">
                  <FaClock className="text-lifeos-muted" />
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
                <span className="mt-2 block text-xs text-lifeos-muted">
                  Use an IANA timezone such as Europe/London.
                </span>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-lifeos-text-secondary">
                  <FaBrain className="text-lifeos-muted" />
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
                <span className="mt-2 block text-xs text-lifeos-muted">
                  Controls the supported communication preference in your profile.
                </span>
              </label>
            </div>

            <div className="mt-7 flex flex-col gap-4 border-t border-lifeos-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div aria-live="polite" className="min-h-5">
                {feedback.kind !== "idle" && (
                  <p
                    className={`flex items-center gap-2 text-sm ${
                      feedback.kind === "success"
                        ? "text-lifeos-success"
                        : "text-lifeos-danger"
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
          <Card className="border-lifeos-warning/15 bg-gradient-to-br from-lifeos-surface to-lifeos-warning/20">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-lifeos-warning/10 p-3 text-lifeos-warning">
                <FaTrophy size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-warning">
                  Progress
                </p>
                <h2 className="mt-1 text-xl font-bold text-lifeos-text">
                  Level {level}
                </h2>
                <p className="mt-1 text-sm text-lifeos-muted">
                  Read-only progress from execution history.
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-lifeos-border bg-lifeos-app/55 p-5">
                <p className="text-3xl font-bold text-lifeos-text">
                  {totalXP.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-lifeos-muted">
                  Total XP
                </p>
              </div>
              <div className="rounded-2xl border border-lifeos-border bg-lifeos-app/55 p-5">
                <p className="text-3xl font-bold text-lifeos-warning">{progress}%</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-lifeos-muted">
                  Level progress
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 overflow-hidden rounded-full bg-lifeos-elevated">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lifeos-warning to-lifeos-accent transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-lifeos-muted">
                {totalXP === 0
                  ? "Complete trusted work to begin earning XP."
                  : `${xpNeededForNextLevel} XP needed for level ${level + 1}.`}
              </p>
            </div>
          </Card>

          <Card className="border-lifeos-border bg-lifeos-surface/70">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-lifeos-danger/10 p-3 text-lifeos-danger">
                <FaDatabase size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-danger">
                  Data / System
                </p>
                <h2 className="mt-1 text-xl font-bold text-lifeos-text">
                  Local activity data
                </h2>
                <p className="mt-1 text-sm leading-6 text-lifeos-muted">
                  LifeOS keeps this account's data available locally and syncs it to your account.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-lifeos-danger/15 bg-lifeos-danger/[0.04] p-5">
              <h3 className="font-semibold text-lifeos-text">
                Reset Tasks and Execution History
              </h3>
              <p className="mt-2 text-xs leading-5 text-lifeos-muted">
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
                <p className="mt-3 text-xs text-lifeos-danger" role="alert">
                  Reset failed. No reload was performed. {resetState.message}
                </p>
              )}
            </div>
          </Card>

          <Card className="border-lifeos-border bg-lifeos-surface/70">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-lifeos-elevated p-3 text-lifeos-text-secondary">
                <FaSignOutAlt size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-text-secondary">
                  Account session
                </p>
                <h2 className="mt-1 text-xl font-bold text-lifeos-text">
                  Sign out of LifeOS
                </h2>
                <p className="mt-1 text-sm leading-6 text-lifeos-muted">
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
              <p className="mt-3 text-xs text-lifeos-danger" role="alert">
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
