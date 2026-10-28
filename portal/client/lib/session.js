// Auth state machine: boot -> signedOut | signingIn | active | readonly | locked | disabled
// (ARCHITECTURE section 5). One module-level store; subscribe() to hear about changes.
import {
  onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence,
  signInWithCustomToken, signInWithEmailAndPassword, signInWithPopup, signInWithCredential,
  GoogleAuthProvider, OAuthProvider, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { fb, passwordBridge, isLocalDev } from "./env.js";
import * as api from "./api.js";
import { clearDrafts } from "./drafts.js";
import { showDevCode } from "./dev.js";
import { html, mount, ic, showErrors, setBusy } from "./ui.js";

export const state = {
  status: "boot",       // boot | signedOut | signingIn | active | readonly | locked | disabled
  user: null,
  cid: null,
  role: null,           // 'owner' | 'member' if the token carries it, else null
  email: null,
  home: null,           // latest clientView/home data
  homeLoaded: false,
  gateMessage: null,    // neutral message shown on the sign-in screen
  suspended: false,
  archived: false,
  archiveUntil: null,
  archiveClosedAt: null,
};
const subs = new Set();
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit() { subs.forEach((f) => { try { f(state); } catch (e) { console.debug("[cw] sub", e); } }); }
function set(patch) { Object.assign(state, patch); emit(); }

let unsubHome = null;
export const isSignedIn = () => ["active", "readonly", "locked", "disabled", "signingIn"].includes(state.status);
export const features = () => state.home?.features || {};

/** Start listening to auth. Resolves after the first auth decision so the router can start. */
export function init() {
  return new Promise((resolve) => {
    let first = true;
    onAuthStateChanged(fb.auth, async (user) => {
      stopHome();
      if (!user) {
        state.clearingDrafts = true;
        await clearDrafts();
        set({ user: null, cid: null, role: null, email: null, home: null, homeLoaded: false, status: "signedOut", suspended: false, archived: false, archiveUntil: null, archiveClosedAt: null });
      } else {
        set({ status: "signingIn", user });
        let claims = null;
        try { claims = (await user.getIdTokenResult()).claims; } catch (e) { claims = null; }
        // Only client principals belong here (never an admin/Google session).
        if (!claims || claims.role !== "client" || !claims.cid) {
          await signOut(fb.auth).catch(() => {});
          set({ gateMessage: "For your security, please sign in again." });
        } else {
          set({ cid: claims.cid, role: null, sessionExpiresAt: Number(claims.sx)*1000 });
          watchHome(claims.cid);
          // owner|member lives on the user's own clientUsers doc (readable by them), not in the token.
          getDoc(doc(fb.db, "clientUsers", user.uid)).then((d) => { if (d.exists() && state.user?.uid === user.uid) set({ role: d.data().role || null, email: d.data().email || null }); }).catch(() => {});
        }
      }
      if (first) { first = false; resolve(); }
    });
  });
}

function stopHome() { if (unsubHome) { unsubHome(); unsubHome = null; } }

function watchHome(cid) {
  unsubHome = onSnapshot(doc(fb.db, "clients", cid, "clientView", "home"),
    (snap) => {
      const home = snap.exists() ? snap.data() : null;
      const mode = home?.access?.mode;
      let status = "active";
      if (mode === "readonly") status = "readonly";
      else if (mode === "locked") status = "locked";
      set({ home, homeLoaded: true, status, archived: false, suspended: false });
    },
    async (err) => {
      if (err && err.code === "permission-denied") await onHomeDenied();
      else set({ homeLoaded: true, home: null, status: state.status === "signingIn" ? "active" : state.status, homeError: true });
    });
}

// Rules deny the home projection when the session is dead OR the portal is locked/disabled.
// sessionTouch tells them apart: if the session itself is dead we sign out; otherwise show locked/disabled.
// Function error codes distinguish a closed/disabled portal from an ended session.
async function onHomeDenied() {
  try {
    const touch = await api.sessionTouch();
    if (touch && touch.accessState === "archived") {
      set({
        home: null, homeLoaded: true, status: "locked", suspended: false, archived: true,
        archiveUntil: touch.readOnlyUntil || null, archiveClosedAt: touch.closedAt || null,
      });
    } else set({ home: null, homeLoaded: true, status: "locked", archived: false });
  } catch (e) {
    const code = api.errCode(e), msg = String(e?.message || "");
    if (/portal_suspended/.test(msg)) set({ home: null, homeLoaded: true, status: "disabled", suspended: true, archived: false });
    else if (/portal_archived/.test(msg)) set({ home: null, homeLoaded: true, status: "locked", suspended: false, archived: true });
    else if (/portal_disabled/.test(msg)) set({ home: null, homeLoaded: true, status: "disabled", suspended: false, archived: false });
    else if (/portal_locked/.test(msg)) set({ home: null, homeLoaded: true, status: "locked", archived: false, suspended: false });
    else {
      stopHome();
      await signOut(fb.auth).catch(() => {});
      set({ gateMessage: "For your security, please sign in again." });
    }
  }
}

/** Password sign-in on a side Auth app, then the portal custom token. The password never touches this session until then. */
export async function signInWithPassword(email, password, keepSignedIn) {
  const bridge = passwordBridge();
  await signInWithEmailAndPassword(bridge.auth, email, password);
  try {
    const res = await httpsCallable(bridge.fns, "passwordSignIn")({ keepSignedIn: !!keepSignedIn });
    await signOut(bridge.auth).catch(() => {});
    await signInWith(res.data.customToken, keepSignedIn);
  } catch (e) {
    await signOut(bridge.auth).catch(() => {});
    throw e;
  }
}

/** Google or Apple on the side Auth app. Never the client session. */
async function connectOAuthBridge(kind) {
  const bridge = passwordBridge();
  // No await before the popup below: it has to open inside the click or the browser blocks it.
  const apple = kind === "apple";
  const mode = isLocalDev() ? window[apple ? "__cwAppleMode" : "__cwGoogleMode"] : "";
  if (mode === "cancel") {
    const err = new Error("popup closed");
    err.code = "auth/popup-closed-by-user";
    throw err;
  }
  if (mode === "blocked") {
    const err = new Error("popup blocked");
    err.code = "auth/popup-blocked";
    throw err;
  }
  const devEmail = isLocalDev() ? window[apple ? "__cwAppleEmail" : "__cwGoogleEmail"] : "";
  if (devEmail) {
    await signOut(bridge.auth).catch(() => {});
    const email = String(devEmail).trim().toLowerCase();
    const payload = JSON.stringify({
      sub: (apple ? "test-apple-" : "test-") + email.replace(/\W/g, "-"),
      email,
      email_verified: true,
    });
    const cred = apple
      ? new OAuthProvider("apple.com").credential({ idToken: payload })
      : GoogleAuthProvider.credential(payload);
    await signInWithCredential(bridge.auth, cred);
    return bridge;
  }
  if (apple) {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    await signInWithPopup(bridge.auth, provider);
    return bridge;
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(bridge.auth, provider);
  return bridge;
}

/** "cancel" or "blocked" when the Google or Apple window never finished. */
export function googleWindowError(e) {
  const code = String(e?.code || "");
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "cancel";
  if (code === "auth/popup-blocked") return "blocked";
  return "";
}

async function callBridge(kind, name, payload, { signIn = false, keepSignedIn = false, failCode = "sign_in_failed" } = {}) {
  const bridge = await connectOAuthBridge(kind);
  try {
    const res = await httpsCallable(bridge.fns, name)(payload);
    await signOut(bridge.auth).catch(() => {});
    const data = res.data || {};
    if (data.ok === false || !data.customToken) {
      const err = new Error(data.code || failCode);
      err.code = data.code || failCode;
      err.details = data;
      throw err;
    }
    if (signIn) await signInWith(data.customToken, keepSignedIn);
    return data;
  } catch (e) {
    await signOut(bridge.auth).catch(() => {});
    throw e;
  }
}

/** After the invite email is proved. Returns the custom token. Does not sign the client in.
 *  The invite screen signs in, so it can flag the bind before that session emit. */
export function bindInviteGoogle(args) {
  return callBridge("google", "inviteBindGoogle", {
    proof: args.proof, agree: args.agree, label: args.label, keepSignedIn: !!args.keepSignedIn,
  });
}

/** Same bind as Google. A private relay is accepted when the invite proof is still live. */
export function bindInviteApple(args) {
  return callBridge("apple", "inviteBindApple", {
    proof: args.proof, agree: args.agree, label: args.label, keepSignedIn: !!args.keepSignedIn,
  });
}

/** Return visit. Refuses when this Google email was never bound. Creates nothing. */
export function signInWithGoogleReturn(keepSignedIn) {
  return callBridge("google", "googleSignIn", { keepSignedIn: !!keepSignedIn }, {
    signIn: true, keepSignedIn, failCode: "ask_parker",
  });
}

/** Return visit. Refuses when this Apple id was never bound. Creates nothing. */
export function signInWithAppleReturn(keepSignedIn) {
  return callBridge("apple", "appleSignIn", { keepSignedIn: !!keepSignedIn }, {
    signIn: true, keepSignedIn, failCode: "ask_parker",
  });
}

/** Sign in with a custom token. Persistence MUST be chosen before the token is used. */
export async function signInWith(customToken, keepSignedIn) {
  state.clearingDrafts = false;
  set({ gateMessage: null });
  await setPersistence(fb.auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence);
  await signInWithCustomToken(fb.auth, customToken);
}

export async function signOutHere() {
  state.clearingDrafts = true;
  stopHome();
  await clearDrafts();
  await signOut(fb.auth).catch(() => {});
}
export async function signOutAll() {
  await withFresh(() => api.signOutEverywhere());
  await signOutHere();
}

export function clearGateMessage() { state.gateMessage = null; }

// ---------- re-verify (fresh code) ----------
/** Run fn; if the server wants a fresh code, ask for one, then retry once. */
export async function withFresh(fn) {
  try { return await fn(); }
  catch (e) {
    if (!api.needsFreshCode(e)) throw e;
    const ok = await openReverify();
    if (!ok) { const err = new Error("cancelled"); err.code = "cancelled"; throw err; }
    return await fn();
  }
}

function openReverify() {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;inset:0;z-index:70;background:rgba(21,32,48,.6);display:grid;align-items:end;justify-items:center";
    const box = document.createElement("div");
    box.className = "sheet";
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "rv-h");
    box.style.cssText = "background:var(--paper);color:var(--ink);border-radius:24px 24px 0 0;padding:24px 20px 32px;max-width:520px;width:100%;display:grid;gap:16px";
    wrap.appendChild(box); document.body.appendChild(wrap);
    const previousMain = document.querySelector('#app');
    if (previousMain) previousMain.inert = true;
    const done = (v) => { document.querySelector(".devhelp")?.remove(); wrap.remove(); if (previousMain) previousMain.inert = false; prev?.focus?.(); resolve(v); };
    wrap.addEventListener("keydown", (ev) => { if (ev.key === "Escape") done(false);
      if (ev.key === 'Tab') {
        const controls = [...box.querySelectorAll('button:not([disabled]),input,a[href]')];
        const first = controls[0], last = controls[controls.length-1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last?.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first?.focus(); }
      } });

    const askSend = () => {
      mount(box, html`<h2 id="rv-h">Quick check</h2>
        <p>For your security, we need a fresh code for this. We'll email a 6-digit code to the address on your account.</p>
        <div class="actions"><button type="button" class="btn primary block" data-send>${ic("mail")} Email me a code</button>
        <button type="button" class="btn quiet block" data-cancel>Cancel</button></div>`);
      box.querySelector("[data-cancel]").onclick = () => done(false);
      const b = box.querySelector("[data-send]"); b.focus();
      b.onclick = async () => {
        setBusy(b, true);
        try { await api.reverifySend(); askCode(); showDevCode(state.user?.email || state.email || ""); }
        catch (e) { setBusy(b, false); showErrors(box, [{ msg: api.friendlyError(e) }]); }
      };
    };
    const askCode = () => {
      mount(box, html`<h2 id="rv-h">Quick check</h2>
        <form class="stack" novalidate>
          <div class="field"><label for="rv-code">6-digit code</label>
          <input id="rv-code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-describedby="rv-hint">
          <span class="hint" id="rv-hint">Check your email. The code works for 10 minutes.</span></div>
          <button class="btn primary block" type="submit">Continue</button>
          <button type="button" class="btn quiet block" data-cancel>Cancel</button>
        </form>`);
      const input = box.querySelector("#rv-code"); input.focus();
      box.querySelector("[data-cancel]").onclick = () => done(false);
      box.querySelector("form").onsubmit = async (ev) => {
        ev.preventDefault();
        const code = input.value.replace(/\D/g, "");
        if (code.length !== 6) { showErrors(box, [{ id: "rv-code", msg: "Enter the 6-digit code from your email." }]); return; }
        const b = box.querySelector("button[type=submit]"); setBusy(b, true);
        try { await api.reverifyCheck(code); done(true); }
        catch (e) { setBusy(b, false); showErrors(box, [{ id: "rv-code", msg: api.friendlyError(e) }]); }
      };
    };
    askSend();
  });
}
