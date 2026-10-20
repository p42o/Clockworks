// #/invite — set a password and agree, or use an email code. Token stays in module memory.
import { html, mount, skeleton, errorState, onRetry, ic, icon, setBusy, showErrors } from "../lib/ui.js";
import * as api from "../lib/api.js";
import { signInWith } from "../lib/session.js";
import { showDevCode } from "../lib/dev.js";
import { renderCodeForm } from "./_codeform.js";
import { setInviteParties } from "../lib/legal.js";
import { acceptanceLabelHtml } from "../lib/acceptanceLabel.js";
import { PASSWORD_HINT } from "../lib/clientCopy.js";
import { SWAP } from "../swap-config.js";
import { SUSPENDED_BODY, LOCAL_NOTICE_VARS, fillNotice } from "../lib/statusNotices.js";

const BAD_LINK = "This link can't be used. It may have expired or already been used. Ask Parker for a new one.";
const STATE_COPY = {
  invite_expired: "This link has expired.",
  invite_used: "This link has already been used.",
  invite_cancelled: "This link was cancelled. A newer link replaces it.",
};

let token = null;

function reasonOf(e) {
  const msg = String(e?.message || "");
  if (/invite_expired/.test(msg)) return "invite_expired";
  if (/invite_used/.test(msg)) return "invite_used";
  if (/invite_cancelled/.test(msg)) return "invite_cancelled";
  return "";
}

export async function render(ctx) {
  const { el, router } = ctx;
  token = router.takeInviteToken() || token;
  let tearForm = null;
  let dead = false;

  const badLink = (reason) => mount(el, html`<h1>This link can't be used</h1><p>${BAD_LINK}</p>${STATE_COPY[reason] ? html`<p>${STATE_COPY[reason]}</p>` : ""}<a class="btn primary" href="mailto:${SWAP.contact.privacyEmail}">Ask Parker for a fresh link</a>`);

  async function load() {
    mount(el, html`<h1>Welcome</h1>${skeleton(2)}`);
    if (!token) return badLink();
    try {
      const info = await api.inviteOpen(token);
      if (dead) return;
      if (!info || info.ok === false) return badLink();
      welcome(info);
    } catch (e) {
      if (dead) return;
      const c = api.errCode(e);
      if (["unavailable", "deadline-exceeded"].includes(c)) { mount(el, html`<h1>Welcome</h1>${errorState()}`); onRetry(el, load); }
      else if (/portal_suspended/.test(String(e?.message))) {
        const body = fillNotice(SUSPENDED_BODY, LOCAL_NOTICE_VARS);
        mount(el, html`<h1>Your account is SUSPENDED</h1>${body.split("\n\n").map((p) => html`<p>${p}</p>`)}<a class="btn primary" href="mailto:${SWAP.contact.privacyEmail}">Email Parker</a>`);
      }
      else if (/portal_disabled|portal_locked|portal_not_live/.test(String(e?.message))) {
        const locked = /portal_locked/.test(String(e.message));
        mount(el, html`<h1>${locked ? "This portal is closed" : /portal_disabled/.test(String(e.message)) ? "This portal isn't turned on" : "The client portal isn't open yet"}</h1><p>${locked ? "Our work together wrapped up more than 90 days ago. Parker can still send copies of your signed terms and receipts." : "Ask Parker about the next step for your business."}</p><a class="btn primary" href="mailto:${SWAP.contact.privacyEmail}">Email Parker</a>`);
      } else if (c === "resource-exhausted") mount(el, html`<h1>Please wait a few minutes</h1><p>That's a lot of tries. Give it a few minutes, then open your link again.</p><a class="btn" href="mailto:${SWAP.contact.privacyEmail}">Email Parker</a>`);
      else badLink(reasonOf(e));
    }
  }

  function welcome(info) {
    setInviteParties({ businessName: info.businessName, contactName: info.contactName, email: info.maskedEmail });
    mount(el, html`
      <span class="eyebrow rule">Private invite · from Parker</span>
      <h1>Welcome.</h1>
      <p>Parker set up a private space for <b>${info.businessName}</b>. Your intake, files, and messages all live here.</p>
      <p class="small muted">Set a password for <b>${info.maskedEmail}</b>. This link works once and expires after ${SWAP.inviteExpiryDays} days.</p>
      <form class="stack card" novalidate>
        <div class="field"><label for="new-password">Password</label>
          <input id="new-password" type="password" autocomplete="new-password" minlength="12" maxlength="200" aria-describedby="pw-hint">
          <div class="pw-meter" data-n="0" aria-hidden="true"><i></i><i></i><i></i></div>
          <span class="hint" id="pw-hint">${PASSWORD_HINT}</span></div>
        <div class="field"><label for="confirm-password">Confirm password</label>
          <input id="confirm-password" type="password" autocomplete="new-password" maxlength="200">
          <span data-match aria-live="polite"></span></div>
        <div class="check">
          <input class="agree-box" id="agree" type="checkbox" aria-labelledby="agree-label">
          ${acceptanceLabelHtml()}
        </div>
        <button class="btn primary block" type="submit" disabled>Continue</button>
      </form>
      <div class="trust" aria-hidden="true"><span>Private to you</span><span>Saves as you go</span><span>Never asks for card numbers</span></div>
      ${SWAP.emailSignInCodes ? html`<p class="small muted">Or confirm with a one-time code. That path still shows the privacy notice and portal terms before you continue.</p>
      <div class="actions"><button type="button" class="btn block" data-send>${ic("mail")} Email me a code</button></div>` : ""}`);
    {
      const pw = el.querySelector("#new-password"), pw2 = el.querySelector("#confirm-password");
      const meter = el.querySelector(".pw-meter"), match = el.querySelector("[data-match]");
      const score = (v) => !v ? 0 : v.length < 12 ? 1 : (/[a-z]/i.test(v) && /\d/.test(v)) ? (v.length >= 16 || /[^a-z0-9]/i.test(v) ? 3 : 2) : 1;
      const sync = () => {
        meter.dataset.n = String(score(pw.value));
        const ok = pw2.value && pw.value === pw2.value && pw.value.length >= 12;
        match.className = ok ? "match-ok" : "";
        match.innerHTML = ok ? `${icon("check")} Passwords match` : "";
      };
      pw.addEventListener("input", sync); pw2.addEventListener("input", sync);
    }
    const form = el.querySelector("form");
    const box = el.querySelector("#agree");
    const go = form.querySelector("button[type=submit]");
    box.addEventListener("change", () => { go.disabled = !box.checked; });
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!box.checked) return;
      const password = form.querySelector("#new-password").value;
      const confirm = form.querySelector("#confirm-password").value;
      if (password !== confirm) { showErrors(form, [{ id: "confirm-password", msg: "Those passwords don't match." }]); return; }
      setBusy(go, true);
      try {
        const r = await api.inviteSetPassword({
          token, password, agree: true, label: SWAP.acceptance.label, keepSignedIn: false,
        });
        token = null;
        await signInWith(r.customToken, false);
        router.go("#/home");
      } catch (e) {
        setBusy(go, false);
        showErrors(form, [{ msg: api.friendlyError(e) }]);
      }
    });
    const send = el.querySelector("[data-send]");
    if (send) send.addEventListener("click", async () => {
      setBusy(send, true);
      try { await api.inviteSendCode(token); codeStep(info); }
      catch (e) { setBusy(send, false); showErrors(el, [{ msg: api.friendlyError(e) }]); }
    });
    document.querySelector("#main h1")?.setAttribute("tabindex", "-1");
  }

  function codeStep(info) {
    showDevCode(info.maskedEmail);
    tearForm = renderCodeForm(el, {
      title: "Check your email",
      lead: `We sent a 6-digit code to ${info.maskedEmail}. It works for 10 minutes.`,
      onSubmit: async (code, keep) => {
        const r = await api.inviteVerify(token, code, keep);
        token = null;
        await signInWith(r.customToken, keep);
        document.querySelector(".devhelp")?.remove();
        router.go("#/home");
      },
      onResend: () => api.inviteSendCode(token).then(() => showDevCode(info.maskedEmail)),
    });
    el.querySelector("h1")?.focus?.();
  }

  await load();
  return () => { dead = true; tearForm?.(); document.querySelector(".devhelp")?.remove(); };
}
