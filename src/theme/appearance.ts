export type AppearancePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const APPEARANCE_STORAGE_KEY = "lifeos-appearance-v1";

export function parseAppearancePreference(value: string | null): AppearancePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function resolveTheme(preference: AppearancePreference, systemDark: boolean): ResolvedTheme {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function readAppearancePreference(storage: Pick<Storage, "getItem">): AppearancePreference {
  try {
    return parseAppearancePreference(storage.getItem(APPEARANCE_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function saveAppearancePreference(storage: Pick<Storage, "setItem">, preference: AppearancePreference): boolean {
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

export function applyResolvedTheme(root: Pick<HTMLElement, "dataset">, resolvedTheme: ResolvedTheme): void {
  root.dataset.theme = resolvedTheme;
}

export function watchSystemTheme(
  media: Pick<MediaQueryList, "addEventListener" | "removeEventListener">,
  onChange: (dark: boolean) => void,
): () => void {
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
