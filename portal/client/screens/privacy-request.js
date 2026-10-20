// #/privacy-request — no login. A code to the account email lands the request in the privacy queue.
// COUNSEL-DRAFT-2026-10-19. The legal deadline below is exempt from the reply-time scan.
import { html, mount, setBusy, showErrors } from "../lib/ui.js";
import * as api from "../lib/api.js";
import { showDevCode } from "../lib/dev.js";
import { SWAP } from "../swap-config.js";

const DEADLINE = "We respond within 30 days of receipt and aim for 10 business days. Complexity or volume may reasonably require one extension of up to 30 more days.";

const KINDS = [
  ["access", "See what you hold about me"],
  ["export", "Send me a copy"],
  ["correct", "Correct something"],
  ["delete", "Delete something"],
];

export async function render(ctx) {
  const { el } = ctx;
  let email = "";
  let kind = "access";
  function ask() {
    mount(el, html`<h1>Privacy request</h1>
      <p>No sign-in is required. We email a code to the address on the account, then the request goes to Parker. On this local portal the code stays in the outbox. Nothing is sent.</p>
      <p>${DEADLINE}</p>
      <form class="stack" novalidate>
        <div class="field"><label for="pr-email">Email on the account</label>
          <input id="pr-email" type="email" autocomplete="email"></div>
        <div class="field"><label for="pr-kind">Request type</label>
          <select id="pr-kind">${KINDS.map(([id, label]) => html`<option value="${id}">${label}</option>`)}</select></div>
        <button class="btn primary" type="submit">Email me a code</button>
      </form>
      <p class="small">Questions? <a href="mailto:${SWAP.contact.privacyEmail}">${SWAP.contact.privacyEmail}</a></p>`);
    el.querySelector("form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      email = el.querySelector("#pr-email").value.trim().toLowerCase();
      kind = el.querySelector("#pr-kind").value;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showErrors(el, [{ id: "pr-email", msg: "Enter the email on the account." }]); return; }
      const b = ev.currentTarget.querySelector("button");
      setBusy(b, true);
      try { await api.privacyRequestStart(email, kind); showDevCode(email); code(); }
      catch (e) { setBusy(b, false); showErrors(el, [{ msg: api.friendlyError(e) }]); }
    });
  }
  function code() {
    mount(el, html`<h1>Enter the code</h1>
      <p>${DEADLINE}</p>
      <form class="stack" novalidate>
        <div class="field"><label for="pr-code">6-digit code</label>
          <input id="pr-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div>
        <button class="btn primary" type="submit">Submit request</button>
      </form>`);
    el.querySelector("form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const codeVal = el.querySelector("#pr-code").value.replace(/\D/g, "");
      if (codeVal.length !== 6) { showErrors(el, [{ id: "pr-code", msg: "Enter the 6-digit code." }]); return; }
      const b = ev.currentTarget.querySelector("button");
      setBusy(b, true);
      try {
        const r = await api.privacyRequestFinish({ email, kind, code: codeVal });
        mount(el, html`<h1>Request received</h1><p>Parker has it. The statutory due date is recorded on the request.</p><p class="small">Reference ${r.id}</p>`);
      } catch (e) { setBusy(b, false); showErrors(el, [{ msg: api.friendlyError(e) }]); }
    });
  }
  ask();
  return () => document.querySelector(".devhelp")?.remove();
}
