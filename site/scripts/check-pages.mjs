#!/usr/bin/env node
/**
 * check-pages.mjs: Parker's page rule for mnclockworks.com (2026-10-23).
 * Every public page needs: GA4 (G-PSNYLVG4V1), title + meta description, an absolute self canonical,
 * the right robots call, a sitemap entry when indexed (and none when noindex), at least one internal link
 * when indexed, NAP + LocalBusiness JSON-LD that match the one business phone, and a row in
 * site/pages.inventory.json. Every HTML file in the deploy tree must be in the inventory.
 * Every Google Analytics load in the deploy tree must sit behind a Global Privacy Control guard.
 *
 * Usage (from repo root or site/):
 *   node site/scripts/check-pages.mjs                 static check of the deploy tree (CI, predeploy)
 *   node site/scripts/check-pages.mjs --base URL      also check HTTP status per row against a local server
 *   node site/scripts/check-pages.mjs --write-md      regenerate site/SITE-PAGES.md from the inventory
 * Exit code 1 on any failure. No dependencies.
 */
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const invPath = join(root, "site", "pages.inventory.json");
const mdPath = join(root, "site", "SITE-PAGES.md");
const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : null;

const fails = [];
const fail = (where, msg) => fails.push(`${where}: ${msg}`);

if (!existsSync(invPath)) { console.error(`FAIL missing ${relative(root, invPath)}`); process.exit(1); }
const inv = JSON.parse(readFileSync(invPath, "utf8"));
const SITE = inv.site;
const GA = inv.ga;
const PHONE = inv.phone;
const EVENTS = inv.eventsScript || null; // shared gtag event script every public page must load
// Same clock as site/src/lib/blog.ts (UTC date). A row with publishFrom later than today is "scheduled":
// its file must not exist yet, it must not be in the sitemap, and nothing may link to it.
const TODAY = new Date().toISOString().slice(0, 10);
const scheduled = (p) => !!(p.publishFrom && p.publishFrom > TODAY);

// ---------- markdown view of the inventory ----------
function renderMd() {
  const yn = (b) => (b ? "yes" : "no");
  const rows = inv.pages.map((p) =>
    `| \`${p.path}\` | ${p.class} | ${p.purpose} | ${yn(p.ga)} | ${p.index ? "index" : "noindex"} | ${yn(p.sitemap)} | ${p.canonical ? `\`${p.canonical}\`` : "none"} | ${p.linkedFrom || "none"}${p.publishFrom ? ` (from ${p.publishFrom} UTC)` : ""} |`);
  const pre = (inv.prefixes || []).map((p) => `| \`${p.prefix}*\` | ${p.class} | ${p.purpose} | no | noindex | no | none | none |`);
  return [
    "# Site page inventory (mnclockworks.com)",
    "",
    "Generated from `site/pages.inventory.json` by `node site/scripts/check-pages.mjs --write-md`. Edit the JSON, not this file.",
    "Rule (Parker, 2026-10-23): every new or changed page needs GA4 " + GA + ", title + meta description, absolute canonical,",
    "the right robots call, a sitemap entry when indexed, at least one internal link, matching NAP + JSON-LD with " + PHONE.display + ", and a row here.",
    "`check-pages.mjs` enforces it in `npm run export:root` and in the Deploy to Namecheap workflow before FTP.",
    "",
    "Classes: public (served marketing page), error (404), redirect (file kept, .htaccess 301), gone (.htaccess 410), private (gated or unlisted; GA intentionally off).",
    "",
    "| Path | Class | Purpose | GA | Robots | Sitemap | Canonical | Linked from |",
    "|---|---|---|---|---|---|---|---|",
    ...rows, ...pre, "",
  ].join("\n");
}
if (args.includes("--write-md")) { writeFileSync(mdPath, renderMd()); console.log(`wrote ${relative(root, mdPath)}`); process.exit(0); }

// ---------- discover deploy-tree HTML ----------
const SKIP_DIRS = new Set([".git", ".github", "site", "_next", "node_modules", "home-assets"]);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full).split(sep).join("/");
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git" || (dir === root && SKIP_DIRS.has(name))) continue;
      walk(full, out);
    }
    else if (/\.html?$/.test(name)) out.push(rel);
  }
  return out;
}
const htmlFiles = walk(root).filter((f) => !f.startsWith("site/"));
const fileToPath = (f) => "/" + f.replace(/(^|\/)index\.html$/, "$1");
const rowsByPath = new Map(inv.pages.map((p) => [p.path, p]));
const prefixes = inv.prefixes || [];
const covered = (path) => rowsByPath.has(path) || prefixes.some((p) => path.startsWith(p.prefix));
for (const f of htmlFiles) {
  const path = fileToPath(f);
  if (!covered(path)) fail(path, `HTML file ${f} has no row in site/pages.inventory.json`);
}
for (const p of inv.pages) {
  if (scheduled(p)) {
    if (p.file && existsSync(join(root, p.file))) fail(p.path, `scheduled for ${p.publishFrom} (UTC) but ${p.file} already exists (date gate leak)`);
    continue;
  }
  if (p.file && !existsSync(join(root, p.file))) fail(p.path, `inventory file ${p.file} does not exist`);
  for (const k of ["path", "class", "purpose"]) if (!p[k]) fail(p.path || "?", `inventory row missing ${k}`);
}

// ---------- sitemap ----------
const smPath = join(root, "sitemap.xml");
const sitemap = existsSync(smPath) ? readFileSync(smPath, "utf8") : "";
if (!sitemap) fail("/sitemap.xml", "missing");
const smLocs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));
for (const loc of smLocs) {
  if (!loc.startsWith(SITE + "/")) fail("/sitemap.xml", `non-apex loc ${loc}`);
  const path = loc.slice(SITE.length);
  const row = rowsByPath.get(path);
  if (!row || row.class !== "public" || !row.index) fail("/sitemap.xml", `lists ${loc} which is not an indexed public page in the inventory`);
}

// ---------- page helpers ----------
const read = (f) => readFileSync(join(root, f), "utf8");
const attr = (html, re) => { const m = html.match(re); return m ? m[1].trim() : null; };
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
function hasGA(html) {
  const src = html.includes(`googletagmanager.com/gtag/js?id=${GA}`);
  const cfg = new RegExp(`gtag\\(\\s*\\\\?["']config\\\\?["']\\s*,\\s*\\\\?["']${GA}`).test(html);
  return src && cfg;
}
function robotsOf(html) { return (attr(html, /<meta\s+name="robots"\s+content="([^"]*)"/i) || "").toLowerCase(); }
function ldBlocks(html) {
  const out = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { out.push(JSON.parse(m[1])); } catch (e) { out.push({ __parseError: String(e) }); }
  }
  return out;
}
function visibleText(html) {
  return decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}
function internalLinks(html) {
  const out = new Set();
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    let h = decode(m[1]);
    if (h.startsWith(SITE)) h = h.slice(SITE.length) || "/";
    if (!h.startsWith("/") || h.startsWith("//")) continue;
    h = h.split("#")[0].split("?")[0];
    if (!h) continue;
    out.add(h);
    if (!h.endsWith("/") && !/\.[a-z0-9]+$/i.test(h)) out.add(h + "/");
  }
  return out;
}

// ---------- per-row checks ----------
const linkGraph = new Map(); // path -> set of pages linking to it
const pageHtml = new Map();
for (const p of inv.pages) {
  if (!p.file || !/\.html?$/.test(p.file) || !existsSync(join(root, p.file))) continue;
  if (p.class === "public" || p.class === "error") {
    const html = read(p.file);
    pageHtml.set(p.path, html);
    if (p.class === "public") for (const l of internalLinks(html)) { if (!linkGraph.has(l)) linkGraph.set(l, new Set()); linkGraph.get(l).add(p.path); }
  }
}
// Header/footer nav links count as link sources (they are rendered into every page above).

const telRe = /href="(tel:[^"]*)"/g;
const numRe = /\(\d{3}\)\s?\d{3}-\d{4}/g;
const FORBIDDEN = ["PHONE PENDING", "XXX-XXXX", "202-7778", "2027778", "202 7778"];

for (const p of inv.pages) {
  const where = p.path;
  if (scheduled(p)) {
    if (smLocs.has(SITE + p.path)) fail(where, `scheduled for ${p.publishFrom} (UTC) but already in sitemap.xml`);
    if (linkGraph.has(p.path)) fail(where, `scheduled for ${p.publishFrom} (UTC) but already linked from ${[...linkGraph.get(p.path)].join(", ")}`);
    continue;
  }
  if (p.class === "public" || p.class === "error") {
    const html = pageHtml.get(p.path);
    if (!html) { fail(where, `no HTML file (${p.file})`); continue; }
    const ga = hasGA(html);
    if (!ga) fail(where, `GA4 ${GA} missing`);
    if (p.ga !== ga) fail(where, `inventory ga=${p.ga} but page has GA=${ga}`);
    if (p.class === "public" && EVENTS && !html.includes(EVENTS)) fail(where, `does not load the shared event script ${EVENTS}`);
    const title = attr(html, /<title[^>]*>([^<]*)<\/title>/i);
    if (!title) fail(where, "missing <title>");
    const desc = attr(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
    if (!desc) fail(where, "missing meta description");
    const robots = robotsOf(html);
    const noindex = robots.includes("noindex");
    if (p.index === noindex) fail(where, `inventory index=${p.index} but robots="${robots || "(none)"}"`);
    const inSm = smLocs.has(SITE + p.path);
    if (p.sitemap !== inSm) fail(where, `inventory sitemap=${p.sitemap} but sitemap.xml has it=${inSm}`);
    if (!noindex && !inSm) fail(where, "indexed but not in sitemap.xml");
    if (noindex && inSm) fail(where, "noindex but listed in sitemap.xml");
    const canon = attr(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
    if (p.class === "public") {
      if (!canon) fail(where, "missing canonical");
      else {
        if (!canon.startsWith("https://")) fail(where, `canonical not absolute: ${canon}`);
        if (!noindex && canon !== SITE + p.path) fail(where, `canonical ${canon} is not self (${SITE + p.path})`);
      }
      if ((p.canonical || null) !== (canon || null)) fail(where, `inventory canonical ${p.canonical} != page ${canon}`);
      if (!p.linkedFrom) fail(where, "inventory linkedFrom is empty");
      if (!noindex && p.path !== "/") {
        const from = [...(linkGraph.get(p.path) || [])].filter((x) => x !== p.path);
        if (from.length === 0) fail(where, "indexed page is orphaned (no internal link from any other page)");
      }
    } else if (!noindex) fail(where, "error page must be noindex");
    // phone / NAP / JSON-LD
    for (const f of FORBIDDEN) if (html.includes(f)) fail(where, `contains placeholder or dead number "${f}"`);
    for (const m of html.matchAll(telRe)) if (m[1] !== PHONE.tel) fail(where, `tel link ${m[1]} != ${PHONE.tel}`);
    const text = visibleText(html);
    for (const m of text.matchAll(numRe)) {
      const n = m[0].replace(/\)\s?/, ") ");
      if (n !== PHONE.display && !(inv.allowedDemoNumbers || []).includes(n)) fail(where, `visible number ${n} != ${PHONE.display}`);
    }
    const lds = ldBlocks(html);
    for (const d of lds) if (d.__parseError) fail(where, `JSON-LD parse error ${d.__parseError}`);
    const biz = lds.filter((d) => JSON.stringify(d["@type"] || "").includes("LocalBusiness"));
    if (p.class === "public" && !noindex && biz.length === 0) fail(where, "indexed page has no LocalBusiness JSON-LD");
    for (const d of biz) {
      if (d.name !== inv.nap.name) fail(where, `JSON-LD name ${d.name} != ${inv.nap.name}`);
      if (d.telephone !== PHONE.schema) fail(where, `JSON-LD telephone ${d.telephone} != ${PHONE.schema}`);
      for (const c of [].concat(d.contactPoint || [])) if (c.telephone !== PHONE.schema) fail(where, `contactPoint telephone ${c.telephone} != ${PHONE.schema}`);
      if (d.address && d.address.addressLocality !== inv.nap.locality) fail(where, `JSON-LD locality ${d.address.addressLocality} != ${inv.nap.locality}`);
      if (!text.includes(PHONE.display)) fail(where, `JSON-LD phone not shown on the page (${PHONE.display})`);
      if (!html.includes(`href="${PHONE.tel}"`)) fail(where, `no ${PHONE.tel} link on the page`);
    }
  } else if (p.class === "private") {
    if (smLocs.has(SITE + p.path)) fail(where, "private page listed in sitemap.xml");
    if (p.index) fail(where, "private page must be noindex");
    let noindex = false;
    if (p.file && /\.html?$/.test(p.file) && existsSync(join(root, p.file))) noindex = robotsOf(read(p.file)).includes("noindex");
    const ht = join(root, p.path.replace(/^\//, ""), ".htaccess");
    if (!noindex && existsSync(ht) && /X-Robots-Tag\s+"[^"]*noindex/i.test(readFileSync(ht, "utf8"))) noindex = true;
    if (!noindex) fail(where, "private page has no noindex (meta robots or X-Robots-Tag)");
    // GA on a private page only through a reviewed loader (p.gaVia) that keeps it off gated views.
    if (p.file && /\.html?$/.test(p.file) && existsSync(join(root, p.file))) {
      const html = read(p.file);
      const viaOk = !!p.gaVia && html.includes(`src="${p.gaVia.split("/").pop()}"`) && existsSync(join(root, p.gaVia)) && readFileSync(join(root, p.gaVia), "utf8").includes(GA);
      const has = hasGA(html) || viaOk;
      if (p.ga !== has) fail(where, `inventory ga=${p.ga} but private page GA=${has}${p.gaVia ? ` (via ${p.gaVia})` : ""}`);
      if (hasGA(html)) fail(where, "private page has an inline GA tag; use a gaVia loader that keeps GA off gated views");
    }
  } else if (p.class === "redirect" || p.class === "gone") {
    if (smLocs.has(SITE + p.path)) fail(where, `${p.class} path listed in sitemap.xml`);
  } else fail(where, `unknown class ${p.class}`);
}

// ---------- GPC guard on every Google Analytics load (Counsel ruling 2026-10-23) ----------
// 1. A static <script src>, <link>, <img> or <iframe> pointing at a Google Analytics host loads on every visit: fail.
// 2. Every script that names a Google Analytics host (inline script, a Next inline <Script> inside the RSC payload,
//    or a .js file in the deploy tree) must contain a navigator.globalPrivacyControl === true check, and is then run
//    in a sandbox with GPC on: if it asks for any Google Analytics URL (script/img src, fetch, sendBeacon, XHR), fail.
const GA_HOST = /(?:www\.)?(?:googletagmanager\.com|google-analytics\.com|analytics\.google\.com)/g;
const GA_HOST1 = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/;
const GPC_GUARD = /globalPrivacyControl\s*===\s*true/;
function walkAll(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full).split(sep).join("/");
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git" || (dir === root && (name === "site" || name === ".github"))) continue;
      walkAll(full, out);
    } else if (/\.(html?|m?js)$/.test(name)) out.push(rel);
  }
  return out;
}
// Run code with a fake browser. Returns the Google Analytics URLs it tried to load, or throws.
function gaRequestsUnder(code, gpc) {
  const hits = [];
  const note = (u) => { if (typeof u === "string" && GA_HOST1.test(u)) hits.push(u.replace(/\?.*/, "")); };
  const el = () => { const o = { style: {}, setAttribute(k, v) { if (k === "src" || k === "href") note(v); o[k] = v; }, appendChild() {}, addEventListener() {} };
    for (const k of ["src", "href"]) { let v = ""; Object.defineProperty(o, k, { get: () => v, set: (x) => { v = x; note(x); } }); } return o; };
  const doc = { createElement: el, head: { appendChild() {}, insertBefore() {} }, body: { appendChild() {} }, documentElement: {},
    addEventListener() {}, getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }], querySelector: () => null, querySelectorAll: () => [], cookie: "" };
  const nav = { globalPrivacyControl: gpc, doNotTrack: null, sendBeacon: (u) => { note(u); return true; }, userAgent: "check-pages" };
  const win = { navigator: nav, document: doc, location: { href: "https://mnclockworks.com/", origin: "https://mnclockworks.com", pathname: "/", hash: "#/signin", search: "", host: "mnclockworks.com" },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, setTimeout() {}, clearTimeout() {}, history: { replaceState() {} },
    fetch: (u) => { note(String(u)); return { then() { return this; }, catch() { return this; } }; },
    XMLHttpRequest: function () { this.open = (m, u) => note(u); this.send = () => {}; this.setRequestHeader = () => {}; },
    Image: function () { return el(); }, CustomEvent: function () {}, Date, Math, JSON, Object, Array, String, Number, RegExp, Error, console: { log() {}, warn() {}, error() {} } };
  win.window = win; win.self = win; win.globalThis = win;
  vm.runInNewContext(code, win, { timeout: 1000 });
  return hits;
}
const gaScripts = []; // [where, code]
for (const f of walkAll(root)) {
  const text = read(f);
  if (!GA_HOST1.test(text)) continue;
  if (!/\.html?$/.test(f)) { gaScripts.push([f, text]); continue; }
  for (const m of text.matchAll(GA_HOST)) { // static loads
    const i = m.index, lt = text.lastIndexOf("<", i), gt = text.lastIndexOf(">", i);
    if (lt > gt) {
      const tag = (text.slice(lt + 1).match(/^[a-zA-Z]+/) || [""])[0].toLowerCase();
      if (["script", "link", "img", "iframe", "source", "embed", "object"].includes(tag)) fail(f, `static <${tag}> loads ${m[0]} with no GPC guard`);
    }
  }
  for (const m of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = m[1];
    if (!GA_HOST1.test(body)) continue;
    const rsc = body.match(/^\s*self\.__next_f\.push\((\[[\s\S]*\])\)\s*;?\s*$/);
    if (!rsc) { gaScripts.push([f + " (inline script)", body]); continue; }
    let rows = "";
    try { rows = JSON.parse(rsc[1]).filter((x) => typeof x === "string").join(""); } catch { fail(f, "cannot parse Next RSC payload that names a Google Analytics host"); continue; }
    let found = 0;
    for (const c of rows.matchAll(/"children":("(?:[^"\\]|\\.)*")/g)) {
      let code; try { code = JSON.parse(c[1]); } catch { continue; }
      if (GA_HOST1.test(code)) { found++; gaScripts.push([f + " (Next inline Script)", code]); }
    }
    if (!found) fail(f, "Next RSC payload names a Google Analytics host outside an inline Script (cannot prove a GPC guard)");
  }
}
let gaLoaders = 0;
for (const [where, code] of gaScripts) {
  gaLoaders++;
  if (!GPC_GUARD.test(code)) { fail(where, "loads Google Analytics without a navigator.globalPrivacyControl === true guard"); continue; }
  try {
    const hits = gaRequestsUnder(code, true);
    if (hits.length) fail(where, `with GPC on it still requests ${[...new Set(hits)].join(", ")}`);
    if (!gaRequestsUnder(code, false).some((u) => /gtag\/js/.test(u))) fail(where, "with GPC off it never loads gtag.js (broken GA loader)");
  } catch (e) { fail(where, `GPC sandbox run failed (${String(e.message || e).slice(0, 80)}); cannot prove the GPC guard`); }
}

// ---------- markdown freshness ----------
if (!existsSync(mdPath) || readFileSync(mdPath, "utf8") !== renderMd()) fail("site/SITE-PAGES.md", "out of date: run node site/scripts/check-pages.mjs --write-md");

// ---------- optional live status check ----------
if (BASE) {
  const want = { public: [200], error: [200, 404], redirect: [301, 302, 308], gone: [410], private: [200, 301, 302, 401, 403] };
  for (const p of inv.pages) {
    const url = BASE.replace(/\/$/, "") + p.path;
    try {
      const r = await fetch(url, { redirect: "manual", headers: { Host: new URL(SITE).host } });
      if (!want[p.class].includes(r.status)) fail(p.path, `HTTP ${r.status} at ${url}, expected ${want[p.class].join("/")} for class ${p.class}`);
    } catch (e) { fail(p.path, `fetch ${url} failed: ${e.message}`); }
  }
}

const n = inv.pages.filter((p) => p.class === "public").length;
if (fails.length) {
  console.error(`check-pages: ${fails.length} failure(s)`);
  for (const f of fails) console.error("FAIL " + f);
  process.exit(1);
}
console.log(`check-pages: OK (${inv.pages.length} inventory rows, ${n} public, ${htmlFiles.length} HTML files, ${smLocs.size} sitemap URLs, ${gaLoaders} GA loaders GPC-guarded${BASE ? ", HTTP statuses checked" : ""})`);
