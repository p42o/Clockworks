// #/account — plan, links, this device, privacy/terms.
import { html, mount, ic, fmtDateY, toast, raw } from "../lib/ui.js";
import { carePlanDisclosureHtml } from "../lib/carePlanDisclosure.js";
import * as data from "../lib/data.js";
import * as api from "../lib/api.js";
import { state, withFresh, signOutHere, signOutAll } from "../lib/session.js";
import { live, act } from "./_util.js";

import { SWAP } from "../swap-config.js";
import { isLocalDev } from "../lib/env.js";

const STATUS = { active: ["ok", "Active"], paused: ["warn", "Paused"], canceled: ["", "Canceled"], cancelled: ["", "Canceled"], pending: ["info", "Pending"] };

function disclosureSwap() {
  if (isLocalDev() && window.__CW_FORCE_BILLING === true) {
    return { billing: { enabled: false, disclosures: true } };
  }
  return SWAP;
}
const INTERVAL = { month: "per month", year: "per year", one_time: "one time" };

export function render(ctx) {
  const { el, router } = ctx;
  let confirmAll = false, acct = null;
  function draw() {
    const a = acct;
    const ro = state.status === "readonly";
    const plan = a?.plan;
    const [cls, label] = STATUS[a?.status] || ["", a?.status ? String(a.status) : ""];
    mount(el, html`<div class="page-head"><h1>Account</h1></div><div class="account-grid">
      <section class="card plan" aria-labelledby="plan-h"><h2 id="plan-h">Your plan</h2>
        ${plan ? html`<dl class="kv">
          <dt>Plan</dt><dd>${plan.name}</dd>
          <dt>Price</dt><dd>${plan.priceDisplay}${INTERVAL[plan.interval] ? ` ${INTERVAL[plan.interval]}` : ""}</dd>
          ${label ? html`<dt>Status</dt><dd><span class="chip ${cls}">${label}</span></dd>` : ""}
          ${a.startedAt ? html`<dt>Started</dt><dd>${fmtDateY(a.startedAt)}</dd>` : ""}
          ${a.renewalDate ? html`<dt>Renews</dt><dd>${fmtDateY(a.renewalDate)}</dd>` : ""}</dl>`
          : html`<p class="muted">No plan yet.</p>`}
        ${(a?.historySummary || []).length ? html`<ul class="plan-history">${a.historySummary.map(h => html`<li>${h.label} · ${fmtDateY(h.at)}</li>`)}</ul>` : ''}
        ${a && a.billingEnabled === false || !a ? html`<p class="small muted" style="margin-top:12px">Payments aren't set up in the portal. Nothing is charged here.</p>` : ""}
        ${ro ? "" : html`<div class="actions"><button type="button" class="btn" data-req="plan_change">Request a change</button>
          <button type="button" class="btn" data-req="cancel">Request to cancel</button></div>`}
        ${raw(carePlanDisclosureHtml(disclosureSwap()))}
      </section>

      <ul class="list links" aria-label="Your information">
        <li><a class="row" href="#/account/files">${ic("file")}<div class="grow"><div class="title">Files &amp; receipts</div></div><span class="chev">${ic("chevron-right")}</span></a></li>
        <li><a class="row" href="#/account/data">${ic("shield")}<div class="grow"><div class="title">My data</div><div class="sub">What we hold. Ask for a copy or deletion.</div></div><span class="chev">${ic("chevron-right")}</span></a></li>
        ${ro ? '' : html`<li><a class="row" href="#/account/people">${ic("user")}<div class="grow"><div class="title">People</div></div><span class="chev">${ic("chevron-right")}</span></a></li>`}
      </ul>

      <section class="card device" aria-labelledby="dev-h"><h2 id="dev-h">This device</h2>
        <div class="actions"><button type="button" class="btn" data-out>${ic("logout")} Sign out</button>
        ${confirmAll ? html`<div class="banner warn" role="alert"><div>This signs you out on every phone and computer. You'll need a new link or code to get back in.
          <div class="actions"><button type="button" class="btn danger" data-all-yes>Yes, sign out everywhere</button><button type="button" class="btn quiet" data-all-no>Cancel</button></div></div></div>`
          : html`<button type="button" class="btn" data-all>Sign out everywhere</button>`}</div>
      </section>

      <div class="legal stack"><p>Questions? <a href="mailto:${SWAP.contact.privacyEmail}">${SWAP.contact.privacyEmail}</a></p><ul class="list" aria-label="Legal"><li><a class="row" href="#/privacy"><div class="grow"><div class="title">Privacy notice</div></div><span class="chev">${ic("chevron-right")}</span></a></li>
        <li><a class="row" href="#/terms"><div class="grow"><div class="title">Terms</div></div><span class="chev">${ic("chevron-right")}</span></a></li></ul></div>
    </div>`);

    el.querySelector("[data-cancel-plan]")?.addEventListener("click", () => {
      const box = el.querySelector("[data-cancel-screen]");
      if (box) box.hidden = false;
    });
    el.querySelector("[data-cancel-confirm]")?.addEventListener("click", () => {
      const s = el.querySelector("[data-cancel-status]");
      if (s) s.textContent = "Billing is off. Nothing was charged and your plan was not changed.";
    });
    el.querySelectorAll("[data-req]").forEach((b) => b.addEventListener("click", async () => {
      const kind = b.dataset.req;
      const text = kind === "cancel" ? "I'd like to cancel my plan." : "I'd like to change my plan.";
      const r = await act(b, () => withFresh(() => api.startAccountThread(kind, text)));
      if (r && r.tid) { toast("Sent to Parker."); router.go(`#/m/${r.tid}`); }
    }));
    el.querySelector("[data-out]").addEventListener("click", async () => { await signOutHere(); router.go("#/signin"); });
    el.querySelector("[data-all]")?.addEventListener("click", () => { confirmAll = true; ctxRedraw(); });
    el.querySelector("[data-all-no]")?.addEventListener("click", () => { confirmAll = false; ctxRedraw(); });
    el.querySelector("[data-all-yes]")?.addEventListener("click", async (ev) => {
      const ok = await act(ev.currentTarget, async () => { await signOutAll(); return true; });
      if (ok) router.go("#/signin");
    });
  }
  const ctxRedraw = () => draw();
  return live(el, "Account", data.subscribeAccount, (a) => { acct = a; draw(); });
}
