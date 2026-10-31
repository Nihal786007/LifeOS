import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Bounded format detection, not entropy analysis or a security certification.
// Never return matches, offsets, excerpts, credential lengths or digests.
const credentialPatterns = [
  /sb_secret_[A-Za-z0-9_-]{16,}/,
  /sk-[A-Za-z0-9_-]{24,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  /AIza[A-Za-z0-9_-]{35}/,
  /ya29\.[A-Za-z0-9_-]{20,}/,
  /GOCSPX-[A-Za-z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^\s<>]+/,
];
const serverMarkers = [
  "GOOGLE_CALENDAR_CLIENT_SECRET", "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY",
  "SUPABASE_SERVICE_ROLE_KEY", "access_token_ciphertext", "refresh_token_ciphertext",
  "calendarCmsRecoveryRehearsal", "calendarRecoveryRehearsal", "calendarSyntheticKeyCustody",
  "LIFEOS-SYNTHETIC-V1", "maintenance-entry", "calendar_maintenance",
];
const privateHelpers = new Set([
  "tools/verification/calendarRecoveryRehearsal.mjs",
  "tools/verification/calendarCmsRecoveryRehearsal.mjs",
  "tools/verification/calendarSyntheticKeyCustody.ps1",
]);
const ciCandidates = [
  ".github/workflows/ci.yml", "scripts/ci/security-check.mjs",
  "scripts/ci/security-check.test.mjs", "docs/continuous-integration.md",
];
const textFile = /\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|sql|txt|css|html|svg)$/i;

export function containsCredentialFormat(text) {
  return credentialPatterns.some(pattern => pattern.test(text));
}

export function forbiddenSourcePath(path) {
  const normalized = path.replaceAll("\\", "/");
  const base = normalized.split("/").at(-1);
  return privateHelpers.has(normalized)
    || (/^\.env(?:\.|$)/.test(base) && !base.endsWith(".example"))
    || /\.(?:pem|key|pfx|p12|p8|dpapi|cms|aesgcm|dump|backup)(?:\.gz)?$/i.test(base)
    || /\.sql\.(?:gz|zst)$/i.test(base)
    || /(?:^|\/)(?:backups|recovery-private|\.local-verification|\.pgdata|postgresql-data|node_modules|dist)(?:\/|$)/.test(normalized)
    || normalized === "src.zip";
}

export function containsBundleExposure(text) {
  return containsCredentialFormat(text) || serverMarkers.some(marker => text.includes(marker));
}

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("symbolic_link_rejected");
    return entry.isDirectory() ? filesBelow(path) : entry.isFile() ? [path] : [];
  });
}

function main(mode) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  let violations = 0;
  let checked = 0;
  if (mode === "source") {
    const result = spawnSync("git", ["-C", root, "ls-files", "-z"], {
      encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
    });
    if (result.error || result.status !== 0) throw new Error("tracked_file_inventory_failed");
    const paths = new Set(result.stdout.split("\0").filter(Boolean));
    // Also inspect these fixed untracked candidates during local pre-commit review.
    for (const path of ciCandidates) {
      try { lstatSync(join(root, path)); paths.add(path); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    for (const path of paths) {
      checked++;
      if (forbiddenSourcePath(path)) { violations++; continue; }
      const absolute = resolve(root, path);
      if (relative(root, absolute).startsWith("..")) throw new Error("path_escape_rejected");
      const stat = lstatSync(absolute);
      if (!stat.isFile() || stat.isSymbolicLink()) { violations++; continue; }
      if (textFile.test(path) || path === ".gitignore") {
        if (containsCredentialFormat(readFileSync(absolute, "utf8"))) violations++;
      }
    }
  } else if (mode === "bundle") {
    const files = filesBelow(join(root, "dist")).filter(path => /\.(?:js|css|html|json)$/i.test(path));
    if (!files.some(path => path.endsWith("index.html"))) throw new Error("client_build_missing");
    for (const path of files) {
      checked++;
      if (containsBundleExposure(readFileSync(path, "utf8"))) violations++;
    }
  } else throw new Error("unsupported_scan_mode");
  if (violations) {
    // Fixed-category counts only: even a malicious filename cannot leak into logs.
    console.error(`Security scan blocked: ${violations} file(s) require local review. Matched values are not logged.`);
    process.exitCode = 1;
  } else console.log(`Security scan passed: ${checked} files checked (${mode}); pattern coverage is limited.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main(process.argv[2]); }
  catch { console.error("Security scan failed closed; inspect the local setup without sharing credentials."); process.exitCode = 1; }
}
