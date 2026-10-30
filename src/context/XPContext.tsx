import { XPContext } from "./xpContextValue";
import {
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
