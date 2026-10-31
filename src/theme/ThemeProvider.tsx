import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import {
  applyResolvedTheme,
  readAppearancePreference,
  resolveTheme,
  saveAppearancePreference,
  watchSystemTheme,
  type AppearancePreference,
} from "./appearance";
import { ThemeContext } from "./themeContext";

const systemDarkQuery = "(prefers-color-scheme: dark)";

export function ThemeProvider({ children, storage = window.localStorage }: { children: ReactNode; storage?: Pick<Storage, "getItem" | "setItem"> }) {
  const [preference, setPreference] = useState<AppearancePreference>(() => readAppearancePreference(storage));
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(systemDarkQuery).matches);
  const resolvedTheme = resolveTheme(preference, systemDark);

  useLayoutEffect(() => {
    applyResolvedTheme(document.documentElement, resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => watchSystemTheme(window.matchMedia(systemDarkQuery), setSystemDark), []);

  function updatePreference(next: AppearancePreference) {
    if (!saveAppearancePreference(storage, next)) return;
    setPreference(next);
  }

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference: updatePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
