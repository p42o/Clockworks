// #/reset — password reset. The code is written to the local outbox only. Nothing is sent.
import { html, mount, setBusy, showErrors } from "../lib/ui.js";
import * as api from "../lib/api.js";
import { showDevCode } from "../lib/dev.js";
import { PASSWORD_HINT } from "../lib/clientCopy.js";
import { SWAP } from "../swap-config.js";

export async function render(ctx) {
  const { el, router } = ctx;
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
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showErrors(el, [{ id: "reset-email", msg: "Enter your email address." }]); return; }
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
