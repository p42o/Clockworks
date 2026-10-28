// Hash router with guards. Screens are lazy-loaded ES modules in ../screens/.
// SECURITY: an invite token arriving as #/invite?t=<token> is read once, held only in memory, and the URL is
// rewritten to #/invite BEFORE anything else runs. The token is never logged or kept in the address bar.
import * as session from "./session.js";
import { announce, focusHeading } from "./ui.js";
import { cidSlug, clientBaseFor } from "./slug.js";

export { cidSlug };

// name -> { title, mod, auth: 'public'|'client'|'any', feature?, ro: allowed in readonly, layout }
export const ROUTES = {
  home:     { title: "Home",            mod: "home",     auth: "client", ro: true,  tab: "home" },
  intake:   { title: "Intake",          mod: "intake",   auth: "client", feature: "intake",   tab: "home" },
  messages: { title: "Support",        mod: "messages", auth: "client", feature: "messages", tab: "messages" },
  m:        { title: "Conversation",    mod: "thread",   auth: "client", feature: "messages", tab: "messages", param: "tid" },
  ideas:    { title: "Ideas",           mod: "ideas",    auth: "client", feature: "ideas",    tab: "home" },
  newsletter: { title: "Agent Newsletter", mod: "newsletter", auth: "client", ro: true, tab: "home" },
  "shop-pass": { title: "Shop Pass",   mod: "shop-pass", auth: "client", ro: true, tab: "shop-pass" },
  i:        { title: "Idea",            mod: "idea",     auth: "client", feature: "ideas",    tab: "home", param: "sid" },
  account:  { title: "Settings",         mod: "account",  auth: "client", ro: true,  tab: "account" },
  "account/files":  { title: "Files",   mod: "files",    auth: "client", ro: true,  tab: "account" },
  "account/presence": { title: "Online presence", mod: "presence", auth: "client", ro: true, tab: "account", param: "rid" },
  "account/data":   { title: "My data", mod: "data",     auth: "client", ro: true,  tab: "account" },
  "account/people": { title: "People",  mod: "people",   auth: "client", tab: "account" },
  invite:   { title: "Welcome",         mod: "invite",   auth: "public" },
  signin:   { title: "Sign in",         mod: "signin",   auth: "public" },
  verify:   { title: "Sign in",         mod: "signin",   auth: "public" },
  privacy:  { title: "Privacy notice",  mod: "privacy",  auth: "any", ro: true },
  terms:    { title: "Terms",           mod: "terms",    auth: "any", ro: true },
  accept:   { title: "Agree to continue", mod: "accept", auth: "client", ro: true },
  "starter-terms": { title: "Starter Terms", mod: "starter-terms", auth: "any", ro: true },
  "privacy-notice": { title: "Privacy Notice", mod: "privacy-notice", auth: "any", ro: true },
  "privacy-request": { title: "Privacy request", mod: "privacy-request", auth: "any", ro: true },
  reset:    { title: "Reset password", mod: "reset", auth: "any", ro: true },
  "reset-confirm": { title: "Choose a new password", mod: "reset-confirm", auth: "any", ro: true },
  locked:   { title: "Portal closed",   mod: "locked",   auth: "any", ro: true },
};

let inviteToken = (typeof window !== "undefined" && window.__cwInviteToken) || null; // set by the inline scrub in index.html
let inviteCode = (typeof window !== "undefined" && window.__cwInviteCode) || null;
if (typeof window !== "undefined") { delete window.__cwInviteToken; delete window.__cwInviteCode; }
/** Hand the in-memory invite token to the invite screen (one read, then it is gone). */
export function takeInviteToken() { const t = inviteToken; inviteToken = null; return t; }
/** Hand a short code that arrived on the invite link (one read). */
export function takeInviteCode() { const c = inviteCode; inviteCode = null; return c; }
let resetCode = (typeof window !== "undefined" && window.__cwResetCode) || null; // set by the inline scrub in index.html
if (typeof window !== "undefined") delete window.__cwResetCode;
/** Hand the in-memory password-reset code to the reset-confirm screen (one read, then it is gone). */
export function takeResetCode() { const c = resetCode; resetCode = null; return c; }

let flash = null;
export function takeFlash() { const f = flash; flash = null; return f; }

let rememberedTarget = null;
let host = null;           // (layout) => main element
let onRoute = null;
let teardown = null;
let navId = 0;
export const current = { name: null, params: {}, route: null };

/** Parse location.hash. Handles the invite token BEFORE anything else. */
function parse() {
  let h = location.hash || "";
  if (h.startsWith("#/invite?")) {
    const q = new URLSearchParams(h.slice(h.indexOf("?") + 1));
    const t = q.get("t");
    const c = q.get("c");
    if (t) inviteToken = t;
    if (c) inviteCode = c;
    history.replaceState(null, "", location.pathname + location.search + "#/invite");
    h = "#/invite";
  }
  const path = h.replace(/^#\/?/, "").split("?")[0].replace(/\/+$/, "");
  if (!path) return { name: "home", params: {} };
  const seg = path.split("/");
  if ((seg[0] === "m" || seg[0] === "i") && seg[1]) return { name: seg[0], params: { [ROUTES[seg[0]].param]: decodeURIComponent(seg[1]) } };
  if (seg[0] === "account" && seg[1] === "presence") {
    if (seg.length === 2) return { name: "account", params: {} };
    if (seg.length === 3 && seg[2]) return { name: "account/presence", params: { rid: decodeURIComponent(seg[2]) } };
  }
  if (ROUTES[path]) return { name: path, params: {} };
  return { name: null, params: {} };
}

/** Once me.cid (or the client claim) is known, prefer /portal/client/<cid>/ and keep the hash. */
function alignClientSlug() {
  const cid = session.state.me?.cid || session.state.cid;
  const next = clientBaseFor(location.pathname, cid);
  if (!next || location.pathname === next) return;
  history.replaceState(null, "", next + location.search + (location.hash || ""));
}

export function go(hash, { replace = false } = {}) {
  const target = hash.startsWith("#") ? hash : "#" + hash;
  alignClientSlug();
  const base = location.pathname + location.search;
  if (replace) { history.replaceState(null, "", base + target); resolve(); }
  else if (location.hash === target) resolve();
  else location.hash = target;
}
export function takeRememberedTarget() { const t = rememberedTarget; rememberedTarget = null; return t; }

export function start(opts) {
  host = opts.host; onRoute = opts.onRoute;
  // init() has already settled status. Seed lastStatus so a later emit that does not
  // change it (signInWith clears gateMessage before the hash leaves #/invite) does not
  // remount. A remount of #/invite cannot recover the one-shot token.
  lastStatus = session.state.status;
  window.addEventListener("hashchange", resolve);
  session.subscribe(onSessionChange);
  resolve();
}

let lastStatus = null;
function onSessionChange(s) {
  // Re-evaluate guards when auth/access state changes (sign-in, sign-out, readonly, locked, features).
  if (s.status !== lastStatus) { lastStatus = s.status; resolve(); }
  else if (current.route && current.route.feature && s.home && s.home.features && s.home.features[current.route.feature] === false) resolve();
}

/** Decide where the user really goes, given session state. Returns hash path or null (stay). */
function guard(name, route) {
  const s = session.state;
  const st = s.status;
  if (st === "boot" || st === "signingIn") return null;
  if (route.auth === "public") return st === "signedOut" ? null : "home";
  if (st === "signedOut") {
    if (route.auth === "any" && name !== "locked") return null;   // privacy / terms are readable signed out
    if (name !== "locked") rememberedTarget = location.hash;
    return "signin";
  }
  if (st === "locked" || st === "disabled") return route.auth === "any" ? null : "locked";
  if (name === "locked") return "home";
  if (st === "readonly" && !route.ro) { flash = "readonly"; return "home"; }
  const f = s.home?.features;
  if (route.feature && f && f[route.feature] === false) return "home";
  return null;
}

async function resolve() {
  const id = ++navId;
  const p = parse();
  alignClientSlug();
  const name = p.name || "home";
  const route = ROUTES[name];
  let redirect = guard(name, route);
  const legalOpen = ['privacy', 'terms', 'accept', 'starter-terms', 'privacy-notice', 'privacy-request', 'reset', 'reset-confirm'];
  if (!redirect && ['active', 'readonly'].includes(session.state.status) && !legalOpen.includes(name)) {
    try {
      const api = await import('./api.js');
      const me = await api.me();
      if (id !== navId) return;
      session.state.me = me;
      alignClientSlug();
      const legal = me.legal || {};
      // One gate. Notice and terms flags never open the old ack screens.
      if (legal.needsAcceptance || legal.needsNotice || legal.needsTerms) redirect = 'accept';
    } catch { /* Screens provide their own retry states; server legal gates remain authoritative. */ }
  }
  if (id !== navId) return; // A sign-out or newer route may finish while the legal check is in flight.
  if (redirect && redirect !== name) { go(redirect, { replace: true }); return; }
  if (session.state.status === "boot" || session.state.status === "signingIn") return; // wait for auth
  if (teardown) { try { teardown(); } catch (e) { console.debug("[cw] teardown", e); } teardown = null; }
  current.name = name; current.params = p.params; current.route = route;
  const layout = route.auth === "public" || (route.auth === "any" && !session.isSignedIn()) || name === "locked" ? "gate" : "shell";
  const el = host(layout, route);
  document.title = `${route.title} · Clockworks`;
  onRoute?.(current);
  try {
    const mod = await import(`../screens/${route.mod}.js`);
    if (id !== navId) return;
    const ctx = { el, params: p.params, name, session, state: session.state, router: { go, takeInviteToken, takeInviteCode, takeResetCode, takeFlash, takeRememberedTarget } };
    const td = await mod.render(ctx);
    if (id !== navId) { if (typeof td === "function") td(); return; }
    teardown = typeof td === "function" ? td : null;
  } catch (e) {
    console.debug("[cw] screen failed", e);
    el.textContent = "";
    const p2 = document.createElement("p"); p2.textContent = "Something went wrong. Please try again.";
    const h1 = document.createElement("h1"); h1.textContent = "Something went wrong";
    el.append(h1, p2);
  }
  focusHeading();
  announce(route.title);
}

