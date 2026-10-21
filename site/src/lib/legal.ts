import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Starter Terms version and date for the public /terms/ page.
 * Read at build time from portal/client/swap-config.js (acceptance.terms), so the
 * marketing site never hardcodes a version. Fails the build if the values are missing.
 */
export function starterTerms(): { version: string; date: string } {
  const file = path.join(process.cwd(), "..", "portal", "client", "swap-config.js");
  const src = readFileSync(file, "utf8");
  const acc = src.indexOf("acceptance: Object.freeze({");
  const block = acc >= 0 ? src.slice(acc).match(/terms: Object\.freeze\(\{([\s\S]*?)\}\)/) : null;
  const version = block?.[1].match(/version:\s*"([^"]+)"/)?.[1];
  const date = block?.[1].match(/date:\s*"([^"]+)"/)?.[1];
  if (!version || !date) throw new Error("swap-config.js: acceptance.terms version or date not found");
  return { version, date };
}
