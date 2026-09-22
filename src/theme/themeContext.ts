import { createContext, useContext } from "react";
import type { AppearancePreference, ResolvedTheme } from "./appearance";

export type ThemeContextValue = {
  preference: AppearancePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: AppearancePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is required");
  return context;
}
