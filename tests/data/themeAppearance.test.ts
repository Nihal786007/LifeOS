import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

import {
  APPEARANCE_STORAGE_KEY,
  applyResolvedTheme,
  readAppearancePreference,
  resolveTheme,
  saveAppearancePreference,
  watchSystemTheme,
} from "../../src/theme/appearance.ts";

function storage(initial: string | null = null) {
  const values = new Map<string, string>();
  if (initial !== null) values.set(APPEARANCE_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    values,
  };
}

test("default and invalid appearance preferences safely follow System", () => {
  assert.equal(readAppearancePreference(storage()), "system");
  assert.equal(readAppearancePreference(storage("invalid")), "system");
  assert.equal(readAppearancePreference({ getItem: () => { throw new Error("denied"); } }), "system");
});

test("Light, Dark, and System preferences persist as one versioned value", () => {
  const store = storage();
  for (const preference of ["light", "dark", "system"] as const) {
    assert.equal(saveAppearancePreference(store, preference), true);
    assert.equal(readAppearancePreference(store), preference);
    assert.deepEqual([...store.values.keys()], [APPEARANCE_STORAGE_KEY]);
  }
  assert.equal(saveAppearancePreference({ setItem: () => { throw new Error("denied"); } }, "dark"), false);
});

test("System resolves from OS appearance; forced modes ignore OS changes", () => {
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("OS changes update System mode and cleanly unsubscribe", () => {
  let listener: ((event: { matches: boolean }) => void) | null = null;
  let systemDark = false;
  const media = {
    addEventListener: (_type: string, callback: typeof listener) => { listener = callback; },
    removeEventListener: (_type: string, callback: typeof listener) => {
      assert.equal(listener, callback);
      listener = null;
    },
  };
  const stop = watchSystemTheme(media as unknown as MediaQueryList, dark => { systemDark = dark; });
  const change = listener as unknown as (event: { matches: boolean }) => void;
  change({ matches: true });
  assert.equal(resolveTheme("system", systemDark), "dark");
  assert.equal(resolveTheme("light", systemDark), "light");
  change({ matches: false });
  assert.equal(resolveTheme("dark", systemDark), "dark");
  stop();
  assert.equal(listener, null);
});

test("resolved theme writes only the root data-theme contract", () => {
  const root = { dataset: {} as DOMStringMap };
  applyResolvedTheme(root, "light");
  assert.deepEqual(root.dataset, { theme: "light" });
  applyResolvedTheme(root, "dark");
  assert.deepEqual(root.dataset, { theme: "dark" });
});

test("pre-paint bootstrap applies a valid preference and safely falls back", () => {
  const script = readFileSync(resolve("public/theme-bootstrap.js"), "utf8");
  for (const [stored, systemDark, expected] of [
    ["light", true, "light"], ["dark", false, "dark"],
    ["system", true, "dark"], ["invalid", false, "light"],
  ] as const) {
    const document = { documentElement: { dataset: {} as Record<string, string> } };
    runInNewContext(script, {
      document,
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: systemDark }),
    });
    assert.equal(document.documentElement.dataset.theme, expected);
  }
  const html = readFileSync(resolve("index.html"), "utf8");
  assert.ok(html.indexOf("/theme-bootstrap.js") < html.indexOf("/src/main.tsx"));
});

test("Settings exposes three native keyboard-accessible choices bound to preference", () => {
  const settings = readFileSync(resolve("src/pages/Settings.tsx"), "utf8");
  assert.match(settings, /useTheme\(\)/);
  assert.match(settings, /\["system", "light", "dark"\]/);
  assert.match(settings, /type="radio"/);
  assert.match(settings, /checked=\{preference === mode\}/);
  assert.match(settings, /onChange=\{\(\) => setPreference\(mode\)\}/);
});
