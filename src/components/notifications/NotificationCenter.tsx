import {
  useEffect,
  useState,
} from "react";

import {
  FaBell,
  FaCheckDouble,
  FaGear,
  FaXmark,
} from "react-icons/fa6";

import type {
  AtlasAIOrchestrator,
} from "../../atlas/orchestration/AtlasAIOrchestrator";

import type {
  NotificationCategory,
  NotificationSeverity,
} from "../../notifications/notificationEngine";

import {
  useNotificationCenter,
} from "../../notifications/useNotificationCenter";

interface NotificationCenterProps {
  orchestrator: AtlasAIOrchestrator;
}

const CATEGORY_LABELS: Readonly<
  Record<NotificationCategory, string>
> = {
  tasks: "Tasks",
  habits: "Habits",
  planning: "Planning",
  xp: "XP",
  atlas: "ATLAS Signals",
};

const SEVERITY_STYLES: Readonly<
  Record<NotificationSeverity, string>
> = {
  info: "bg-cyan-400 shadow-cyan-400/40",
  attention: "bg-amber-400 shadow-amber-400/40",
  important: "bg-rose-400 shadow-rose-400/40",
};

function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Today";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function NotificationCenter({
  orchestrator,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    preferences,
    markRead,
    markAllRead,
    dismiss,
    setCategoryEnabled,
  } = useNotificationCenter(orchestrator);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="fixed right-4 top-3 z-40 lg:right-8 lg:top-6">
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Open notifications, ${unreadCount} unread`
            : "Open notifications"
        }
        aria-controls="lifeos-notification-panel"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/95 text-slate-300 shadow-lg shadow-black/20 transition hover:border-cyan-400/40 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <FaBell aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-cyan-400 px-1 text-[9px] font-black text-slate-950"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-slate-950/55 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none"
          />

          <section
            id="lifeos-notification-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lifeos-notification-title"
            className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] top-20 z-50 flex flex-col overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950/98 shadow-2xl shadow-black/60 sm:left-auto sm:right-4 sm:w-[26rem] lg:bottom-auto lg:right-6 lg:top-20 lg:max-h-[calc(100dvh-6.5rem)]"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400">
                  LifeOS
                </p>
                <h2
                  id="lifeos-notification-title"
                  className="mt-1 text-lg font-black text-white"
                >
                  Notifications
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Derived from your current LifeOS state.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Notification preferences"
                  aria-pressed={settingsOpen}
                  onClick={() => setSettingsOpen((current) => !current)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-300"
                >
                  <FaGear aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition hover:border-slate-600 hover:text-white"
                >
                  <FaXmark aria-hidden="true" />
                </button>
              </div>
            </header>

            {settingsOpen && (
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/55 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Show categories
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map(
                    (category) => (
                      <label
                        key={category}
                        className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-300"
                      >
                        {CATEGORY_LABELS[category]}
                        <input
                          type="checkbox"
                          checked={preferences[category]}
                          onChange={(event) =>
                            setCategoryEnabled(category, event.target.checked)
                          }
                          className="h-4 w-4 accent-cyan-400"
                        />
                      </label>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col">
              {notifications.length > 0 && (
                <div className="flex shrink-0 items-center justify-between border-b border-slate-800/80 px-5 py-3">
                  <p className="text-xs text-slate-500">
                    {unreadCount} unread · {notifications.length} visible
                  </p>
                  <button
                    type="button"
                    disabled={unreadCount === 0}
                    onClick={markAllRead}
                    className="flex min-h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-default disabled:text-slate-600"
                  >
                    <FaCheckDouble aria-hidden="true" />
                    Mark all read
                  </button>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                {notifications.length === 0 ? (
                  <div className="flex h-full min-h-48 items-center justify-center px-8 text-center">
                    <div>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-300">
                        <FaBell aria-hidden="true" />
                      </div>
                      <p className="mt-4 text-sm font-bold text-slate-200">
                        All clear. Nothing needs your attention right now.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <article
                        key={notification.id}
                        className={`group relative rounded-2xl border p-4 transition ${
                          notification.read
                            ? "border-slate-800 bg-slate-900/35"
                            : "border-cyan-400/15 bg-slate-900/80"
                        }`}
                      >
                        <button
                          type="button"
                          aria-label={`Mark ${notification.title} as read`}
                          onClick={() => markRead(notification.id)}
                          className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                        />
                        <div className="relative pointer-events-none flex items-start gap-3">
                          <span
                            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_12px] ${SEVERITY_STYLES[notification.severity]}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                                  {CATEGORY_LABELS[notification.category]}
                                </p>
                                <h3 className="mt-1 text-sm font-bold text-slate-100">
                                  {notification.title}
                                </h3>
                              </div>
                              {!notification.read && (
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-400">
                              {notification.message}
                            </p>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <time className="text-[10px] text-slate-600">
                                {formatNotificationTime(notification.createdAt)}
                              </time>
                              <button
                                type="button"
                                onClick={() => dismiss(notification.id)}
                                className="pointer-events-auto relative z-10 min-h-8 rounded-lg px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
