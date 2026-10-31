import { createContext, useContext } from "react";


export interface XPContextType {
  totalXP: number;

  level: number;

  progress: number;

  xpNeededForNextLevel: number;
}

export const XPContext =
  createContext<XPContextType | null>(
    null
  );

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
