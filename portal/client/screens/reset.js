// #/reset — password reset. SWAP.passwordReset "firebase": Firebase Auth emails a reset link (the same message
// whether or not the address has an account). "outbox": the older 6-digit code flow, written to the outbox only.
import { html, mount, ic, setBusy, showErrors } from "../lib/ui.js";
import * as api from "../lib/api.js";
import { fb } from "../lib/env.js";
import { showDevCode } from "../lib/dev.js";
import { PASSWORD_HINT } from "../lib/clientCopy.js";
import { SWAP } from "../swap-config.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function render(ctx) {
  return SWAP.passwordReset === "firebase" ? viaFirebase(ctx) : viaOutbox(ctx);
}

function viaFirebase({ el }) {
  function ask(prefill = "") {
    mount(el, html`<span class="eyebrow rule">Account</span>
      <h1>Reset your password</h1>
      <p>Enter the email you use for this portal. We'll email you a link to choose a new password.</p>
      <form class="stack" novalidate>
        <div class="field"><label for="reset-email">Email</label>
          <input id="reset-email" type="email" autocomplete="username" inputmode="email" value="${prefill}"></div>
        <button class="btn primary block" type="submit">Email me a reset link</button>
      </form>
      <p><a href="#/signin">Back to sign in</a></p>`);
    el.querySelector("form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const email = el.querySelector("#reset-email").value.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) { showErrors(el, [{ id: "reset-email", msg: "Enter your email address." }]); return; }
      const b = ev.currentTarget.querySelector("button");
      setBusy(b, true);
      try {
        // continueUrl brings them back to sign-in after the reset page.
        await sendPasswordResetEmail(fb.auth, email, { url: `${location.origin}${location.pathname}#/signin` });
        sent(email);
      } catch (e) {
        const code = String(e?.code || "");
        // Never reveal whether an account exists: unknown emails get the same "check your email" screen.
        if (code === "auth/user-not-found" || code === "auth/invalid-email") return sent(email);
        setBusy(b, false);
        showErrors(el, [{ msg: code === "auth/too-many-requests" ? "That's a lot of tries. Please wait a few minutes and try again." : "We couldn't send that just now. Check your connection and try again." }]);
      }
    });
  }
  function sent(email) {
    mount(el, html`<span class="eyebrow rule">Check your inbox</span>
      <h1>Check your <em>email</em></h1>
      <p>If <b>${email}</b> has an account on this portal, a reset link is on its way. It works for one hour.</p>
      <div class="banner info">${ic("mail")}<div><b>Don't see it?</b>Check spam or junk. The email comes from noreply@clockworks-portal-pgs.firebaseapp.com.</div></div>
      <div class="actions"><a class="btn primary block" href="#/signin">Back to sign in</a>
        <button class="btn quiet" type="button" data-again>Send another link</button></div>
      <p class="small muted">Still stuck? <a href="mailto:${SWAP.contact.privacyEmail}">Email Parker</a>.</p>`);
    el.querySelector("[data-again]").addEventListener("click", () => ask(email));
  }
  ask();
}

function viaOutbox({ el, router }) {
  let email = "";
  function ask() {
    mount(el, html`<h1>Reset your password</h1>
      <p>We'll put a 6-digit code in the local outbox for the email on the account. Nothing is sent.</p>
      <form class="stack" novalidate>
        <div class="field"><label for="reset-email">Email</label>
          <input id="reset-email" type="email" autocomplete="username"></div>
        <button class="btn primary" type="submit">Email me a reset code</button>
      </form>
      <p><a href="#/signin">Back to sign in</a></p>`);
    el.querySelector("form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      email = el.querySelector("#reset-email").value.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) { showErrors(el, [{ id: "reset-email", msg: "Enter your email address." }]); return; }
      const b = ev.currentTarget.querySelector("button");
      setBusy(b, true);
      try { await api.passwordResetStart(email); showDevCode(email); code(); }
      catch (e) { setBusy(b, false); showErrors(el, [{ msg: api.friendlyError(e) }]); }
    });
  }
  function code() {
    mount(el, html`<h1>Choose a new password</h1>
      <p>If that email has a password on this portal, the code is in the local outbox. It works for 10 minutes.</p>
      <form class="stack" novalidate>
        <div class="field"><label for="reset-code">6-digit code</label>
          <input id="reset-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div>
        <div class="field"><label for="reset-password">New password</label>
          <input id="reset-password" type="password" autocomplete="new-password" aria-describedby="reset-hint">
          <span class="hint" id="reset-hint">${PASSWORD_HINT}</span></div>
        <button class="btn primary" type="submit">Save password</button>
      </form>
      <p class="small">Questions? <a href="mailto:${SWAP.contact.privacyEmail}">${SWAP.contact.privacyEmail}</a></p>`);
    el.querySelector("form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const codeVal = el.querySelector("#reset-code").value.replace(/\D/g, "");
      const password = el.querySelector("#reset-password").value;
      if (codeVal.length !== 6) { showErrors(el, [{ id: "reset-code", msg: "Enter the 6-digit code." }]); return; }
      const b = ev.currentTarget.querySelector("button");
      setBusy(b, true);
      try {
        await api.passwordResetFinish({ email, code: codeVal, password });
        router.go("#/signin");
      } catch (e) { setBusy(b, false); showErrors(el, [{ msg: api.friendlyError(e) }]); }
    });
  }
  ask();
  return () => document.querySelector(".devhelp")?.remove();
}
