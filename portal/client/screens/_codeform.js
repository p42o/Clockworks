// Shared 6-digit code entry used by invite and sign-in.
import { html, mount, ic, showErrors, setBusy } from "../lib/ui.js";
import * as api from "../lib/api.js";

const BAD_CODE = "That code didn't match. Check the latest email and try again.";
/** Message for a failed code check: keeps rate-limit / network wording, otherwise a plain "didn't work". */
export function codeErrorMessage(e) {
  const c = api.errCode(e);
  if (["failed-precondition", "invalid-argument", "not-found", "permission-denied", "unauthenticated"].includes(c)) return BAD_CODE;
  return api.friendlyError(e);
}

/**
 * host: element to render into (replaces content). Returns a teardown.
 * opts: { title, lead, onSubmit(code, keep) -> Promise, onResend() -> Promise }
 */
export function renderCodeForm(host, { title = "Check your email", lead, onSubmit, onResend }) {
  mount(host, html`
    <h1>${title}</h1>
    ${lead ? html`<p>${lead}</p>` : ""}
    <form class="stack" novalidate>
      <div class="field" data-f>
        <label for="code">6-digit code</label>
        <div class="code-boxes"><input id="code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-describedby="code-hint"><div class="code-digits" aria-hidden="true">${Array.from({length:6}, () => html`<span></span>`)}</div></div>
        <span class="hint" id="code-hint">It works for 10 minutes.</span>
      </div>
      <label class="check"><input type="checkbox" id="keep" aria-describedby="keep-hint">
        <span><b>Keep me signed in on this device</b><span class="hint" id="keep-hint" style="display:block">Leave this off on a shared or public computer.</span></span></label>
      <button class="btn primary block" type="submit">Continue</button>
      <div><button type="button" class="btn quiet" data-resend disabled aria-disabled="true">Send a new code</button>
      <span class="small muted" data-count role="status"></span></div>
    </form>`);
  const form = host.querySelector("form");
  const input = host.querySelector("#code");
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g,'').slice(0,6);
    host.querySelectorAll('.code-digits span').forEach((s,i) => { s.textContent = input.value[i] || ''; });
  });
  const resend = host.querySelector("[data-resend]");
  const count = host.querySelector("[data-count]");
  let left = 30, timer;
  const tick = () => {
    if (left > 0) { count.textContent = `You can ask for a new code in ${left}s.`; left--; }
    else { clearInterval(timer); count.textContent = ""; resend.disabled = false; resend.removeAttribute("aria-disabled"); }
  };
  const startTimer = () => { left = 30; resend.disabled = true; resend.setAttribute("aria-disabled", "true"); clearInterval(timer); tick(); timer = setInterval(tick, 1000); };
  startTimer();
  const showErr = (msg) => {
    const f = host.querySelector("[data-f]");
    f.classList.add("has-error");
    input.setAttribute("aria-describedby", "code-hint code-err");
    f.querySelector("#code-err")?.remove();
    const s = document.createElement("span"); s.className = "error"; s.id = "code-err"; s.textContent = msg; f.appendChild(s);
    showErrors(form, [{ id: "code", msg }]);
  };
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const code = input.value.replace(/\D/g, "");
    if (code.length !== 6) { showErr("Enter the 6-digit code from your email."); return; }
    const btn = form.querySelector("button[type=submit]");
    setBusy(btn, true);
    try { await onSubmit(code, host.querySelector("#keep").checked); }
    catch (e) { setBusy(btn, false); showErr(codeErrorMessage(e)); }
  });
  resend.addEventListener("click", async () => {
    resend.disabled = true;
    try { await onResend(); startTimer(); count.textContent = "New code sent."; }
    catch (e) { resend.disabled = false; showErr(api.friendlyError(e)); }
  });
  input.focus();
  return () => clearInterval(timer);
}
