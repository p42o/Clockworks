// #/signin — password is the primary path. Email codes stay behind SWAP.emailSignInCodes.
import { html, mount, ic, setBusy, showErrors } from "../lib/ui.js";
import * as api from "../lib/api.js";
import { SWAP } from "../swap-config.js";
import { signInWith, signInWithPassword, state, clearGateMessage } from "../lib/session.js";
import { showDevCode } from "../lib/dev.js";
import { renderCodeForm } from "./_codeform.js";

export async function render(ctx) {
  const { el, router } = ctx;
  const note = state.gateMessage;
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
    <p><a href="#/reset">Forgot your password?</a></p>
    <p class="small">First time here? Open the link Parker sent you. Links work once and expire after ${SWAP.inviteExpiryDays} days.</p>
    <p><a class="btn primary" href="mailto:${SWAP.contact.privacyEmail}">Ask Parker for a fresh link</a></p>
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
