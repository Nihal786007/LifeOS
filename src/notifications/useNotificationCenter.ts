import {
  useCallback,
  useMemo,
  useState,
} from "react";

import type {
  AtlasAIOrchestrator,
} from "../atlas/orchestration/AtlasAIOrchestrator";

import {
  ProactiveInsightEngine,
} from "../atlas/proactive/proactiveInsightEngine";

import {
  useAtlasCanonicalState,
} from "../atlas/state/useAtlasCanonicalState";

import {
  NotificationEngine,
} from "./notificationEngine.ts";

import type {
  LifeOSNotification,
  NotificationCategory,
} from "./notificationEngine";

import {
  getBrowserNotificationStore,
} from "./notificationStore.ts";

export interface NotificationView extends LifeOSNotification {
  read: boolean;
}

function toLocalDateKey(value: string): string {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function useNotificationCenter(
  orchestrator: AtlasAIOrchestrator
) {
  const canonicalState = useAtlasCanonicalState();
  const store = useMemo(() => getBrowserNotificationStore(), []);
  const [uiState, setUIState] = useState(() => store.load());

  const deterministic = useMemo(
    () => orchestrator.buildDeterministicPackage(canonicalState),
    [canonicalState, orchestrator]
  );
  const proactive = useMemo(
    () =>
      new ProactiveInsightEngine().create(
        deterministic.reasoningContext
      ),
    [deterministic.reasoningContext]
  );
  const derived = useMemo(
    () =>
      new NotificationEngine().create({
        state: canonicalState,
        intelligence: deterministic.intelligenceReport,
        proactive,
        localDate: toLocalDateKey(canonicalState.capturedAt),
        preferences: uiState.preferences,
      }),
    [
      canonicalState,
      deterministic.intelligenceReport,
      proactive,
      uiState.preferences,
    ]
  );

  const dismissed = useMemo(
    () => new Set(uiState.dismissedIds),
    [uiState.dismissedIds]
  );
  const read = useMemo(() => new Set(uiState.readIds), [uiState.readIds]);
  const notifications = useMemo<readonly NotificationView[]>(
    () =>
      derived
        .filter((notification) => !dismissed.has(notification.id))
        .map((notification) => ({
          ...notification,
          read: read.has(notification.id),
        })),
    [derived, dismissed, read]
  );
  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const markRead = useCallback(
    (id: string) => {
      setUIState((current) => store.markRead(current, id));
    },
    [store]
  );

  const markAllRead = useCallback(() => {
    setUIState((current) =>
      store.markAllRead(
        current,
        notifications.map((notification) => notification.id)
      )
    );
  }, [notifications, store]);

  const dismiss = useCallback(
    (id: string) => {
      setUIState((current) => store.dismiss(current, id));
    },
    [store]
  );

  const setCategoryEnabled = useCallback(
    (category: NotificationCategory, enabled: boolean) => {
      setUIState((current) =>
        store.setCategoryEnabled(current, category, enabled)
      );
    },
    [store]
  );

  return {
    notifications,
    unreadCount,
    preferences: uiState.preferences,
    markRead,
    markAllRead,
    dismiss,
    setCategoryEnabled,
  };
}
