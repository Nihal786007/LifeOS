import { STORAGE_KEYS } from "../constants/storage";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import { XPEngine } from "../engines/XPEngine";

interface XPContextType {
  totalXP: number;

  level: number;

  progress: number;

  xpNeededForNextLevel: number;

  addXP: (
    amount: number
  ) => void;

  removeXP: (
    amount: number
  ) => void;

  resetXP: () => void;
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
  const [totalXP, setTotalXP] =
    useState<number>(() => {
      const saved =
        localStorage.getItem(
          STORAGE_KEYS.TOTAL_XP
        );

      if (!saved) {
        return 0;
      }

      const parsed =
        Number(saved);

      return Number.isFinite(parsed)
        ? parsed
        : 0;
    });

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.TOTAL_XP,
      totalXP.toString()
    );
  }, [totalXP]);

  function addXP(
    amount: number
  ) {
    if (amount <= 0) {
      return;
    }

    setTotalXP(
      (previous) =>
        previous + amount
    );
  }

  function removeXP(
    amount: number
  ) {
    if (amount <= 0) {
      return;
    }

    setTotalXP(
      (previous) =>
        Math.max(
          0,
          previous - amount
        )
    );
  }

  function resetXP() {
    setTotalXP(0);
  }

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

        addXP,
        removeXP,
        resetXP,
      }}
    >
      {children}
    </XPContext.Provider>
  );
}

export function useXP() {
  const context =
    useContext(XPContext);

  if (!context) {
    throw new Error(
      "useXP must be used inside XPProvider"
    );
  }

  return context;
}