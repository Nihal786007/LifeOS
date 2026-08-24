import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  XPEngine,
} from "../engines/XPEngine";

import {
  ExecutionHistoryService,
} from "../services/ExecutionHistoryService";

interface XPContextType {
  totalXP: number;

  level: number;

  progress: number;

  xpNeededForNextLevel: number;
}

const XPContext =
  createContext<XPContextType | null>(
    null
  );

export function XPProvider({
  children,
}: {
  children: ReactNode;
}) {
  // ==========================================
  // Derived XP Read Model
  // ==========================================

  const [
    totalXP,
    setTotalXP,
  ] = useState<number>(
    () =>
      ExecutionHistoryService.getTotalXP()
  );

  // ==========================================
  // Execution History Subscription
  // ==========================================

  useEffect(() => {
    function refreshXP() {
      setTotalXP(
        ExecutionHistoryService.getTotalXP()
      );
    }

    refreshXP();

    const unsubscribe =
      ExecutionHistoryService.subscribe(
        refreshXP
      );

    return unsubscribe;
  }, []);

  // ==========================================
  // Progression
  // ==========================================

  const level =
    XPEngine.getLevel(
      totalXP
    );

  const progress =
    XPEngine.getLevelProgress(
      totalXP
    );

  const xpNeededForNextLevel =
    XPEngine.getXPNeededForNextLevel(
      totalXP
    );

  return (
    <XPContext.Provider
      value={{
        totalXP,
        level,
        progress,
        xpNeededForNextLevel,
      }}
    >
      {children}
    </XPContext.Provider>
  );
}

export function useXP() {
  const context =
    useContext(
      XPContext
    );

  if (!context) {
    throw new Error(
      "useXP must be used inside XPProvider"
    );
  }

  return context;
}