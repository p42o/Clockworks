// Portal legal checks (Counsel rulings 2026-10-23). Run: node --test site/tests/
// site/** is excluded from the FTP deploy, so this file never ships.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const C = fileURLToPath(new URL("../../portal/client/", import.meta.url));
const read = (p) => readFileSync(C + p, "utf8");
const sha = (p) => createHash("sha256").update(readFileSync(C + p)).digest("hex");
const { SWAP } = await import(new URL("../../portal/client/swap-config.js", import.meta.url));

// name -> mod, parsed from the ROUTES literal (importing router.js needs a browser).
function routes() {
  const src = read("lib/router.js");
  const block = src.slice(src.indexOf("export const ROUTES = {"), src.indexOf("};", src.indexOf("export const ROUTES = {")));
  const out = {};
  for (const m of block.matchAll(/^\s*("?[\w/-]+"?):\s*\{[^}]*\bmod:\s*"([^"]+)"/gm)) out[m[1].replace(/"/g, "")] = m[2];
  return out;
}

test("accepted v4.0 / v2.0 files stay byte-identical (acceptance proof)", () => {
  assert.equal(sha("legal/starter-terms-v4.0.md"), "6d130b1c04f3b6aeae831a11d6ddb5a5f4006d65c474ac38cbff1b34664de52d");
  assert.equal(sha("legal/privacy-notice-v2.0.md"), "5302a16a774cb5dcb20df6ca7d08c52ea36de33f8f686b0ff5c6d845901a2707");
});

test("acceptance config points at v4.0a / v2.0a with the 296-9777 fix and no dead number", () => {
  const a = SWAP.acceptance;
  assert.equal(a.terms.version, "v4.0a");
  assert.equal(a.terms.date, "October 23, 2026");
  assert.equal(a.notice.version, "v2.0a");
  assert.deepEqual([...a.changes], [
    "Our phone number is now (763) 296-9777.",
    "The Privacy Notice now explains the Google Analytics on our website and the sign-in pages of our client portal.",
  ]);
  for (const d of [a.terms, a.notice]) {
    assert.ok(existsSync(C + d.file), d.file);
    const t = read(d.file);
    assert.equal((t.match(/202-7778/g) || []).length, 0, d.file);
    assert.ok(t.includes("(763) 296-9777"), d.file);
    assert.ok(t.includes(`Version ${d.version.slice(1)}\n`), d.file);
    assert.ok(t.includes("Last updated: October 23, 2026"), d.file);
  }
  assert.equal(a.label, "I agree to the MN Clockworks Starter Terms and have read the Privacy Notice.");
});

test("v2.0a carries the Counsel analytics paragraph (GA on the website and portal sign-in pages) and v4.0a is unchanged", () => {
  assert.equal(sha("legal/privacy-notice-v2.0a.md"), "670a76d73a5a96d812aca131976a72bfb16691a6e8692470d838e927067353f2");
  assert.equal(sha("legal/starter-terms-v4.0a.md"), "7cb00f4fe2fe776b10a697ba6425713d98f8a8993e33b579c9a26e5058c09975");
  const t = read("legal/privacy-notice-v2.0a.md");
  assert.ok(t.includes("Website analytics. Our website and the sign-in pages of our client portal use Google Analytics 4"));
  assert.ok(t.includes("If your browser sends a Global Privacy Control signal, we do not load Google Analytics."));
  assert.ok(!/does not (currently )?use third-party analytics/i.test(t));
});

test("no client route renders the DRAFT view while SWAP.draftHashes.draft is false", () => {
  assert.equal(SWAP.draftHashes.draft, false);
  const r = routes();
  assert.ok(Object.keys(r).length > 10, "parsed routes");
  for (const [name, mod] of Object.entries(r)) {
    // "COUNSEL-DRAFT-..." is an internal ruling tag in comments / data attributes, not client-facing text.
    const s = read(`screens/${mod}.js`).replace(/COUNSEL-DRAFT-[\w-]*/g, "");
    assert.ok(!/renderDocument/.test(s), `#/${name} -> screens/${mod}.js uses the retired draft view`);
    assert.ok(!/DRAFT/.test(s), `#/${name} -> screens/${mod}.js contains DRAFT`);
  }
  assert.equal(r.privacy, "privacy-notice");
  assert.equal(r.terms, "starter-terms");
});

test("router sends anyone who owes the notice or terms to #/accept", () => {
  const s = read("lib/router.js");
  assert.ok(s.includes("if (me.legal.needsAcceptance || me.legal.needsNotice || me.legal.needsTerms) redirect = 'accept';"));
  assert.ok(!/redirect = 'privacy'|redirect = 'terms'/.test(s));
});

test("Account legal links go to the no-banner views", () => {
  const s = read("screens/account.js");
  assert.ok(s.includes('href="#/privacy-notice"') && s.includes('href="#/starter-terms"'));
  assert.ok(!s.includes('href="#/privacy"') && !s.includes('href="#/terms"'));
});
