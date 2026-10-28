// #/account/data — what we hold, request a copy/deletion, past requests, what can't be deleted.
import { html, mount, ic, fmtDateY, toast, showErrors } from "../lib/ui.js";
import * as data from "../lib/data.js";
import * as api from "../lib/api.js";
import { state, withFresh } from "../lib/session.js";
import { live, back, act, emptyState } from "./_util.js";

// SPEC section 5.6 explanation, with Parker's 2026-10-18 edit (no named reviewer).
export const EXPLAIN = "You can ask for a copy of the information we hold about your business, or ask us to delete it. We review every request by hand. We'll show you what we found, send you a download, and tell you plainly what we can delete and what we have to keep (for example, your signed terms are kept for a set time after our work ends). We aim to finish within 10 business days and no later than 30 days. If a complex request needs more time, we may extend once by up to 30 days. We will explain why and give you a new date before the first deadline.";
import { SWAP } from "../swap-config.js";
const words = key => String(key || "").replaceAll("_", " ");
const REASONS = {contract_record:"contract record",legal_hold:"legal hold",backup_aging:"backup waiting to age out",law_requires:"required by law",cannot_verify:"we could not verify identity",not_authorized:"business authority was not confirmed"};
const HOLDER = { clockworks: "Clockworks", ai_assistant: "an AI assistant", third_party_service: "a third-party service" };
const STATUS = { received: "Received", verified: "Verified", in_progress: "In progress", delivered: "Delivered", deletion_in_progress: "Deleting", closed: "Closed", declined: "Declined" };
const OPEN = ["received", "verified", "in_progress", "delivered", "deletion_in_progress"];

export function render(ctx) {
  const { el } = ctx;
  let formState = { kind: "copy", note: "", cats: null }, doneMsg = "";
  return live(el, "My data", data.subscribeAccount, (a) => {
    const cats = a?.dataCategories || [], reqs = a?.dataRequests || [], cant = a?.cannotDelete || [];
    const open = reqs.some((r) => OPEN.includes(r.status));
    const ro = state.status === "readonly";
    if (!formState.cats) formState.cats = new Set(cats.map((c) => c.key));
    mount(el, html`${back("#/account", "Settings")}<div class="page-head"><h1>My data</h1><p>${EXPLAIN}</p></div><div class="stack">
      <section class="card" aria-labelledby="hold-h"><h2 id="hold-h">What we hold</h2>
        ${cats.length ? html`<ul class="list" style="margin-top:8px">${cats.map((c) => html`<li><div class="row"><div class="grow"><div class="title" style="white-space:normal">${c.label}</div>
          <div class="sub">Held by ${HOLDER[c.holder] || c.holder} · ${c.deletable ? "Can be deleted" : "Kept for a set time"}</div></div></div></li>`)}</ul>` : html`<p class="muted">Nothing to show yet.</p>`}</section>

      <section class="card"><h2>How long we keep it</h2><p>Intake materials and copies derived from them are deleted by the earlier of 24 months after intake or 90 days after our work closes. You can ask for deletion earlier.</p><p>Other research and working files are deleted within 90 days of close. Messages follow the same limit, except approvals and notices kept as contract records.</p><p>Contract and signature records stay for the relationship plus 6 years after the later of the last work agreement ending or final payment. Legal holds can require longer.</p><p>Backups age out within ${SWAP.retention.backupDays} days; security logs within ${SWAP.retention.securityLogDays} days. Deletions are applied again after a restore.</p><p>Questions? <a href="mailto:${SWAP.contact.privacyEmail}">${SWAP.contact.privacyEmail}</a></p></section>
      ${doneMsg ? html`<div class="banner info" role="status">${ic("check")}<div>${doneMsg}</div></div>` : ""}
      <section class="card" aria-labelledby="req-h"><h2 id="req-h">Request my data</h2>
        ${state.role === "member" ? html`<p class="small muted">Business-wide requests go to the account owner and Parker. You can ask for your own messages.</p>` : ""}
        ${open ? html`<p>You already have a request in progress.</p>` : html`
        <form class="stack" novalidate style="margin-top:12px">
          <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label">What would you like?</legend>
            ${[["copy", "A copy of my data"], ["delete", "Delete my data"], ["both", "A copy, then delete"]].map(([v, l]) => html`<label class="check"><input type="radio" name="kind" value="${v}"${formState.kind === v ? html` checked` : ""}><span>${l}</span></label>`)}</fieldset>
          <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label">Which categories?</legend>
            ${cats.map((c) => html`<label class="check"><input type="checkbox" name="cat" value="${c.key}"${formState.cats.has(c.key) ? html` checked` : ""}><span>${c.label}</span></label>`)}</fieldset>
          <div class="field"><label for="note">Note (optional)</label><textarea id="note" maxlength="1000">${formState.note}</textarea></div>
          <button class="btn primary block" type="submit">Request my data</button></form>`}
      </section>

      <section class="card" aria-labelledby="past-h"><h2 id="past-h">Your requests</h2>
        ${reqs.length ? html`<ul class="list need-list">${reqs.map((r) => html`<li><div class="row"><div class="grow">
        <div class="title">${r.kind === "copy" ? "Copy" : r.kind === "delete" ? "Delete" : "Copy and delete"} · ${fmtDateY(r.createdAt)}</div>
        <div class="sub">${r.dueAt && OPEN.includes(r.status) ? `Due by ${fmtDateY(r.dueAt)}` : ""}${r.outcomeSummary ? ` ${r.outcomeSummary}` : ""}</div></div>
        <span class="chip ${r.status === "closed" ? "ok" : r.status === "declined" ? "bad" : "info"}">${STATUS[r.status] || r.status}</span></div>
        <div class="request-details">
        ${(r.timeline || []).length ? html`<ol class="request-timeline">${r.timeline.map(t => html`<li><b>${t.label}</b> · ${fmtDateY(t.at)}</li>`)}</ol>` : ''}
        ${r.extendedTo ? html`<p>Revised deadline: ${fmtDateY(r.extendedTo)}. ${r.extensionReason}</p>` : ''}
        ${(r.dispositions || []).map(d => html`<p><b>${d.categoryLabel}</b>: ${d.disposition === 'deleted' ? 'Deleted' : d.disposition === 'kept' ? `Kept — ${REASONS[d.reasonKey] || words(d.reasonKey)}` : 'Requested from provider, not confirmed'}${d.requestedAt ? ` · Requested ${fmtDateY(d.requestedAt)}` : ''}${d.keptUntil ? ` · Kept until ${fmtDateY(d.keptUntil)}` : ''}</p>`)}
        ${(r.redactionCategories || []).length ? html`<p>Redacted categories: ${r.redactionCategories.map(words).join(', ')}. The content is not included.</p>` : ''}
        ${(r.heldNotExported || []).length ? html`<p>Held, not exported: ${r.heldNotExported.map(words).join(', ')}.</p>` : ''}
        ${(r.declines || []).map(d => html`<p>Declined part: ${REASONS[d.reasonKey] || words(d.reasonKey)}.</p>`)}
        ${r.reconsideration ? html`<p>Reconsideration ${words(r.reconsideration.status)}${r.reconsideration.outcome ? ` — ${words(r.reconsideration.outcome)}` : ''}.</p>` : ''}
        ${r.exportReady ? html`<a class="btn" href="#/account/files">View your data export</a>` : ''}
        ${r.canReconsider ? html`<button class="btn" type="button" data-reconsider="${r.id}">Ask us to reconsider</button>` : ''}</div></li>`)}</ul>` : emptyState("No requests yet.", "When you ask for a copy or a deletion, it will be listed here.", "shield", true)}</section>

      ${cant.length ? html`<section class="card" aria-labelledby="cant-h"><h2 id="cant-h">What we can't delete, and why</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:8px"><thead><tr><th scope="col" style="text-align:left;padding:6px 0">Item</th><th scope="col" style="text-align:left;padding:6px 0">Why</th></tr></thead>
        <tbody>${cant.map((c) => html`<tr style="border-top:1px solid var(--line)"><th scope="row" style="text-align:left;padding:8px 8px 8px 0;font-weight:600;vertical-align:top">${c.label}</th><td style="padding:8px 0">${c.why}</td></tr>`)}</tbody></table></section>` : ""}
    </div>`);

    el.querySelectorAll('[data-reconsider]').forEach(b => b.onclick = async () => {
      const result = await act(b, () => withFresh(() => api.dataRequestReconsider({ rid:b.dataset.reconsider })));
      if (result?.ok) { toast('Reconsideration requested. We review every request.'); b.disabled=true; b.textContent='Reconsideration requested'; }
    });
    const form = el.querySelector("form");
    if (!form) return;
    form.addEventListener("input", () => {   // keep choices if a snapshot redraws the screen
      formState.kind = form.querySelector("input[name=kind]:checked")?.value || "copy";
      formState.cats = new Set([...form.querySelectorAll("input[name=cat]:checked")].map((i) => i.value));
      formState.note = form.querySelector("#note").value;
    });
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const chosen = [...formState.cats];
      if (!chosen.length) { showErrors(form, [{ msg: "Pick at least one category." }]); return; }
      const b = form.querySelector("button[type=submit]");
      const r = await act(b, async () => {
        try { return await withFresh(() => api.dataRequestCreate(formState.kind, chosen, formState.note.trim())); }
        catch (e) {
          if (["already-exists", "failed-precondition"].includes(api.errCode(e)) && !api.needsFreshCode(e)) { showErrors(form, [{ msg: "You already have a request in progress." }]); return; }
          throw e;
        }
      });
      if (r && r.rid) { doneMsg = `Request received. Parker will be in touch.${r.dueAt ? ` Due by ${fmtDateY(r.dueAt)}.` : ""}`; formState.note = ""; toast("Request received."); el.querySelector("[role=status]")?.focus?.(); }
    });
  });
}
