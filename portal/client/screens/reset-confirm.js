// #/reset-confirm — the page a Firebase password-reset email links to. The oobCode was lifted out of the URL by
// index.html and is held in memory only. Enforces the portal password rules before Firebase saves the password.
import { html, mount, ic, icon, setBusy, showErrors, skeleton } from "../lib/ui.js";
import { fb } from "../lib/env.js";
import { PASSWORD_HINT, passwordProblem } from "../lib/clientCopy.js";
import { SWAP } from "../swap-config.js";
import { verifyPasswordResetCode, confirmPasswordReset } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const mask = (e) => { const [l, d] = String(e).split("@"); return d ? `${l.slice(0, 1)}${"*".repeat(Math.max(2, l.length - 1))}@${d}` : e; };

export async function render({ el, router }) {
  const code = router.takeResetCode();
  const dead = () => mount(el, html`<span class="eyebrow rule">Password reset</span><h1>This link can't be used</h1>
    <p>Reset links work once and expire after an hour. Ask for a new one and use the newest email.</p>
    <div class="actions"><a class="btn primary block" href="#/reset">Send a new reset link</a><a class="btn" href="#/signin">Back to sign in</a></div>`);
  if (!code) return dead();
  mount(el, html`<h1>Choose a new password</h1>${skeleton(2)}`);
  let email;
  try { email = await verifyPasswordResetCode(fb.auth, code); } catch { return dead(); }

  mount(el, html`<span class="eyebrow rule">Password reset</span>
    <h1>Choose a new <em>password</em></h1>
    <p>For <b>${mask(email)}</b>.</p>
    <form class="stack" novalidate>
      <div class="field"><label for="new-password">New password</label>
        <input id="new-password" type="password" autocomplete="new-password" maxlength="200" aria-describedby="pw-hint">
        <div class="pw-meter" data-n="0" aria-hidden="true"><i></i><i></i><i></i></div>
        <span class="hint" id="pw-hint">${PASSWORD_HINT}</span></div>
      <div class="field"><label for="confirm-password">Confirm new password</label>
        <input id="confirm-password" type="password" autocomplete="new-password" maxlength="200">
        <span data-match aria-live="polite"></span></div>
      <button class="btn primary block" type="submit">Save new password</button>
    </form>`);
  const form = el.querySelector("form"), pw = el.querySelector("#new-password"), pw2 = el.querySelector("#confirm-password");
  const meter = el.querySelector(".pw-meter"), match = el.querySelector("[data-match]");
  const sync = () => {
    const v = pw.value;
    meter.dataset.n = String(!v ? 0 : passwordProblem(v, email) ? 1 : (v.length >= 16 || /[^a-z0-9]/i.test(v) ? 3 : 2));
    const ok = pw2.value && v === pw2.value && !passwordProblem(v, email);
    match.className = ok ? "match-ok" : ""; match.innerHTML = ok ? `${icon("check")} Passwords match` : "";
  };
  pw.addEventListener("input", sync); pw2.addEventListener("input", sync);
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const problem = passwordProblem(pw.value, email);
    if (problem) return showErrors(form, [{ id: "new-password", msg: problem }]);
    if (pw.value !== pw2.value) return showErrors(form, [{ id: "confirm-password", msg: "Those passwords don't match." }]);
    const b = form.querySelector("button");
    setBusy(b, true);
    try {
      await confirmPasswordReset(fb.auth, code, pw.value);
      mount(el, html`<span class="eyebrow rule">All set</span><h1>Password <em>updated</em></h1>
        <p>Sign in with your new password. For your security, any other device still signed in will be signed out within the hour.</p>
        <div class="actions"><a class="btn primary block" href="#/signin">Sign in ${ic("arrow-right")}</a></div>
        <p class="small muted">Didn't do this? <a href="mailto:${SWAP.contact.privacyEmail}">Tell Parker right away</a>.</p>`);
    } catch (e) {
      setBusy(b, false);
      const c = String(e?.code || "");
      if (c === "auth/expired-action-code" || c === "auth/invalid-action-code") return dead();
      showErrors(form, [{ msg: c === "auth/weak-password" ? "Choose a stronger password." : "We couldn't save that just now. Check your connection and try again." }]);
    }
  });
}
