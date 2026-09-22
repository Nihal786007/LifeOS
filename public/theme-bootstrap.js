// This runs before React and styles load, keeping the first paint in the selected theme.
(() => {
  let preference = "system";
  try {
    const stored = localStorage.getItem("lifeos-appearance-v1");
    if (stored === "light" || stored === "dark") preference = stored;
  } catch {
    // Private browsing can deny storage; system preference remains usable.
  }
  const systemDark = matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = preference === "system"
    ? (systemDark ? "dark" : "light")
    : preference;
})();
