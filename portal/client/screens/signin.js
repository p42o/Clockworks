// #/signin — password is the primary path. Email codes stay behind SWAP.emailSignInCodes.
import { html, raw, mount, ic, setBusy, showErrors } from "../lib/ui.js";
import * as api from "../lib/api.js";
import { SWAP } from "../swap-config.js";
import { appleSignInAllowed, appleSignInContext } from "../lib/appleSignInGate.js";
import { signInWith, signInWithPassword, signInWithGoogleReturn, signInWithAppleReturn, googleWindowError, state, clearGateMessage } from "../lib/session.js";
import { showDevCode } from "../lib/dev.js";
import { renderCodeForm } from "./_codeform.js";

// /portal/ is the one sign-in page. Hand off there, carrying the gate message and the remembered target.
// ?signin keeps this screen for the local UI suites that still drive it directly.
export async function render(ctx) {
  if (!new URLSearchParams(location.search).has("signin")) {
    const target = ctx.router.takeRememberedTarget();
    try {
      if (state.gateMessage) sessionStorage.setItem("cw.door.note", state.gateMessage);
      if (target) sessionStorage.setItem("cw.door.next", target);
    } catch { /* private mode */ }
    clearGateMessage();
    mount(ctx.el, html`<h1>Sign in</h1><p>Opening the sign-in page…</p>`);
    location.replace("/portal/");
    return;
  }
  return renderHere(ctx);
}

async function renderHere(ctx) {
  const { el, router } = ctx;
  const note = state.gateMessage;
  const appleAvailable = appleSignInAllowed(appleSignInContext(location.pathname));
  let tear = null;
  mount(el, html`<h1>Sign in</h1>
    ${note ? html`<div class="banner info" role="status">${ic("info")}<div>${note}</div></div>` : ""}
    <form class="stack" novalidate>
      <div class="field"><label for="email">Email</label>
        <input id="email" type="email" autocomplete="username" inputmode="email"></div>
      <div class="field"><label for="password">Password</label>
        <input id="password" type="password" autocomplete="current-password"></div>
      <button class="btn primary block" type="submit">Sign in</button>
    </form>
    <div class="method-choice">
      <button type="button" class="btn oauth-pill oauth-google" data-google><svg class="oauth-mark" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Continue with Google</span></button>
      <button type="button" class="btn oauth-pill oauth-apple" data-apple ${raw(appleAvailable ? "" : 'disabled aria-disabled="true"')}><svg class="oauth-mark" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg><span>${appleAvailable ? "Continue with Apple" : "Apple · Coming soon"}</span></button>
    </div>
    <p class="small muted">${appleAvailable ? "Use Google, Apple, or the password Parker set up for you." : "Use Google or the password Parker set up for you."}</p>
    <p><a href="#/reset">Forgot your password?</a></p>
    <p class="small">First time here? Open the link Parker sent you, or <a href="#/invite">enter your code</a>. Links work once and expire after ${SWAP.inviteExpiryDays} days.</p>
    <p><a class="btn primary" href="mailto:${SWAP.contact.privacyEmail}">Ask Parker for a fresh link</a></p>
    <p class="help-line">Need a hand? Call <a href="tel:+17632969777">(763) 296-9777</a>.</p>
    <p><a href="#/privacy-request">Privacy request</a></p>
    ${SWAP.emailSignInCodes ? html`<form class="stack" data-code novalidate>
      <p>Or ask for a 6-digit code instead.</p>
      <button class="btn block" type="submit">Email me a code</button>
    </form>` : ""}`);
  clearGateMessage();
  const form = el.querySelector("form");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = form.querySelector("#email").value.trim().toLowerCase();
    const password = form.querySelector("#password").value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password) {
      showErrors(form, [{ msg: "Enter the email and password for this portal." }]);
      return;
    }
    const b = form.querySelector("button[type=submit]");
    setBusy(b, true);
    try {
      await signInWithPassword(email, password, false);
      router.go(router.takeRememberedTarget() || "#/home");
    } catch (e) {
      setBusy(b, false);
      showErrors(form, [{ msg: api.friendlyError(e) }]);
    }
  });
  function wireReturn(kind) {
    const apple = kind === "apple";
    const sel = apple ? "[data-apple]" : "[data-google]";
    const label = apple ? "Apple" : "Google";
    el.querySelector(sel)?.addEventListener("click", async () => {
      const btn = el.querySelector(sel);
      setBusy(btn, true);
      try {
        const run = apple ? signInWithAppleReturn : signInWithGoogleReturn;
        await api.withTimeout(run(false));
        router.go(router.takeRememberedTarget() || "#/home");
      } catch (e) {
        setBusy(btn, false);
        const win = googleWindowError(e);
        const msg = win === "cancel"
          ? `${label} was cancelled. Use your password, or try ${label} again.`
          : win === "blocked"
            ? `The ${label} window was blocked. Allow pop-ups, or use your password.`
            : e?.code === "use_password"
              ? `That ${label} account isn't how you sign in. Use your password, or ask Parker.`
              : api.friendlyError(e);
        showErrors(form, [{ msg }]);
      }
    });
  }
  wireReturn("google");
  wireReturn("apple");
  const codeForm = el.querySelector("[data-code]");
  if (codeForm) {
    codeForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const email = form.querySelector("#email").value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showErrors(form, [{ id: "email", msg: "Enter your email address." }]); return; }
      try { await api.signinStart(email); } catch (e) { showErrors(form, [{ msg: api.friendlyError(e) }]); return; }
      showDevCode(email);
      tear = renderCodeForm(el, {
        title: "Check your email",
        lead: "If that email has a portal account, we just sent it a code.",
        onSubmit: async (code, keep) => {
          const r = await api.signinVerify(email, code, keep);
          await signInWith(r.customToken, keep);
          document.querySelector(".devhelp")?.remove();
          router.go(router.takeRememberedTarget() || "#/home");
        },
        onResend: () => api.signinStart(email).then(() => showDevCode(email)),
      });
    });
  }
  return () => { tear?.(); document.querySelector(".devhelp")?.remove(); };
}
