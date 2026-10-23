// Hash router with guards. Screens are lazy-loaded ES modules in ../screens/.
// SECURITY: an invite token arriving as #/invite?t=<token> is read once, held only in memory, and the URL is
// rewritten to #/invite BEFORE anything else runs. The token is never logged or kept in the address bar.
import * as session from "./session.js";
import { announce, focusHeading } from "./ui.js";

// name -> { title, mod, auth: 'public'|'client'|'any', feature?, ro: allowed in readonly, layout }
export const ROUTES = {
  home:     { title: "Home",            mod: "home",     auth: "client", ro: true,  tab: "home" },
  intake:   { title: "Intake",          mod: "intake",   auth: "client", feature: "intake",   tab: "intake" },
  messages: { title: "Messages",        mod: "messages", auth: "client", feature: "messages", tab: "messages" },
  m:        { title: "Conversation",    mod: "thread",   auth: "client", feature: "messages", tab: "messages", param: "tid" },
  ideas:    { title: "Ideas",           mod: "ideas",    auth: "client", feature: "ideas",    tab: "ideas" },
  i:        { title: "Idea",            mod: "idea",     auth: "client", feature: "ideas",    tab: "ideas", param: "sid" },
  account:  { title: "Account",         mod: "account",  auth: "client", ro: true,  tab: "account" },
  "account/files":  { title: "Files",   mod: "files",    auth: "client", ro: true,  tab: "account" },
  "account/data":   { title: "My data", mod: "data",     auth: "client", ro: true,  tab: "account" },
  "account/people": { title: "People",  mod: "people",   auth: "client", tab: "account" },
  invite:   { title: "Welcome",         mod: "invite",   auth: "public" },
  signin:   { title: "Sign in",         mod: "signin",   auth: "public" },
  verify:   { title: "Sign in",         mod: "signin",   auth: "public" },
  // Counsel 2026-10-23: old routes are aliases of the no-banner views, so bookmarks land on the live documents.
  privacy:  { title: "Privacy Notice", mod: "privacy-notice", auth: "any", ro: true },
  terms:    { title: "Starter Terms",  mod: "starter-terms",  auth: "any", ro: true },
  accept:   { title: "Agree to continue", mod: "accept", auth: "client", ro: true },
  "starter-terms": { title: "Starter Terms", mod: "starter-terms", auth: "any", ro: true },
  "privacy-notice": { title: "Privacy Notice", mod: "privacy-notice", auth: "any", ro: true },
  "privacy-request": { title: "Privacy request", mod: "privacy-request", auth: "any", ro: true },
  reset:    { title: "Reset password", mod: "reset", auth: "any", ro: true },
  "reset-confirm": { title: "Choose a new password", mod: "reset-confirm", auth: "any", ro: true },
  locked:   { title: "Portal closed",   mod: "locked",   auth: "any", ro: true },
};

let inviteToken = (typeof window !== "undefined" && window.__cwInviteToken) || null; // set by the inline scrub in index.html
if (typeof window !== "undefined") delete window.__cwInviteToken;
/** Hand the in-memory invite token to the invite screen (one read, then it is gone). */
export function takeInviteToken() { const t = inviteToken; inviteToken = null; return t; }
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
    const t = new URLSearchParams(h.slice(h.indexOf("?") + 1)).get("t");
    if (t) inviteToken = t;
    history.replaceState(null, "", location.pathname + location.search + "#/invite");
    h = "#/invite";
  }
  const path = h.replace(/^#\/?/, "").split("?")[0].replace(/\/+$/, "");
  if (!path) return { name: "home", params: {} };
  const seg = path.split("/");
  if ((seg[0] === "m" || seg[0] === "i") && seg[1]) return { name: seg[0], params: { [ROUTES[seg[0]].param]: decodeURIComponent(seg[1]) } };
  if (ROUTES[path]) return { name: path, params: {} };
  return { name: null, params: {} };
}

export function go(hash, { replace = false } = {}) {
  const target = hash.startsWith("#") ? hash : "#" + hash;
  if (replace) { history.replaceState(null, "", location.pathname + location.search + target); resolve(); }
  else if (location.hash === target) resolve();
  else location.hash = target;
}
export function takeRememberedTarget() { const t = rememberedTarget; rememberedTarget = null; return t; }

export function start(opts) {
  host = opts.host; onRoute = opts.onRoute;
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
      // Counsel 2026-10-23: anyone who still owes the notice or terms goes to the real Starter Terms gate.
      if (me.legal.needsAcceptance || me.legal.needsNotice || me.legal.needsTerms) redirect = 'accept';
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
    const ctx = { el, params: p.params, name, session, state: session.state, router: { go, takeInviteToken, takeResetCode, takeFlash, takeRememberedTarget } };
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

