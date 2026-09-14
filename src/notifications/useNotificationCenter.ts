import {
  useCallback,
  useEffect,
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
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationEngine,
} from "./notificationEngine.ts";

import type {
  LifeOSNotification,
  NotificationCategory,
} from "./notificationEngine";

import { NotificationStore } from "./notificationStore.ts";
import { useDataServices } from "../data/DataServicesContext";
import type { NotificationUIState } from "./notificationStore";

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
  const { notificationStateRepository } = useDataServices();
  const store = useMemo(
    () => new NotificationStore(notificationStateRepository),
    [notificationStateRepository]
  );
  const [uiState, setUIState] = useState<NotificationUIState | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    void notificationStateRepository.initialize().then(() => {
      if (!active) return;
      setUIState(store.load());
      setPersistenceError(null);
      unsubscribe = store.subscribe(() => {
        if (!active) return;
        const persistence = notificationStateRepository.getPersistenceState();
        if (persistence.phase === "error") {
          setPersistenceError(
            persistence.error?.message ?? "Notification settings could not be saved."
          );
          return;
        }
        setUIState(store.load());
        setPersistenceError(null);
      });
    }).catch((error: unknown) => {
      if (!active) return;
      setPersistenceError(error instanceof Error ? error.message : String(error));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [notificationStateRepository, store]);

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
        preferences: uiState?.preferences ?? DEFAULT_NOTIFICATION_PREFERENCES,
      }),
    [
      canonicalState,
      deterministic.intelligenceReport,
      proactive,
      uiState?.preferences,
    ]
  );

  const dismissed = useMemo(
    () => new Set(uiState?.dismissedIds ?? []),
    [uiState?.dismissedIds]
  );
  const read = useMemo(() => new Set(uiState?.readIds ?? []), [uiState?.readIds]);
  const notifications = useMemo<readonly NotificationView[]>(
    () =>
      (uiState ? derived : [])
        .filter((notification) => !dismissed.has(notification.id))
        .map((notification) => ({
          ...notification,
          read: read.has(notification.id),
        })),
    [derived, dismissed, read, uiState]
  );
  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const markRead = useCallback(
    (id: string) => {
      if (persistenceError) return;
      setUIState((current) => current ? store.markRead(current, id) : current);
    },
    [persistenceError, store]
  );

  const markAllRead = useCallback(() => {
    if (persistenceError) return;
    setUIState((current) => current
      ? store.markAllRead(
        current,
        notifications.map((notification) => notification.id)
      )
      : current
    );
  }, [notifications, persistenceError, store]);

  const dismiss = useCallback(
    (id: string) => {
      if (persistenceError) return;
      setUIState((current) => current ? store.dismiss(current, id) : current);
    },
    [persistenceError, store]
  );

  const setCategoryEnabled = useCallback(
    (category: NotificationCategory, enabled: boolean) => {
      if (persistenceError) return;
      setUIState((current) => current
        ? store.setCategoryEnabled(current, category, enabled)
        : current
      );
    },
    [persistenceError, store]
  );

  return {
    notifications,
    unreadCount,
    ready: uiState !== null,
    persistenceError,
    preferences: uiState?.preferences,
    markRead,
    markAllRead,
    dismiss,
    setCategoryEnabled,
  };
}
