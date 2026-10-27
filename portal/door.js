// Door at /portal/. The one sign-in page for clients and Parker.
//   #/            returning sign-in: email + password, Google, Apple (gated), "First time signing in?"
//   #/first-time  invite code -> email code -> agree + create a sign-in (password, Google, or Apple)
// After any sign-in: a PGS admin Google session goes to /portal/admin/, a client goes to /portal/client/<cid>/.
// Server contracts are the client app's (lib/session.js, lib/api.js). Cold sign-in creates nothing:
// googleSignIn / appleSignIn / passwordSignIn refuse an identity that was never bound by an invite.
// Opaque invite links (#/invite?t=) are forwarded to the client app by the inline script in index.html.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, connectAuthEmulator, signOut, signInWithPopup, signInWithCredential,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, connectFirestoreEmulator, getDocs, query, collection, limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { firebaseConfig } from "./admin/config.js";
import { fb, initFirebase, passwordBridge, isLocalDev, isLiveSite } from "./client/lib/env.js";
import * as api from "./client/lib/api.js";
import {
  signInWith, signInWithPassword, signInWithAppleReturn, bindInviteGoogle, bindInviteApple, googleWindowError,
} from "./client/lib/session.js";
import { html, raw, mount, setBusy, fmtDateY, dialTicks } from "./client/lib/ui.js";
import { SWAP } from "./client/swap-config.js";
import { appleSignInAllowed, rememberAppleSignInContext, savedAppleSignInContext } from "./client/lib/appleSignInGate.js";
import { acceptanceLabelHtml } from "./client/lib/acceptanceLabel.js";
import { setInviteParties, loadDocument, documentBody } from "./client/lib/legal.js";
import { PASSWORD_HINT, passwordProblem } from "./client/lib/clientCopy.js";
import { showDevCode } from "./client/lib/dev.js";
import { codeErrorMessage } from "./client/screens/_codeform.js";
import { SUSPENDED_BODY, LOCAL_NOTICE_VARS, fillNotice } from "./client/lib/statusNotices.js";

// Shared with the client app: the invite screen restores the same flow after a refresh.
const FLOW_KEY = "cw.invite.flow";
const WELCOME_KEY = "cw.iris.welcome";
// Written by the client app's #/signin hand-off so its message and target survive the trip here.
const NOTE_KEY = "cw.door.note";
const NEXT_KEY = "cw.door.next";
// Display hint only (which client last signed in on this device). Functions recheck everything.
const LAST_CID_KEY = "cw.door.lastCid";

// ---------- admin app (same app and emulator wiring as the CRM, so its session carries over) ----------
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const EMU = LOCAL && !new URLSearchParams(location.search).has("prod");
const adminApp = initializeApp(EMU ? { ...firebaseConfig, projectId: "demo-clockworks-v3" } : firebaseConfig);
const adminAuth = getAuth(adminApp);
const adminDb = initializeFirestore(adminApp, {});
if (EMU) {
  connectAuthEmulator(adminAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(adminDb, "127.0.0.1", 8080);
}

// ---------- tiny view layer ----------
const ICONS = {
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4M12 17h.01"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a4.8 4.8 0 0 1 6.4 0M12 19.5h.01"/>',
  swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
};
const icon = (name) => raw(`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`);
const GOOGLE_MARK = raw('<svg class="mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>');
const APPLE_MARK = raw('<svg class="mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>');
const OPEN_MARK = raw('<svg class="go" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle class="rim" cx="32" cy="32" r="28"/><circle class="arc" cx="32" cy="32" r="28"/><line class="mm" x1="32" y1="32" x2="32" y2="13"/><line x1="32" y1="32" x2="43" y2="32"/><circle class="hub" cx="32" cy="32" r="3"/></svg>');
const HELP_SHOW = "(763) 296-9777";

const viewEl = () => document.querySelector("[data-view]");
const ticks = document.querySelector(".dial .ticks");
if (ticks) ticks.outerHTML = dialTicks(600, 292, 262, 278);

// ---------- the dial keeps the visitor's own time ----------
const dial = document.querySelector(".dial");
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
let turns = { h: 0, m: 0, s: 0 }; // whole turns, so 59 -> 0 keeps moving forward instead of spinning back
let lastDeg = { h: -1, m: -1, s: -1 };
function setHand(sel, key, deg) {
  if (deg < lastDeg[key]) turns[key] += 1;
  lastDeg[key] = deg;
  dial?.querySelector(sel)?.style.setProperty("--a", `${deg + turns[key] * 360}deg`);
}
function tick() {
  const d = new Date();
  const m = d.getMinutes(), h = d.getHours() % 12, sec = d.getSeconds();
  setHand(".mm", "m", m * 6 + sec * 0.1);
  setHand(".hh", "h", h * 30 + m * 0.5);
  if (!calm) setHand(".sec", "s", sec * 6);
}
if (dial) {
  tick();
  requestAnimationFrame(() => dial.classList.add("ready"));
  setInterval(tick, calm ? 30000 : 1000);
  // A breath of depth on a desktop pointer. Phones and reduced motion keep it still.
  if (!calm && matchMedia("(pointer: fine)").matches) {
    let raf = 0;
    addEventListener("pointermove", (ev) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const x = (ev.clientX / innerWidth - 0.5) * -14;
        const y = (ev.clientY / innerHeight - 0.5) * -10;
        dial.style.setProperty("--px", `${x.toFixed(1)}px`);
        dial.style.setProperty("--py", `${y.toFixed(1)}px`);
      });
    }, { passive: true });
  }
}

function dayPart() {
  const h = new Date().getHours();
  return h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
const finePointer = matchMedia("(pointer: fine)").matches;
let teardown = null;

/** Replace the sheet. Focus moves to the heading so a screen reader hears the new step. */
function paint(markup, { focus = true } = {}) {
  teardown?.(); teardown = null;
  document.querySelector(".devhelp")?.remove();
  const el = viewEl();
  el.removeAttribute("aria-busy");
  el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter");
  mount(el, markup);
  if (focus) {
    const h = el.querySelector("h1");
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
  window.scrollTo({ top: 0 });
  return el;
}

const banner = (kind, body) => html`<div class="banner ${kind}" role="${kind === "bad" ? "alert" : "status"}">${icon(kind === "bad" ? "alert" : kind === "ok" ? "check" : "info")}<div>${body}</div></div>`;

/** One error banner inside a form's [data-err] slot (or the sheet). Announced and focused. */
function showError(host, body) {
  const slot = host.querySelector("[data-err]") || host;
  slot.querySelector(".banner")?.remove();
  const wrap = document.createElement("div");
  mount(wrap, banner("bad", body));
  const b = wrap.firstElementChild;
  b.tabIndex = -1;
  slot.prepend(b);
  b.focus({ preventScroll: false });
  const sheet = viewEl();
  sheet.classList.remove("nudge"); void sheet.offsetWidth; sheet.classList.add("nudge");
}
function clearError(host) { (host.querySelector("[data-err]") || host).querySelector(".banner.bad")?.remove(); }

const steps = (at) => html`<ol class="steps" aria-label="Step ${at} of 3">
  ${["Code", "Verify", "Sign-in"].map((s, i) => html`<li ${raw(i < at ? "data-on" : "")} ${raw(i + 1 === at ? 'aria-current="step"' : "")}>${s}</li>`)}</ol>`;

const googleBtn = (label = "Continue with Google", disabled = false) =>
  html`<button type="button" class="btn block" data-google ${raw(disabled ? 'disabled aria-disabled="true"' : "")}>${GOOGLE_MARK}<span>${label}</span></button>`;
function appleBtn(allowed, disabled = false) {
  if (!allowed) {
    return html`<button type="button" class="btn block apple" data-apple disabled aria-disabled="true" aria-describedby="apple-soon">${APPLE_MARK}<span>Apple</span><span class="soon" id="apple-soon">Coming soon</span></button>`;
  }
  return html`<button type="button" class="btn block apple" data-apple ${raw(disabled ? 'disabled aria-disabled="true"' : "")}>${APPLE_MARK}<span>Continue with Apple</span></button>`;
}

function wireReveal(root) {
  root.querySelectorAll(".reveal").forEach((b) => {
    const input = root.querySelector("#" + b.getAttribute("aria-controls"));
    b.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      b.textContent = show ? "Hide" : "Show";
      b.setAttribute("aria-pressed", show ? "true" : "false");
      b.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });
}

function wireCaps(input, hint) {
  if (!input || !hint) return;
  const check = (ev) => { if (ev.getModifierState) hint.hidden = !ev.getModifierState("CapsLock"); };
  input.addEventListener("keydown", check);
  input.addEventListener("keyup", check);
  input.addEventListener("blur", () => { hint.hidden = true; });
}

const store = {
  get(k, s = sessionStorage) { try { return s.getItem(k); } catch { return null; } },
  set(k, v, s = sessionStorage) { try { s.setItem(k, v); } catch { /* private mode */ } },
  del(k, s = sessionStorage) { try { s.removeItem(k); } catch { /* private mode */ } },
};
function take(k) { const v = store.get(k); store.del(k); return v; }

// ---------- leaving the door ----------
let left = false;
// A hash that is not a door route (an old CRM bookmark like #/clients) rides along to the admin app.
const DOOR_HASHES = /^(#\/?|#\/first-time|#\/invite.*)?$/;
const bootHash = DOOR_HASHES.test(location.hash) ? "" : location.hash;

function opening(text) {
  paint(html`<div class="opening">${OPEN_MARK}<h1>${text}</h1><p class="small">One moment.</p></div>`);
}

function goAdmin() {
  if (left) return;
  left = true;
  opening("Opening the admin desk…");
  location.replace("/portal/admin/" + (location.search || "") + bootHash);
}

// Only client-app routes a signed-in client may land on. Anything else is #/home.
function safeNext(next) {
  const h = String(next || "");
  if (!/^#\/[a-z-]+(\/[A-Za-z0-9_-]{1,80})?$/.test(h)) return "#/home";
  if (/^#\/(invite|signin|verify)\b/.test(h)) return "#/home";
  return h;
}

/** A client session exists on the client app. Hand off to /portal/client/<cid>/. */
async function enterClient(next) {
  if (left) return;
  const user = fb.auth.currentUser;
  let claims = null;
  try { claims = (await user?.getIdTokenResult())?.claims || null; } catch { claims = null; }
  const cid = claims?.role === "client" && typeof claims.cid === "string" ? claims.cid : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/.test(cid)) {
    await signOut(fb.auth).catch(() => {});
    signinView("For your security, please sign in again.");
    return;
  }
  left = true;
  store.set(LAST_CID_KEY, cid, localStorage);
  opening("Opening your portal…");
  location.replace(`/portal/client/${encodeURIComponent(cid)}/${safeNext(next || take(NEXT_KEY))}`);
}

// Same decision the CRM makes on boot: the rules allow a clients read only for a PGS admin.
async function isStaffSession(user) {
  if (!user) return false;
  try {
    const tok = await user.getIdTokenResult();
    if (tok?.claims?.role === "client") return false;
    return await getDocs(query(collection(adminDb, "clients"), limit(1))).then(() => true, () => false);
  } catch {
    return false;
  }
}

function firstAuth(auth, ms = 4000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (u) => { if (done) return; done = true; off?.(); resolve(u || null); };
    const off = onAuthStateChanged(auth, finish);
    setTimeout(() => finish(auth.currentUser), ms);
  });
}

// ---------- error copy ----------
function detailsOf(e) { const d = e?.details; return d && typeof d === "object" ? d : {}; }
function reasonOf(e) {
  const reason = detailsOf(e).reason;
  if (reason) return String(reason);
  const msg = String(e?.message || "");
  const keys = [
    "invite_expired", "invite_used", "invite_cancelled", "invite_bad",
    "portal_suspended", "portal_archived", "portal_locked", "portal_disabled", "portal_not_live",
    "proof_expired", "proof_required", "email_mismatch",
  ];
  return keys.find((k) => msg.includes(k)) || "";
}

/** Copy for a returning sign-in that failed. Returns markup. */
function signinProblem(e, label) {
  const code = String(e?.code || "");
  const reason = reasonOf(e);
  const win = googleWindowError(e);
  if (win === "cancel") return html`${label} was closed before it finished. Try again, or use your email and password.`;
  if (win === "blocked") return html`Your browser blocked the ${label} window. Allow pop-ups for this site, or use your email and password.`;
  if (/auth\/(invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login-credentials)/.test(code) || /sign_in_failed/.test(String(e?.message || "")))
    return html`That email and password didn't match. Check them and try again, or <a href="/portal/client/#/reset">reset your password</a>.`;
  if (code === "auth/too-many-requests" || api.errCode(e) === "resource-exhausted")
    return html`That's a lot of tries. Give it a few minutes, then try again.`;
  if (code === "auth/network-request-failed") return html`We couldn't reach the portal. Check your connection and try again.`;
  if (code === "auth/user-disabled") return html`This sign-in is turned off. Call Parker at <a href="tel:+17632969777">${HELP_SHOW}</a>.`;
  if (code === "ask_parker") return html`We couldn't find a portal for that ${label} account. First time here? <a href="#/first-time">Use your invite code</a>.`;
  if (code === "use_password") return html`That ${label} account isn't how you sign in. Use your email and password instead.`;
  if (reason === "portal_suspended") return html`Your portal is paused right now. Call Parker at <a href="tel:+17632969777">${HELP_SHOW}</a>.`;
  if (reason === "portal_locked" || reason === "portal_archived") return html`This portal is closed. Parker can still send copies of your signed terms and receipts.`;
  if (reason === "portal_disabled" || reason === "portal_not_live") return html`Your portal isn't turned on yet. Parker will let you know when it's ready.`;
  return html`${api.friendlyError(e)}`;
}

// ---------- returning sign-in ----------
function appleForReturn() {
  const saved = savedAppleSignInContext();
  if (saved) return appleSignInAllowed(saved);
  const cid = store.get(LAST_CID_KEY, localStorage);
  return appleSignInAllowed(cid ? { cid, fixture: false } : null);
}

const EMAIL_KEY = "cw.door.email"; // only kept when "Keep me signed in" was ticked on this device

function signinView(note = "", { focus = false } = {}) {
  document.title = "Sign in · Clockworks";
  const apple = appleForReturn();
  const knownEmail = store.get(EMAIL_KEY, localStorage) || "";
  const el = paint(html`
    <div class="head">
      <span class="eyebrow">${dayPart()} · Client portal</span>
      <h1>Welcome <em>back</em>.</h1>
      <p class="lead">Sign in to see your intake, files, and messages with Parker.</p>
    </div>
    ${note ? banner("info", note) : ""}
    <form id="signin" novalidate>
      <div data-err></div>
      <div class="field"><label for="email">Email</label>
        <input id="email" type="email" autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false" enterkeyhint="next" value="${knownEmail}"></div>
      <div class="field">
        <div class="label-row"><label for="password">Password</label><a href="/portal/client/#/reset">Forgot password?</a></div>
        <div class="input"><input id="password" class="with-reveal" type="password" autocomplete="current-password" enterkeyhint="go" aria-describedby="caps">
          <button type="button" class="reveal" aria-controls="password" aria-pressed="false" aria-label="Show password">Show</button></div>
        <span class="caps" id="caps" role="status" hidden>Caps Lock is on</span>
      </div>
      <label class="check"><input type="checkbox" id="keep" ${raw(knownEmail ? "checked" : "")}><span><b>Keep me signed in</b><br><span class="small">Leave this off on a shared computer.</span></span></label>
      <button class="btn primary block" type="submit">Sign in</button>
    </form>
    <div class="or" role="presentation">or</div>
    <div class="oauth">${googleBtn()}${appleBtn(apple)}</div>
    <div class="first">
      <p>First time signing in?<span>Use the invite code Parker sent you.</span></p>
      <a class="btn" href="#/first-time" data-first>I have a code</a>
    </div>`, { focus });
  wireReveal(el);
  const form = el.querySelector("#signin");
  const keep = () => !!el.querySelector("#keep")?.checked;
  wireCaps(form.querySelector("#password"), form.querySelector("#caps"));
  // On a desktop, put the cursor where typing starts. Phones wait for a tap so the keyboard doesn't jump up.
  if (finePointer && !note) form.querySelector(knownEmail ? "#password" : "#email").focus({ preventScroll: true });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearError(form);
    const email = form.querySelector("#email").value.trim().toLowerCase();
    const password = form.querySelector("#password").value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showError(form, html`Enter the email address you use for this portal.`); form.querySelector("#email").focus(); return; }
    if (!password) { showError(form, html`Enter your password.`); form.querySelector("#password").focus(); return; }
    const b = form.querySelector("button[type=submit]");
    setBusy(b, true);
    try {
      await api.withTimeout(signInWithPassword(email, password, keep()));
      if (keep()) store.set(EMAIL_KEY, email, localStorage); else store.del(EMAIL_KEY, localStorage);
      await enterClient();
    } catch (e) {
      setBusy(b, false);
      showError(form, signinProblem(e, "password"));
    }
  });
  el.querySelector("[data-google]").addEventListener("click", () => googleReturn(el, form, keep()));
  const appleNode = el.querySelector("[data-apple]");
  if (apple) appleNode.addEventListener("click", async () => {
    clearError(form);
    setBusy(appleNode, true);
    try {
      await api.withTimeout(signInWithAppleReturn(keep()), 90000);
      await enterClient();
    } catch (e) {
      setBusy(appleNode, false);
      showError(form, signinProblem(e, "Apple"));
    }
  });
}

/** Google opens one window. A PGS admin goes to the CRM; anyone else needs a bound client account. */
async function googleReturn(el, form, keep) {
  const btn = el.querySelector("[data-google]");
  clearError(form);
  setBusy(btn, true);
  const bridge = passwordBridge();
  try {
    await signOut(bridge.auth).catch(() => {});
    let cred;
    const mode = isLocalDev() ? window.__cwGoogleMode : "";
    if (mode === "cancel" || mode === "blocked") {
      const err = new Error("popup"); err.code = mode === "cancel" ? "auth/popup-closed-by-user" : "auth/popup-blocked"; throw err;
    }
    const devEmail = isLocalDev() ? String(window.__cwGoogleEmail || "").trim().toLowerCase() : "";
    if (devEmail) {
      cred = GoogleAuthProvider.credential(JSON.stringify({ sub: "test-" + devEmail.replace(/\W/g, "-"), email: devEmail, email_verified: true }));
      await signInWithCredential(bridge.auth, cred);
    } else {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await api.withTimeout(signInWithPopup(bridge.auth, provider), 180000);
      cred = GoogleAuthProvider.credentialFromResult(result);
    }
    // Admin first. The rules are the judge; a non-admin read is refused and we sign straight back out.
    if (cred) {
      try {
        await signInWithCredential(adminAuth, cred);
        if (await isStaffSession(adminAuth.currentUser)) {
          await signOut(bridge.auth).catch(() => {});
          goAdmin();
          return;
        }
      } catch { /* not an admin; fall through to the client check */ }
      await signOut(adminAuth).catch(() => {});
    }
    const res = await api.withTimeout(httpsCallable(bridge.fns, "googleSignIn")({ keepSignedIn: !!keep }));
    await signOut(bridge.auth).catch(() => {});
    const data = res.data || {};
    if (data.ok === false || !data.customToken) {
      const err = new Error(data.code || "ask_parker"); err.code = data.code || "ask_parker"; throw err;
    }
    await signInWith(data.customToken, !!keep);
    await enterClient();
  } catch (e) {
    await signOut(bridge.auth).catch(() => {});
    setBusy(btn, false);
    showError(form, signinProblem(e, "Google"));
  }
}

// ---------- first time: code -> email code -> agree + create a sign-in ----------
let entry = null;   // { invite: "<code>" }
let info = null;    // what inviteOpen / inviteVerify told us (masked email, business, cid, fixture)
let proof = null;   // one-step proof that the invite email was verified

function readFlow() {
  try {
    const flow = JSON.parse(store.get(FLOW_KEY) || "null");
    if (!flow?.proof || !flow.proofExpiresAt || flow.proofExpiresAt < Date.now()) { store.del(FLOW_KEY); return null; }
    return flow;
  } catch { return null; }
}
function clearFlow() { store.del(FLOW_KEY); }

function locate(extra = {}) {
  const invite = entry?.invite || "";
  if (extra.code) return { invite, ...extra };
  return invite ? { code: invite, ...extra } : { ...extra };
}

function rememberProof(next) {
  proof = next.proof;
  info = {
    maskedEmail: next.maskedEmail || info?.maskedEmail || "",
    businessName: next.businessName || info?.businessName || "",
    cid: next.cid || info?.cid || "",
    fixture: next.fixture === true || info?.fixture === true,
    contactName: next.contactName || info?.contactName || "",
    expiresAt: next.expiresAt || info?.expiresAt || null,
    displayCode: next.displayCode || info?.displayCode || null,
  };
  rememberAppleSignInContext(info);
  store.set(FLOW_KEY, JSON.stringify({ step: "choose", proof, proofExpiresAt: next.proofExpiresAt, ...info }));
}

const firstName = () => String(info?.contactName || "").trim().split(/\s+/)[0] || "";
const prettyCode = (v) => {
  const s = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length > 4 ? `${s.slice(0, 4)}-${s.slice(4, 8)}` : s;
};

function codeView(note = "", prefill = "") {
  document.title = "Get set up · Clockworks";
  entry = null; info = null; proof = null; clearFlow();
  const el = paint(html`
    ${steps(1)}
    <div class="head">
      <span class="eyebrow">First time here</span>
      <h1>Let's get you <em>set up</em>.</h1>
      <p class="lead">Enter the invite code from Parker. It's in the email or text he sent and looks like <b>ABCD-2345</b>.</p>
    </div>
    ${note ? banner("info", note) : ""}
    <form id="code-form" novalidate>
      <div data-err></div>
      <div class="field"><label for="invite-code">Invite code</label>
        <input id="invite-code" class="code-in" type="text" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX" maxlength="400" enterkeyhint="go" aria-describedby="code-hint" value="${prefill}">
        <span class="hint" id="code-hint">Got a link instead? Paste it here, or just open it.</span></div>
      <button class="btn primary block" type="submit">Continue</button>
    </form>
    <p class="small center">Already set up? <a href="#/">Sign in</a></p>`);
  const form = el.querySelector("#code-form");
  const input = form.querySelector("#invite-code");
  input.addEventListener("input", () => {
    // Format a short code as it is typed. Leave anything that looks like a pasted link alone.
    if (/[/:#?=.]/.test(input.value) || input.value.length > 12) return;
    const at = input.selectionStart === input.value.length;
    const v = prettyCode(input.value);
    if (v !== input.value) { input.value = v; if (at) input.setSelectionRange(v.length, v.length); }
  });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearError(form);
    const rawValue = String(input.value || "").trim();
    if (!rawValue) { showError(form, html`Enter the code, or paste the link Parker sent.`); input.focus(); return; }
    // A pasted invite link keeps its own path: the client app opens it without an email code.
    const fromLink = rawValue.match(/[?&#]t=([A-Za-z0-9_-]{20,200})/);
    if (fromLink) { left = true; location.assign("/portal/client/#/invite?t=" + encodeURIComponent(fromLink[1])); return; }
    if (/^https?:\/\//i.test(rawValue)) {
      try {
        const u = new URL(rawValue);
        const hostOk = ["mnclockworks.com", "www.mnclockworks.com", "localhost", "127.0.0.1"].includes(u.hostname);
        if (hostOk && u.pathname.startsWith("/portal/client")) { left = true; location.assign(u.pathname + u.search + u.hash); return; }
      } catch { /* treat as a code */ }
    }
    const btn = form.querySelector("button[type=submit]");
    setBusy(btn, true);
    entry = { invite: rawValue };
    await openEntry(btn);
  });
  if (prefill || finePointer) input.focus({ preventScroll: true });
}

async function openEntry(btn) {
  const back = (note) => codeView(note, entry?.invite && !String(entry.invite).includes("t=") ? prettyCode(entry.invite) : "");
  try {
    const opened = await api.withTimeout(api.inviteOpen(locate()));
    if (!opened || opened.ok === false) { back("That code didn't match. Check it and try again."); return; }
    info = opened;
    rememberAppleSignInContext(opened);
    proveView();
  } catch (e) {
    setBusy(btn, false);
    const code = api.errCode(e);
    if (["unavailable", "deadline-exceeded", "internal"].includes(code)) { slowView(() => openEntry()); return; }
    if (reasonOf(e) === "invite_bad") { back("That code didn't match. Check it and try again."); return; }
    if (!stuck(e)) back("That code didn't open. Check it, or ask Parker for a fresh one.");
  }
}

function proveView() {
  setInviteParties({ businessName: info?.businessName, contactName: info?.contactName, email: info?.maskedEmail });
  const name = firstName();
  const el = paint(html`
    ${steps(2)}
    <div class="head">
      <span class="eyebrow">Private invite · from Parker</span>
      <h1>${name ? html`Hi, <em>${name}</em>.` : html`<em>Welcome</em>.`}</h1>
      <p class="lead">Parker set up a private space for <b>${info?.businessName || "your business"}</b>. Your intake, files, and messages live here.</p>
    </div>
    <div class="banner info" role="note">${icon("mail")}<div>To make sure it's you, we'll email a 6-digit code to <b>${info?.maskedEmail || "the address on your invite"}</b>. Checking doesn't use up your invite.</div></div>
    <div data-err></div>
    <div class="actions">
      <button type="button" class="btn primary block" data-send>Email me the code</button>
      <button type="button" class="btn link" data-other>Use a different code</button>
    </div>`);
  el.querySelector("[data-other]").addEventListener("click", () => codeView());
  const send = el.querySelector("[data-send]");
  send.addEventListener("click", async () => {
    clearError(el);
    setBusy(send, true);
    try {
      await api.withTimeout(api.inviteSendCode(locate()));
      verifyView();
    } catch (e) {
      setBusy(send, false);
      if (!stuck(e)) showError(el, html`${api.friendlyError(e)}`);
    }
  });
}

function verifyView() {
  showDevCode(info?.maskedEmail);
  const el = paint(html`
    ${steps(2)}
    <div class="head">
      <span class="eyebrow">Verify it's you</span>
      <h1>Check your <em>email</em>.</h1>
      <p class="lead">We sent a 6-digit code to <b>${info?.maskedEmail || "your email"}</b>. It works for 10 minutes.</p>
    </div>
    <form id="verify" novalidate>
      <div data-err></div>
      <div class="field" data-f><label for="otp">6-digit code</label>
        <div class="digits"><input id="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-describedby="otp-hint">
          <div class="boxes" aria-hidden="true">${Array.from({ length: 6 }, (_, i) => html`<span class="${i === 0 ? "cur" : ""}"></span>`)}</div></div>
        <span class="hint" id="otp-hint">Not there? Check spam, or ask for a new one below.</span></div>
      <button class="btn primary block" type="submit">Verify</button>
      <div class="row-between"><button type="button" class="btn link" data-resend disabled aria-disabled="true">Send a new code</button>
        <span class="small" data-count role="status"></span></div>
    </form>
    <p class="small center"><button type="button" class="btn link" data-other>Use a different code</button></p>`);
  // The device's "Verify" focus belongs on the code field; the heading was already announced.
  const form = el.querySelector("#verify");
  const input = form.querySelector("#otp");
  const boxes = [...form.querySelectorAll(".boxes span")];
  const draw = () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 6);
    boxes.forEach((s, i) => { s.textContent = input.value[i] || ""; s.classList.toggle("on", !!input.value[i]); s.classList.toggle("cur", i === Math.min(input.value.length, 5)); });
    if (input.value.length === 6) form.requestSubmit();
  };
  input.addEventListener("input", draw);
  setTimeout(() => input.focus(), 60);
  el.querySelector("[data-other]").addEventListener("click", () => codeView());
  const resend = form.querySelector("[data-resend]");
  const count = form.querySelector("[data-count]");
  let left30 = 30, timer;
  const tick = () => {
    if (left30 > 0) { count.textContent = `New code in ${left30}s`; left30--; }
    else { clearInterval(timer); count.textContent = ""; resend.disabled = false; resend.removeAttribute("aria-disabled"); }
  };
  const start = () => { left30 = 30; resend.disabled = true; resend.setAttribute("aria-disabled", "true"); clearInterval(timer); tick(); timer = setInterval(tick, 1000); };
  start();
  teardown = () => clearInterval(timer);
  resend.addEventListener("click", async () => {
    resend.disabled = true;
    try { await api.withTimeout(api.inviteSendCode(locate())); showDevCode(info?.maskedEmail); start(); count.textContent = "New code sent."; }
    catch (e) { resend.disabled = false; if (!stuck(e)) showError(form, html`${api.friendlyError(e)}`); }
  });
  let busy = false;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (busy) return;
    clearError(form);
    const code = input.value.replace(/\D/g, "");
    const f = form.querySelector("[data-f]");
    if (code.length !== 6) { f.classList.add("has-error"); showError(form, html`Enter the 6-digit code from your email.`); input.focus(); return; }
    const btn = form.querySelector("button[type=submit]");
    busy = true; setBusy(btn, true);
    try {
      const next = await api.withTimeout(api.inviteVerify(locate({ code })));
      if (!next?.proof) { const err = new Error("proof_required"); err.code = "failed-precondition"; throw err; }
      rememberProof(next);
      signupView();
    } catch (e) {
      busy = false; setBusy(btn, false);
      if (stuck(e)) return;
      f.classList.add("has-error");
      showError(form, html`${codeErrorMessage(e)}`);
      input.value = ""; draw(); input.focus();
    }
  });
}

function signupView(note = "", { agreed = false } = {}) {
  setInviteParties({ businessName: info?.businessName, contactName: info?.contactName, email: info?.maskedEmail });
  const apple = appleSignInAllowed(info);
  const el = paint(html`
    ${steps(3)}
    <div class="head">
      <span class="eyebrow">Create your sign-in</span>
      <h1>Make it <em>yours</em>.</h1>
      <p class="lead">For <b>${info?.businessName || "your business"}</b> · <b>${info?.maskedEmail || "your email"}</b>. Pick how you'll sign in from now on.</p>
    </div>
    ${note ? banner("info", note) : ""}
    <div data-err></div>
    <div class="check agree" data-agree>
      <input id="agree" type="checkbox" aria-labelledby="agree-label" aria-describedby="agree-hint">
      ${acceptanceLabelHtml()}
    </div>
    <p class="small" id="agree-hint" data-agree-hint>Check the box to continue. Tap a document name to read it here.</p>
    <label class="check"><input type="checkbox" id="keep"><span><b>Keep me signed in on this device</b><br><span class="small">Leave this off on a shared computer.</span></span></label>
    <div class="oauth">${googleBtn("Continue with Google", true)}${appleBtn(apple, true)}</div>
    <div class="or" role="presentation">or set a password</div>
    <form id="password-form" novalidate>
      <div class="field"><label for="new-password">Password</label>
        <div class="input"><input id="new-password" class="with-reveal" type="password" autocomplete="new-password" minlength="12" maxlength="200" aria-describedby="pw-hint">
          <button type="button" class="reveal" aria-controls="new-password" aria-pressed="false" aria-label="Show password">Show</button></div>
        <div class="meter" data-n="0" aria-hidden="true"><i></i><i></i><i></i></div>
        <span class="hint" id="pw-hint">${PASSWORD_HINT}</span></div>
      <div class="field"><label for="confirm-password">Confirm password</label>
        <input id="confirm-password" type="password" autocomplete="new-password" maxlength="200" enterkeyhint="done">
        <span class="match" data-match aria-live="polite"></span></div>
      <button class="btn primary block" type="submit" disabled aria-disabled="true">Create my account</button>
    </form>
    <p class="small center"><button type="button" class="btn link" data-other>Use a different code</button></p>`);
  wireReveal(el);
  el.querySelector("[data-other]").addEventListener("click", () => codeView());
  const box = el.querySelector("#agree");
  const agreeWrap = el.querySelector("[data-agree]");
  const google = el.querySelector("[data-google]");
  const appleNode = el.querySelector("[data-apple]");
  const create = el.querySelector("#password-form button[type=submit]");
  const hint = el.querySelector("[data-agree-hint]");
  const sync = () => {
    const on = box.checked;
    agreeWrap.classList.toggle("on", on);
    for (const node of [google, apple ? appleNode : null, create]) {
      if (!node) continue;
      node.disabled = !on;
      node.setAttribute("aria-disabled", on ? "false" : "true");
    }
    hint.textContent = on ? "Thanks. Now pick how you'll sign in." : "Check the box to continue. Tap a document name to read it here.";
  };
  // The label is a <p> (its links can't sit inside a <label>), so a tap on its text toggles the box.
  agreeWrap.addEventListener("click", (ev) => {
    if (ev.target.closest("a") || ev.target === box) return;
    box.checked = !box.checked; sync();
  });
  box.addEventListener("change", sync);
  if (agreed) box.checked = true;
  sync();

  const pw = el.querySelector("#new-password");
  const pw2 = el.querySelector("#confirm-password");
  const meter = el.querySelector(".meter");
  const match = el.querySelector("[data-match]");
  const score = (v) => !v ? 0 : v.length < 12 ? 1 : (/[a-z]/i.test(v) && /\d/.test(v)) ? (v.length >= 16 || /[^a-z0-9]/i.test(v) ? 3 : 2) : 1;
  const syncPw = () => {
    meter.dataset.n = String(score(pw.value));
    const ok = pw2.value && pw.value === pw2.value && pw.value.length >= 12;
    match.textContent = ok ? "✓ Passwords match" : "";
  };
  pw.addEventListener("input", syncPw);
  pw2.addEventListener("input", syncPw);

  const keep = () => !!el.querySelector("#keep")?.checked;
  const pwForm = el.querySelector("#password-form");
  pwForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearError(el);
    if (!box.checked) { showError(el, html`Check the box to agree before you continue.`); box.focus(); return; }
    const problem = passwordProblem(pw.value);
    if (problem) { showError(el, html`${problem}`); pw.focus(); return; }
    if (pw.value !== pw2.value) { showError(el, html`Those passwords don't match.`); pw2.focus(); return; }
    setBusy(create, true);
    try {
      const r = await api.withTimeout(api.inviteSetPassword({
        proof, password: pw.value, agree: true, label: SWAP.acceptance.label, keepSignedIn: keep(),
      }));
      await bindAndEnter(r.customToken, keep());
    } catch (e) {
      setBusy(create, false);
      bindProblem(e, "password");
    }
  });
  google.addEventListener("click", () => bindOAuth("google", keep()));
  if (apple) appleNode.addEventListener("click", () => bindOAuth("apple", keep()));
}

async function bindAndEnter(customToken, keep) {
  await signInWith(customToken, !!keep);
  const name = firstName();
  clearFlow();
  entry = null; proof = null;
  store.set(WELCOME_KEY, JSON.stringify({ name }));
  await enterClient("#/home");
}

async function bindOAuth(kind, keep) {
  if (!proof) return;
  const apple = kind === "apple";
  const btn = viewEl().querySelector(apple ? "[data-apple]" : "[data-google]");
  clearError(viewEl());
  setBusy(btn, true);
  try {
    const run = apple ? bindInviteApple : bindInviteGoogle;
    const r = await api.withTimeout(run({ proof, agree: true, label: SWAP.acceptance.label, keepSignedIn: !!keep }), 180000);
    await bindAndEnter(r.customToken, keep);
  } catch (e) {
    setBusy(btn, false);
    bindProblem(e, apple ? "Apple" : "Google");
  }
}

/** A create-sign-in step failed. Stuck states replace the sheet; the rest keep the form and say why. */
function bindProblem(e, label) {
  const win = googleWindowError(e);
  const d = detailsOf(e);
  const reason = reasonOf(e);
  if (win) {
    api.inviteNote({ proof, reason: win === "blocked" ? "popup_blocked" : "oauth_cancel" }).catch(() => {});
    signupView(win === "blocked"
      ? `Your browser blocked the ${label} window. Allow pop-ups and try again, or set a password below.`
      : `${label} was closed before it finished. Try again, or set a password below.`, { agreed: true });
    return;
  }
  if (e?.code === "apple_email_missing" || d.code === "apple_email_missing") {
    signupView("Apple didn't share an email address. Share the address on this invite, or set a password below.", { agreed: true });
    return;
  }
  if (e?.code === "email_mismatch" || d.code === "email_mismatch" || reason === "email_mismatch") {
    const shown = label === "Apple" ? (d.appleMasked || "another address") : (d.googleMasked || "another address");
    signupView(`That ${label} account is ${shown}, but this invite is for ${d.inviteMasked || info?.maskedEmail || "a different address"}. Switch accounts, or set a password below.`, { agreed: true });
    return;
  }
  if (reason === "proof_expired" || reason === "proof_required") {
    codeView("That step timed out. Enter your invite code again. The invite itself is still good until it expires.");
    return;
  }
  if (stuck(e)) return;
  showError(viewEl(), html`${api.friendlyError(e)}`);
}

// ---------- stuck states: every one ends in a calm next step ----------
function stuckSheet({ ic, eyebrow, title, body, actions }) {
  return paint(html`
    <span class="emblem">${icon(ic)}</span>
    <div class="head"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${body}</div>
    <div data-err></div>
    <div class="actions">${actions}</div>`);
}

function askRefreshButton(el) {
  const btn = el.querySelector("[data-refresh]");
  btn?.addEventListener("click", async () => {
    setBusy(btn, true);
    try {
      const r = await api.withTimeout(api.inviteAskRefresh(locate()));
      setBusy(btn, false);
      btn.disabled = true;
      const line = el.querySelector("[data-refresh-note]");
      if (line) mount(line, banner("ok", r?.already ? "Parker already has your note. He'll send a fresh invite." : "Done. Parker has your note and will send a fresh invite."));
    } catch (e) {
      setBusy(btn, false);
      showError(el, html`${api.friendlyError(e)}`);
    }
  });
}

/** Returns true when the sheet was replaced. */
function stuck(e) {
  const reason = reasonOf(e);
  const extra = detailsOf(e);
  if (reason === "invite_expired") {
    const when = extra?.expiresAt ? fmtDateY(extra.expiresAt) : "";
    const el = stuckSheet({ ic: "clock", eyebrow: "Invite expired", title: html`This invite has <em>expired</em>.`,
      body: html`<p class="lead">${when ? `It was good through ${when}.` : "Its date has passed."} Invites work for ${SWAP.inviteExpiryDays} days. Ask Parker for a fresh one; it only takes him a minute.</p>`,
      actions: html`<button type="button" class="btn primary block" data-refresh>Ask Parker for a new invite</button><div data-refresh-note role="status"></div><a class="btn link" href="#/first-time" data-again>Try a different code</a>` });
    askRefreshButton(el);
    el.querySelector("[data-again]").addEventListener("click", (ev) => { ev.preventDefault(); codeView(); });
    return true;
  }
  if (reason === "invite_used") {
    const how = extra?.boundMethod === "google" ? "Google" : extra?.boundMethod === "apple" ? "Apple" : extra?.boundMethod === "password" ? "the password you set" : "the way you set up";
    stuckSheet({ ic: "check", eyebrow: "Already set up", title: html`You're <em>already in</em>.`,
      body: html`<p class="lead">This invite was used to create your sign-in, so it won't work again. Sign in with ${how}.</p>`,
      actions: html`<a class="btn primary block" href="#/">Go to sign in</a>` });
    return true;
  }
  if (reason === "invite_cancelled") {
    const el = stuckSheet({ ic: "swap", eyebrow: "Invite replaced", title: html`This invite was <em>replaced</em>.`,
      body: html`<p class="lead">Parker sent a newer invite, so this one is turned off. Look for the latest email or text from him, or ask for a fresh code.</p>`,
      actions: html`<button type="button" class="btn primary block" data-refresh>Ask Parker for the new code</button><div data-refresh-note role="status"></div><a class="btn link" href="#/first-time" data-again>Try a different code</a>` });
    askRefreshButton(el);
    el.querySelector("[data-again]").addEventListener("click", (ev) => { ev.preventDefault(); codeView(); });
    return true;
  }
  if (reason === "portal_suspended") {
    const body = fillNotice(SUSPENDED_BODY, LOCAL_NOTICE_VARS);
    stuckSheet({ ic: "pause", eyebrow: "Account status", title: html`Your account is SUSPENDED`,
      body: html`${body.split("\n\n").map((p) => html`<p class="lead">${p}</p>`)}`,
      actions: html`<a class="btn primary block" href="tel:+17632969777">Call Parker</a>` });
    return true;
  }
  if (["portal_locked", "portal_archived", "portal_disabled", "portal_not_live"].includes(reason)) {
    const closed = reason === "portal_locked" || reason === "portal_archived";
    stuckSheet({ ic: "lock", eyebrow: "Portal status", title: closed ? html`This portal is <em>closed</em>.` : html`Not <em>open</em> yet.`,
      body: html`<p class="lead">${closed ? "Our work together wrapped up. Parker can still send copies of your signed terms and receipts." : "Your portal isn't turned on yet. Parker will let you know when it's ready."}</p>`,
      actions: html`<a class="btn primary block" href="tel:+17632969777">Call Parker</a><a class="btn link" href="#/">Back to sign in</a>` });
    return true;
  }
  if (api.errCode(e) === "resource-exhausted") {
    stuckSheet({ ic: "clock", eyebrow: "Too many tries", title: html`Let's take a <em>breather</em>.`,
      body: html`<p class="lead">That's a lot of tries in a short time. Give it a few minutes, then try again. Your invite is still good.</p>`,
      actions: html`<a class="btn primary block" href="#/first-time" data-again>Try again</a>` })
      .querySelector("[data-again]").addEventListener("click", (ev) => { ev.preventDefault(); codeView(); });
    return true;
  }
  return false;
}

function slowView(retry) {
  const el = stuckSheet({ ic: "wifi", eyebrow: "Connection", title: html`Still <em>connecting</em>.`,
    body: html`<p class="lead">That took longer than it should. Nothing was used up. Check your connection and try again.</p>`,
    actions: html`<button type="button" class="btn primary block" data-retry>Try again</button><a class="btn link" href="#/">Back to sign in</a>` });
  const b = el.querySelector("[data-retry]");
  b.addEventListener("click", () => { setBusy(b, true); retry(); });
}

// ---------- reading a document without leaving the flow ----------
const dialog = document.getElementById("doc");
dialog?.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => dialog.close()));
dialog?.addEventListener("click", (ev) => { if (ev.target === dialog) dialog.close(); });
async function openDoc(kind) {
  if (!dialog) return;
  const title = dialog.querySelector("#doc-title");
  const body = dialog.querySelector(".doc-body");
  const d = kind === "terms" ? SWAP.acceptance.terms : SWAP.acceptance.notice;
  title.textContent = `${d.linkText} · ${d.version}`;
  mount(body, html`<div class="spin" aria-hidden="true"></div><p class="sr">Loading</p>`);
  dialog.showModal();
  try {
    const doc = await loadDocument(kind);
    mount(body, documentBody(doc.text));
    body.scrollTop = 0;
  } catch {
    mount(body, html`<p>That document didn't load. <a href="/portal/client/${kind === "terms" ? "#/starter-terms" : "#/privacy-notice"}" target="_blank" rel="noopener">Open it in a new tab</a>.</p>`);
  }
}
document.addEventListener("click", (ev) => {
  const a = ev.target.closest?.("a[href]");
  if (!a || !viewEl()?.contains(a)) return;
  const href = a.getAttribute("href");
  if (href === SWAP.acceptance.terms.href) { ev.preventDefault(); openDoc("terms"); }
  else if (href === SWAP.acceptance.notice.href) { ev.preventDefault(); openDoc("notice"); }
});

// ---------- routing ----------
function route({ initial = false } = {}) {
  if (left) return;
  const h = location.hash || "";
  if (h.startsWith("#/invite?")) {
    // A short code on a link (#/invite?c=) opens the first-time flow already filled in.
    const q = new URLSearchParams(h.slice(h.indexOf("?") + 1));
    // Same forward as the inline script, for a hash change that never reloads this page.
    if (q.get("t")) { left = true; location.replace("/portal/client/" + h); return; }
    const c = q.get("c") || "";
    history.replaceState(null, "", location.pathname + location.search + "#/first-time");
    if (c) {
      codeView("", prettyCode(c));
      const form = viewEl().querySelector("#code-form");
      form?.requestSubmit();
      return;
    }
    codeView();
    return;
  }
  if (h === "#/first-time") {
    const saved = readFlow();
    if (saved) { proof = saved.proof; info = saved; signupView(); return; }
    codeView();
    return;
  }
  signinView(take(NOTE_KEY) || "", { focus: !initial });
}
window.addEventListener("hashchange", () => route());

async function boot() {
  if (!(isLocalDev() || isLiveSite()) || !initFirebase()) {
    paint(html`<div class="head"><span class="eyebrow">MN Clockworks</span><h1>Not open <em>here</em>.</h1>
      <p class="lead">The portal only runs on mnclockworks.com. If Parker sent you a link, open it from that email or text.</p></div>`);
    return;
  }
  const splash = new URLSearchParams(location.search).has("splash");
  if (!splash) {
    const [clientUser, adminUser] = await Promise.all([firstAuth(fb.auth), firstAuth(adminAuth)]);
    if (clientUser) {
      const claims = (await clientUser.getIdTokenResult().catch(() => null))?.claims;
      if (claims?.role === "client" && claims.cid) { await enterClient(); return; }
    }
    if (adminUser && await isStaffSession(adminUser)) { goAdmin(); return; }
  }
  route({ initial: true });
}
boot().catch((e) => {
  console.debug("[cw] door boot failed", e);
  paint(html`<div class="head"><span class="eyebrow">MN Clockworks</span><h1>Something <em>slipped</em>.</h1>
    <p class="lead">Reload the page to try again. If it keeps happening, call Parker at <a href="tel:+17632969777">${HELP_SHOW}</a>.</p></div>`);
});
