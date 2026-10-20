// #/accept — a material change to the Starter Terms or Privacy Notice requires a new acceptance.
// Everything else stays gated until this is checked (the server enforces it too).
// SWAP.termsUpdateScreen on: a "Terms updated" screen with what changed and links to both documents.
// Off (production today): the plain must-accept gate.
import { html, mount, ic, setBusy, showErrors, fmtDateY } from "../lib/ui.js";
import * as api from "../lib/api.js";
import { acceptanceLabelHtml } from "../lib/acceptanceLabel.js";
import { state } from "../lib/session.js";
import { SWAP } from "../swap-config.js";

export async function render(ctx) {
  const { el, router } = ctx;
  const a = SWAP.acceptance;
  if (SWAP.termsUpdateScreen === true) {
    const prev = state.me?.legal?.lastAccepted;
    const termsChanged = !prev || prev.termsVersion !== a.terms.version;
    const noticeChanged = !prev || prev.noticeVersion !== a.notice.version;
    const changes = a.changes || [];
    mount(el, html`<div class="page-head"><span class="eyebrow rule">Terms updated</span>
      <h1>We updated our <em>terms</em></h1>
      <p>Please take a look and accept to keep using the portal.${prev?.at ? html` You last accepted on ${fmtDateY(prev.at)}.` : ""}</p></div>
      <div class="stack"><section class="card stack" aria-labelledby="what-h">
        <h2 id="what-h">What changed</h2>
        <ul class="list">
          ${termsChanged ? html`<li><a class="row" href="${a.terms.href}"><span class="grow"><span class="title">Starter Terms ${a.terms.version}</span><span class="sub">${prev?.termsVersion ? `Was ${prev.termsVersion}` : "New"}</span></span><span class="chev">${ic("chevron-right")}</span></a></li>` : ""}
          ${noticeChanged ? html`<li><a class="row" href="${a.notice.href}"><span class="grow"><span class="title">Privacy Notice ${a.notice.version}</span><span class="sub">${prev?.noticeVersion ? `Was ${prev.noticeVersion}` : "New"}</span></span><span class="chev">${ic("chevron-right")}</span></a></li>` : ""}
        </ul>
        ${changes.length ? html`<ul class="changes">${changes.map((c) => html`<li>${c}</li>`)}</ul>` : html`<p class="small muted">Open each document to read the full text.</p>`}
      </section>
      <form class="stack card" novalidate>
        <div class="check">
          <input class="agree-box" id="agree" type="checkbox" aria-labelledby="agree-label">
          ${acceptanceLabelHtml()}
        </div>
        <button class="btn primary block" type="submit" disabled>Accept and continue</button>
      </form>
      <p class="small muted">Questions first? <a href="mailto:${SWAP.contact.privacyEmail}">Email Parker</a>. Nothing else in the portal opens until you accept.</p></div>`);
  } else {
    mount(el, html`<h1>Please agree to continue</h1>
      <p>The Starter Terms or the Privacy Notice changed. Check the box to continue. Nothing else in the portal opens until you do.</p>
      <form class="stack card" novalidate>
        <div class="check">
          <input class="agree-box" id="agree" type="checkbox" aria-labelledby="agree-label">
          ${acceptanceLabelHtml()}
        </div>
        <button class="btn primary" type="submit" disabled>Continue</button>
      </form>`);
  }
  const form = el.querySelector("form");
  const box = el.querySelector("#agree");
  const go = form.querySelector("button");
  box.addEventListener("change", () => { go.disabled = !box.checked; });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!box.checked) return;
    setBusy(go, true);
    try {
      await api.starterAccept({ agree: true, label: a.label });
      state.me && state.me.legal && (state.me.legal.needsAcceptance = false);
      router.go("#/home");
    } catch (e) {
      setBusy(go, false);
      showErrors(form, [{ msg: api.friendlyError(e) }]);
    }
  });
}
