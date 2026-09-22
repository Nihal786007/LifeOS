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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<AppearancePreference>(() => readAppearancePreference(window.localStorage));
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(systemDarkQuery).matches);
  const resolvedTheme = resolveTheme(preference, systemDark);

  useLayoutEffect(() => {
    applyResolvedTheme(document.documentElement, resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => watchSystemTheme(window.matchMedia(systemDarkQuery), setSystemDark), []);

  function updatePreference(next: AppearancePreference) {
    if (!saveAppearancePreference(window.localStorage, next)) return;
    setPreference(next);
  }

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference: updatePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
