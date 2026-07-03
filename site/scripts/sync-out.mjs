#!/usr/bin/env node
/**
 * Sync the static export (site/out) into the repo root, which is the FTPS
 * deploy artifact for mnclockworks.com.
 *
 *   node scripts/sync-out.mjs preview  → repoRoot/v3/   (safe preview path)
 *   node scripts/sync-out.mjs root     → repoRoot/      (the live flip)
 *
 * Root mode refuses to touch legacy paths (blog, sitesniper, admin, etc.)
 * and tracks what it wrote in .deploy-manifest.json so stale export files
 * from earlier flips get cleaned up — and nothing else ever does.
 */
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const mode = process.argv[2];
if (!["preview", "root"].includes(mode)) {
  console.error("usage: sync-out.mjs <preview|root>");
  process.exit(1);
}

const siteDir = resolve(import.meta.dirname, "..");
const out = join(siteDir, "out");
const repoRoot = resolve(siteDir, "..");
const manifestPath = join(siteDir, ".deploy-manifest.json");

// Paths at repo root the sync must never create, modify, or delete.
const PROTECTED = new Set([
  ".git", ".github", ".gitignore", ".htaccess",
  "blog", "sitesniper", "sniper", "sprocket", "learn", "cowork", "contact",
  "docs", "images", "social",
  "admin.html", "privacy.html", "terms.html", "resources.html",
  "contact-modal.js", "SETUP.md", "Archive.zip", "stonearch-ai-site.jsx",
  "site", "v3", "test.csv.rtf",
]);

if (!existsSync(out)) {
  console.error("No site/out — run the build first.");
  process.exit(1);
}

if (mode === "preview") {
  const dest = join(repoRoot, "v3");
  rmSync(dest, { recursive: true, force: true });
  cpSync(out, dest, { recursive: true });
  console.log(`✓ export → ${dest}`);
  process.exit(0);
}

// --- root mode ---
const entries = readdirSync(out);
const clash = entries.filter((e) => PROTECTED.has(e));
if (clash.length) {
  console.error(`REFUSING: export would overwrite protected paths: ${clash.join(", ")}`);
  process.exit(1);
}

const prev = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : { written: [] };

// Remove files we wrote last time that no longer exist in the new export.
for (const stale of prev.written.filter((w) => !entries.includes(w))) {
  if (PROTECTED.has(stale)) continue;
  rmSync(join(repoRoot, stale), { recursive: true, force: true });
  console.log(`− removed stale ${stale}`);
}

for (const entry of entries) {
  const dest = join(repoRoot, entry);
  rmSync(dest, { recursive: true, force: true });
  cpSync(join(out, entry), dest, { recursive: true });
  console.log(`✓ ${entry}`);
}

writeFileSync(manifestPath, JSON.stringify({ written: entries, at: new Date().toISOString() }, null, 2));
console.log(`✓ manifest updated (${entries.length} entries)`);
