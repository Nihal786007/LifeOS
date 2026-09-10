import { defineConfig } from "vite";
import type { PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import * as wasmPlugin from "vite-plugin-wasm";

function resolvePluginFactory(module: unknown): () => PluginOption {
  let candidate = module;

  while (
    typeof candidate === "object" &&
    candidate !== null &&
    "default" in candidate
  ) {
    candidate = candidate.default;
  }

  if (typeof candidate !== "function") {
    throw new TypeError("Expected a Vite plugin factory");
  }

  return candidate as () => PluginOption;
}

const wasm = resolvePluginFactory(wasmPlugin);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
  ],
  optimizeDeps: {
    exclude: [
      "@journeyapps/wa-sqlite",
      "@powersync/web",
    ],
  },
  worker: {
    format: "es",
    plugins: () => [
      wasm(),
    ],
  },
});
