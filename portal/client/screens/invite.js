// #/invite — invite link or short code first, then Google, Apple, or a password.
// The long token stays in module memory. A mid-flow refresh keeps only the email proof, never the token.
// A bind flags itself before sign-in so a remount cannot paint the bad-link screen.
import { html, mount, skeleton, errorState, onRetry, ic, icon, setBusy, showErrors, fmtDateY } from "../lib/ui.js";
import * as api from "../lib/api.js";
import { signInWith, bindInviteGoogle, bindInviteApple, googleWindowError } from "../lib/session.js";
import { inviteEntryPlan, isClientSession } from "../lib/inviteEntry.js";
import { showDevCode } from "../lib/dev.js";
import { renderCodeForm } from "./_codeform.js";
import { setInviteParties } from "../lib/legal.js";
import { acceptanceLabelHtml } from "../lib/acceptanceLabel.js";
import { PASSWORD_HINT, passwordProblem } from "../lib/clientCopy.js";
import { SWAP } from "../swap-config.js";
import { appleSignInAllowed, rememberAppleSignInContext } from "../lib/appleSignInGate.js";
import { SUSPENDED_BODY, LOCAL_NOTICE_VARS, fillNotice } from "../lib/statusNotices.js";

const FLOW_KEY = "cw.invite.flow";
const WELCOME_KEY = "cw.iris.welcome";
const HELP_TEL = "+17632969777";
const HELP_SHOW = "(763) 296-9777";
const HELP = html`<p class="help-line">Need a hand? Call <a href="tel:${HELP_TEL}">${HELP_SHOW}</a>.</p>`;

let token = null;
let bindState = "idle"; // idle | pending | ok. Survives a remount of this module.

function detailsOf(e) {
  const d = e?.details;
  return d && typeof d === "object" ? d : {};
}

function reasonOf(e) {
  const reason = detailsOf(e).reason;
  if (reason) return String(reason);
  const msg = String(e?.message || "");
  const keys = [
    "invite_expired", "invite_used", "invite_cancelled", "invite_bad",
    "portal_suspended", "portal_locked", "portal_disabled", "portal_not_live",
    "proof_expired", "proof_required", "email_mismatch",
  ];
  return keys.find((k) => msg.includes(k)) || "";
}

function readFlow() {
  try {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return null;
    const flow = JSON.parse(raw);
    if (!flow?.proof || !flow.proofExpiresAt || flow.proofExpiresAt < Date.now()) {
      sessionStorage.removeItem(FLOW_KEY);
      return null;
    }
    return flow;
  } catch {
    return null;
  }
}

function saveFlow(flow) {
  try { sessionStorage.setItem(FLOW_KEY, JSON.stringify(flow)); } catch { /* private mode */ }
}

function clearFlow() {
  try { sessionStorage.removeItem(FLOW_KEY); } catch { /* private mode */ }
}

function welcomeName(contactName) {
  return String(contactName || "").trim().split(/\s+/)[0] || "";
}

export async function render(ctx) {
  const { el, router } = ctx;
  const incoming = router.takeInviteToken();
  const prefill = router.takeInviteCode() || "";
  if (incoming) {
    if (incoming !== token) bindState = "idle";
    token = incoming;
  } else if (!token && bindState === "ok" && !isClientSession(ctx.state?.status)) {
    // Later visit to #/invite after a finished bind (token already cleared, signed out).
    // Not the in-flight remount: that still holds bindState "pending" or "ok".
    bindState = "idle";
  }
  let entry = token ? { token } : (prefill ? { invite: prefill } : null);
  let info = null;
  let proof = null;
  let dead = false;
  let tearForm = null;

  const planNow = () => inviteEntryPlan({ dead, token, bindState, sessionStatus: ctx.state?.status });

  // Home or a holding shell. A real bad link, or a fresh code form, is the caller's job.
  const leaveIfBound = () => {
    const plan = planNow();
    if (plan === "home") router.go("#/home");
    else if (plan === "hold") mount(el, html`<h1>Welcome</h1>${skeleton(2)}`);
    return plan === "home" || plan === "hold" || plan === "ignore";
  };

  if (leaveIfBound()) {
    return () => { dead = true; tearForm?.(); document.querySelector(".devhelp")?.remove(); };
  }

  const focusH1 = () => {
    const h = el.querySelector("h1");
    if (!h) return;
    h.setAttribute("tabindex", "-1");
    h.focus();
  };

  function locate(extra = {}) {
    if (entry?.token) return { token: entry.token, ...extra };
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
    saveFlow({
      step: "choose",
      proof,
      proofExpiresAt: next.proofExpiresAt,
      ...info,
    });
  }

  // Flag the bind before sign-in. signInWith emits session state while the hash is still #/invite,
  // and that emit can remount this screen. The module token stays until navigation is kicked.
  async function bindAndEnter(customToken, keep) {
    bindState = "pending";
    try {
      await signInWith(customToken, keep);
    } catch (err) {
      bindState = "idle";
      throw err;
    }
    bindState = "ok";
    const name = welcomeName(info?.contactName);
    clearFlow();
    entry = null;
    proof = null;
    try { sessionStorage.setItem(WELCOME_KEY, JSON.stringify({ name })); } catch { /* private mode */ }
    document.querySelector(".devhelp")?.remove();
    router.go("#/home");
    token = null;
  }

  // Checked box passes the keep flag. Unchecked passes false. Both credential paths use this.
  async function enterCredential(r) {
    const keep = !!el.querySelector("#keep")?.checked;
    if (keep) await bindAndEnter(r.customToken, keep);
    else await bindAndEnter(r.customToken, false);
  }

  function parties() {
    setInviteParties({
      businessName: info?.businessName,
      contactName: info?.contactName,
      email: info?.maskedEmail,
    });
  }

  function cold(note = "") {
    if (leaveIfBound()) return;
    mount(el, html`
      <span class="eyebrow rule">Private · MN Clockworks</span>
      <h1>Ask Parker for an invite</h1>
      <p>This portal is invite-only. Parker sends a link or a short code. That comes first. A Google, Apple, or password sign-in does not open an account on its own.</p>
      ${note ? html`<div class="banner info" role="status">${ic("info")}<div>${note}</div></div>` : ""}
      <form class="stack" id="invite-entry" novalidate>
        <div class="field">
          <label for="invite-code">Invite code or link</label>
          <input id="invite-code" name="invite" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" inputmode="text" placeholder="XXXX-XXXX">
        </div>
        <button class="btn primary block" type="submit">Continue</button>
      </form>
      ${HELP}`);
    const form = el.querySelector("#invite-entry");
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const raw = form.querySelector("#invite-code").value;
      if (!String(raw || "").trim()) {
        showErrors(form, [{ id: "invite-code", msg: "Enter the code or paste the link Parker sent." }]);
        return;
      }
      entry = { invite: raw };
      token = null;
      await openEntry();
    });
    focusH1();
  }

  function prove() {
    parties();
    mount(el, html`
      <span class="eyebrow rule">Private invite · from Parker</span>
      <h1>Welcome.</h1>
      <p>Parker set up a private space for <b>${info.businessName || "your business"}</b>. Your intake, files, and messages live here.</p>
      <p>We'll email a 6-digit code to <b>${info.maskedEmail}</b>. Opening this page does not use up the invite. It stays open until you finish signing in, or until it expires.</p>
      ${info.displayCode ? html`<p class="big-code" aria-label="Invite code">${info.displayCode}</p>` : ""}
      <div class="actions"><button type="button" class="btn primary block" data-send>${ic("mail")} Email me the code</button></div>
      ${HELP}`);
    el.querySelector("[data-send]").addEventListener("click", async () => {
      const btn = el.querySelector("[data-send]");
      setBusy(btn, true);
      try {
        await api.withTimeout(api.inviteSendCode(locate()));
        if (dead || leaveIfBound()) return;
        codeStep();
      } catch (e) {
        if (dead || leaveIfBound()) return;
        setBusy(btn, false);
        if (!stuck(reasonOf(e), detailsOf(e), e)) showErrors(el, [{ msg: api.friendlyError(e) }]);
      }
    });
    focusH1();
  }

  function codeStep() {
    showDevCode(info.maskedEmail);
    tearForm?.();
    tearForm = renderCodeForm(el, {
      title: "Check your email",
      lead: `We sent a 6-digit code to ${info.maskedEmail}. It works for 10 minutes. You can ask for another if it is slow.`,
      showKeep: false,
      onSubmit: async (code) => {
        try {
          const next = await api.withTimeout(api.inviteVerify(locate({ code })));
          if (dead || leaveIfBound()) return;
          if (!next?.proof) {
            const err = new Error("proof_required");
            err.code = "failed-precondition";
            throw err;
          }
          rememberProof(next);
          chooser();
        } catch (e) {
          if (dead || leaveIfBound()) return;
          if (stuck(reasonOf(e), detailsOf(e), e)) return;
          throw e;
        }
      },
      onResend: () => api.withTimeout(api.inviteSendCode(locate())).then(() => showDevCode(info.maskedEmail)),
    });
    const help = document.createElement("div");
    help.innerHTML = String(HELP);
    el.append(help);
  }

  function wirePassword() {
    const pw = el.querySelector("#new-password");
    const pw2 = el.querySelector("#confirm-password");
    const meter = el.querySelector(".pw-meter");
    const match = el.querySelector("[data-match]");
    const score = (v) => !v ? 0 : v.length < 12 ? 1 : (/[a-z]/i.test(v) && /\d/.test(v)) ? (v.length >= 16 || /[^a-z0-9]/i.test(v) ? 3 : 2) : 1;
    const sync = () => {
      if (!meter || !pw) return;
      meter.dataset.n = String(score(pw.value));
      const ok = pw2.value && pw.value === pw2.value && pw.value.length >= 12;
      match.className = ok ? "match-ok" : "";
      match.innerHTML = ok ? `${icon("check")} Passwords match` : "";
    };
    pw?.addEventListener("input", sync);
    pw2?.addEventListener("input", sync);
    const box = el.querySelector("#agree");
    const google = el.querySelector("[data-google]");
    const apple = el.querySelector("[data-apple]");
    const reveal = el.querySelector("[data-password]");
    const syncAgree = () => {
      const on = !!box?.checked;
      for (const node of [google, apple]) {
        if (!node) continue;
        const enabled = on && (node !== apple || appleSignInAllowed(info));
        node.disabled = !enabled;
        node.setAttribute("aria-disabled", enabled ? "false" : "true");
      }
      if (reveal) reveal.disabled = !on;
    };
    box?.addEventListener("change", syncAgree);
    syncAgree();
    reveal?.addEventListener("click", () => {
      const block = el.querySelector("#password-form");
      if (block) block.hidden = false;
      pw?.focus();
    });
    google?.addEventListener("click", () => { bindOAuth("google"); });
    apple?.addEventListener("click", () => { bindOAuth("apple"); });
    el.querySelector("#password-form")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!box?.checked) return;
      const password = pw.value;
      const confirm = pw2.value;
      const problem = passwordProblem(password);
      if (problem) { showErrors(el.querySelector("#password-form"), [{ id: "new-password", msg: problem }]); return; }
      if (password !== confirm) { showErrors(el.querySelector("#password-form"), [{ id: "confirm-password", msg: "Those passwords don't match." }]); return; }
      const go = el.querySelector("#password-form button[type=submit]");
      setBusy(go, true);
      const keep = !!el.querySelector("#keep")?.checked;
      try {
        const r = await api.withTimeout(api.inviteSetPassword({
          proof,
          password,
          agree: true,
          label: SWAP.acceptance.label,
          keepSignedIn: keep,
        }));
        await enterCredential(r);
      } catch (e) {
        if (dead || leaveIfBound()) return;
        setBusy(go, false);
        if (reasonOf(e) === "proof_expired" || reasonOf(e) === "proof_required") {
          clearFlow();
          proof = null;
          cold("That step timed out. Enter your invite code again. The invite itself is still good until it expires.");
          return;
        }
        if (!stuck(reasonOf(e), detailsOf(e), e)) showErrors(el.querySelector("#password-form"), [{ msg: api.friendlyError(e) }]);
      }
    });
  }

  async function bindOAuth(kind) {
    const box = el.querySelector("#agree");
    if (!box?.checked || !proof) return;
    const apple = kind === "apple";
    const btn = el.querySelector(apple ? "[data-apple]" : "[data-google]");
    setBusy(btn, true);
    const keep = !!el.querySelector("#keep")?.checked;
    const label = apple ? "Apple" : "Google";
    try {
      const run = apple ? bindInviteApple : bindInviteGoogle;
      const r = await api.withTimeout(run({
        proof, agree: true, label: SWAP.acceptance.label, keepSignedIn: keep,
      }));
      await enterCredential(r);
    } catch (e) {
      if (dead || leaveIfBound()) return;
      setBusy(btn, false);
      const win = googleWindowError(e);
      if (win) {
        api.inviteNote({ proof, reason: win === "blocked" ? "popup_blocked" : "oauth_cancel" }).catch(() => {});
        const block = el.querySelector("#password-block");
        if (block) block.hidden = false;
        const msg = win === "blocked"
          ? `The ${label} window was blocked. Allow pop-ups and try again, or set a password below.`
          : `${label} was cancelled. Try again, or set a password below.`;
        chooser(msg, { showPassword: true, agreed: true });
        return;
      }
      const d = detailsOf(e);
      if (e.code === "apple_email_missing" || d.code === "apple_email_missing") {
        chooser("Apple didn't share an email address. Share the address on this invite, or set a password below.", { showPassword: true, agreed: true });
        return;
      }
      if (e.code === "email_mismatch" || d.code === "email_mismatch" || reasonOf(e) === "email_mismatch") {
        const shown = apple ? (d.appleMasked || "another address") : (d.googleMasked || "another address");
        const inviteMasked = d.inviteMasked || info?.maskedEmail || "this invite";
        chooser(`That ${label} account is ${shown}; this invite is for ${inviteMasked}. Switch accounts, or set a password below.`, { showPassword: true, agreed: true });
        return;
      }
      if (reasonOf(e) === "proof_expired" || reasonOf(e) === "proof_required") {
        clearFlow();
        proof = null;
        cold("That step timed out. Enter your invite code again. The invite itself is still good until it expires.");
        return;
      }
      const block = el.querySelector("#password-form");
      if (block) block.hidden = false;
      showErrors(el, [{ msg: api.friendlyError(e) }]);
    }
  }

  function chooser(note = "", { showPassword = false, agreed = false } = {}) {
    if (leaveIfBound()) return;
    tearForm?.();
    tearForm = null;
    document.querySelector(".devhelp")?.remove();
    parties();
    mount(el, html`
      <span class="eyebrow rule">Choose how to sign in</span>
      <h1>How do you want to sign in?</h1>
      <p>${appleSignInAllowed(info) ? "Google, Apple, and a password are the same choice" : "Google and a password are your choices"} for <b>${info?.maskedEmail || "your email"}</b>. ${appleSignInAllowed(info) ? "Any one" : "Either"} finishes this invite.</p>
      ${note ? html`<div class="banner info" id="invite-note" role="status">${ic("info")}<div>${note}</div></div>` : ""}
      <div class="check">
        <input class="agree-box" id="agree" type="checkbox" aria-labelledby="agree-label">
        ${acceptanceLabelHtml()}
      </div>
      <label class="check"><input type="checkbox" id="keep">
        <span><b>Keep me signed in on this device</b><span class="hint" style="display:block">Leave this off on a shared or public computer.</span></span></label>
      <div class="method-choice">
        <button type="button" class="btn oauth-pill oauth-google" data-google disabled aria-disabled="true"><svg class="oauth-mark" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Continue with Google</span></button>
        <button type="button" class="btn oauth-pill oauth-apple" data-apple disabled aria-disabled="true"><svg class="oauth-mark" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg><span>${appleSignInAllowed(info) ? "Continue with Apple" : "Apple · Coming soon"}</span></button>
        <button type="button" class="btn block" data-password disabled>Email and password</button>
      </div>
      <form class="stack card" id="password-form" novalidate hidden>
        <div class="field"><label for="new-password">Password</label>
          <input id="new-password" type="password" autocomplete="new-password" minlength="12" maxlength="200" aria-describedby="pw-hint">
          <div class="pw-meter" data-n="0" aria-hidden="true"><i></i><i></i><i></i></div>
          <span class="hint" id="pw-hint">${PASSWORD_HINT}</span></div>
        <div class="field"><label for="confirm-password">Confirm password</label>
          <input id="confirm-password" type="password" autocomplete="new-password" maxlength="200">
          <span data-match aria-live="polite"></span></div>
        <button class="btn primary block" type="submit">Continue</button>
      </form>
      ${HELP}`);
    const block = el.querySelector("#password-form");
    if (block) block.hidden = !showPassword;
    const agree = el.querySelector("#agree");
    if (agree && agreed) agree.checked = true;
    wirePassword();
    focusH1();
  }

  function askRefresh() {
    return async () => {
      const btn = el.querySelector("[data-refresh]");
      setBusy(btn, true);
      try {
        const r = await api.withTimeout(api.inviteAskRefresh(locate()));
        const line = el.querySelector("[data-refresh-note]");
        if (line) line.textContent = r?.already ? "Parker already has that note." : "Parker has the note. He'll send a new invite if it's time.";
        if (btn) btn.disabled = true;
      } catch (e) {
        setBusy(btn, false);
        showErrors(el, [{ msg: api.friendlyError(e) }]);
      }
    };
  }

  function expired(extra) {
    const when = extra?.expiresAt ? fmtDateY(extra.expiresAt) : "";
    mount(el, html`
      <h1>This invite expired</h1>
      <p>This link has expired.</p>
      <p>${when ? `It expired on ${when}.` : "The date on it has passed."} Ask Parker for a new one. Nothing new is created from here.</p>
      <button type="button" class="btn primary" data-refresh>Tell Parker</button>
      <p data-refresh-note role="status"></p>
      ${HELP}`);
    el.querySelector("[data-refresh]")?.addEventListener("click", askRefresh());
    focusH1();
  }

  function used(extra) {
    const method = extra?.boundMethod === "google" ? "Google" : extra?.boundMethod === "apple" ? "Apple" : extra?.boundMethod === "password" ? "the password you set" : "the method you already set up";
    mount(el, html`
      <h1>This invite was already used</h1>
      <p>Already used. Sign in with ${method}. You do not need this code again.</p>
      <p><a class="btn primary" href="#/signin">Sign in</a></p>
      ${HELP}`);
    focusH1();
  }

  function cancelled() {
    mount(el, html`
      <h1>This invite was turned off</h1>
      <p>This link was cancelled. A newer link replaces it.</p>
      <p>Ask Parker for the new code. This one will not open an account.</p>
      <button type="button" class="btn primary" data-refresh>Tell Parker</button>
      <p data-refresh-note role="status"></p>
      ${HELP}`);
    el.querySelector("[data-refresh]")?.addEventListener("click", askRefresh());
    focusH1();
  }

  function portalStopped(e) {
    const msg = String(e?.message || "");
    if (/portal_suspended/.test(msg)) {
      const body = fillNotice(SUSPENDED_BODY, LOCAL_NOTICE_VARS);
      mount(el, html`<h1>Your account is SUSPENDED</h1>${body.split("\n\n").map((p) => html`<p>${p}</p>`)}${HELP}`);
      return;
    }
    const locked = /portal_locked/.test(msg);
    mount(el, html`<h1>${locked ? "This portal is closed" : /portal_disabled/.test(msg) ? "This portal isn't turned on" : "The client portal isn't open yet"}</h1><p>${locked ? "Our work together wrapped up more than 90 days ago. Parker can still send copies of your signed terms and receipts." : "Ask Parker about the next step for your business."}</p>${HELP}`);
  }

  /** Returns true when the screen was replaced. */
  function stuck(reason, extra, err) {
    if (leaveIfBound()) return true;
    if (reason === "invite_expired") { expired(extra); return true; }
    if (reason === "invite_used") { used(extra); return true; }
    if (reason === "invite_cancelled") { cancelled(); return true; }
    if (reason === "portal_suspended" || reason === "portal_locked" || reason === "portal_disabled" || reason === "portal_not_live") {
      portalStopped(err);
      return true;
    }
    if (api.errCode(err) === "resource-exhausted") {
      mount(el, html`<h1>Please wait a few minutes</h1><p>That's a lot of tries. Give it a few minutes, then try the code again.</p>${HELP}`);
      focusH1();
      return true;
    }
    return false;
  }

  function slow(retry) {
    mount(el, html`<h1>Still connecting</h1><p>That took too long. Your place in line is still here. Try again.</p>${errorState()}${HELP}`);
    onRetry(el, retry);
    focusH1();
  }

  async function openEntry() {
    if (leaveIfBound()) return;
    mount(el, html`<h1>Welcome</h1>${skeleton(2)}`);
    if (!entry?.token && !entry?.invite) { cold(); return; }
    try {
      const opened = await api.withTimeout(api.inviteOpen(locate()));
      if (dead || leaveIfBound()) return;
      if (!opened || opened.ok === false) { cold("That code didn't match. Check it and try again."); return; }
      info = opened;
      rememberAppleSignInContext(opened);
      if (entry?.token && opened.proof) {
        rememberProof(opened);
        chooser();
        return;
      }
      prove();
    } catch (e) {
      if (dead || leaveIfBound()) return;
      const code = api.errCode(e);
      if (["unavailable", "deadline-exceeded", "internal"].includes(code)) { slow(openEntry); return; }
      const reason = reasonOf(e);
      if (reason === "invite_bad") {
        cold("That code didn't match. Check it and try again.");
        const input = el.querySelector("#invite-code");
        if (input && entry?.invite && !String(entry.invite).includes("t=")) input.value = entry.invite;
        input?.focus();
        return;
      }
      if (!stuck(reason, detailsOf(e), e)) cold("That didn't open. Check the code, or ask Parker.");
    }
  }

  // Back from an agreement has no new link. A saved proof restores the chooser.
  const saved = !incoming && !prefill ? readFlow() : null;
  if (saved) {
    proof = saved.proof;
    info = saved;
    chooser();
  } else if (!entry) {
    cold();
  } else {
    await openEntry();
  }

  return () => { dead = true; tearForm?.(); document.querySelector(".devhelp")?.remove(); };
}
