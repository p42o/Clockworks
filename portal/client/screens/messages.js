// #/messages — thread list + "ask a question" form.
import { html, mount, ic, raw, fmtDate, skeleton, errorState, onRetry, toast, setBusy, showErrors } from "../lib/ui.js";
import * as data from "../lib/data.js";
import * as api from "../lib/api.js";
import { emptyState } from "./_util.js";

const ORDER = { waiting_on_you: 0, open: 1, answered: 2, closed: 3 };

/** Thread rows. currentId marks the open conversation on the desktop split. */
export function threadsMarkup(rows, currentId = "") {
  if (!rows.length) return emptyState("Have a question? Ask here and Parker will reply.", "Your conversations with Parker will be listed here.", "chat");
  const sorted = rows.map((r, i) => [r, i]).sort((a, b) => (ORDER[a[0].state] ?? 1) - (ORDER[b[0].state] ?? 1) || a[1] - b[1]).map((x) => x[0]);
  return html`<ul class="list" aria-label="Conversations">${sorted.map((t) => html`<li><a class="row ${t.unread || t.unreadForClient ? "unread" : ""}${t.state === "closed" ? " quiet-row" : ""}" href="#/m/${t.id}"${t.id === currentId ? raw(' aria-current="page"') : ""}>
    <div class="grow"><div class="title">${t.subject}</div><div class="sub">${fmtDate(t.lastMessageAt)}${t.unread || t.unreadForClient ? html` · <b>New reply</b>` : ""}</div></div>
    ${stateChip(t.state)}<span class="chev">${ic("chevron-right")}</span></a></li>`)}</ul>`;
}
export const stateChip = (s) =>
  s === "waiting_on_you" ? html`<span class="chip you">${ic("alert")} Waiting on you</span>`
  : s === "answered" ? html`<span class="chip ok">${ic("check")} Answered</span>`
  : s === "closed" ? html`<span class="chip">Closed</span>`
  : html`<span class="chip info">Open</span>`;

/** The "new question" form. Used here and by the account screens' "Ask Parker" prefill. */
export function questionForm(host, { subject = "", onSent, kind = "general", intro = "" } = {}) {
  mount(host, html`<form class="card stack" novalidate aria-labelledby="nq-h">
    <h2 id="nq-h">Ask a question</h2>${intro ? html`<p class="small muted">${intro}</p>` : ""}
    <div class="field"><label for="nq-subject">Subject</label>
      <input id="nq-subject" type="text" maxlength="120" value="${subject}" aria-describedby="nq-s-count"><span class="count" id="nq-s-count">0 / 120</span></div>
    <div class="field"><label for="nq-text">Message</label>
      <textarea id="nq-text" maxlength="4000" aria-describedby="nq-hint nq-t-count"></textarea>
      <span class="hint" id="nq-hint">Please don't include passwords or account numbers.</span><span class="count" id="nq-t-count">0 / 4000</span></div>
    <div class="banner warn"><div>Before you send or attach a file: please leave out passwords, card or bank numbers, government IDs, and health information.</div></div><div class="field"><label for="attachments">Attach images or PDFs (optional)</label><input id="attachments" type="file" accept="image/png,image/jpeg,image/webp,image/heic,application/pdf" multiple aria-describedby="attachment-hint"><span class="hint" id="attachment-hint">Up to 3 files, each smaller than 20 MB.</span></div>
    <button type="submit" class="btn primary block">${ic("send")} Send to Parker</button>
  </form>`);
  const form = host.querySelector("form");
  const s = form.querySelector("#nq-subject"), t = form.querySelector("#nq-text");
  const cnt = () => { form.querySelector("#nq-s-count").textContent = `${s.value.length} / 120`; form.querySelector("#nq-t-count").textContent = `${t.value.length} / 4000`; };
  s.addEventListener("input", cnt); t.addEventListener("input", cnt); cnt();
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const errs = [];
    if (!s.value.trim()) errs.push({ id: "nq-subject", msg: "Add a short subject." });
    if (!t.value.trim()) errs.push({ id: "nq-text", msg: "Write your message." });
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
    errs.forEach((e) => form.querySelector("#" + e.id).closest(".field").classList.add("has-error"));
    showErrors(form, errs);
    if (errs.length) return;
    const files = [...form.querySelector('#attachments').files];
    if (files.length > 3 || files.some(f => f.size >= 20*1024*1024 || !['image/png','image/jpeg','image/webp','image/heic','application/pdf'].includes(f.type))) { showErrors(form, [{id:'attachments',msg:'Choose up to 3 images or PDFs, each smaller than 20 MB.'}]); return; }
    const b = form.querySelector("button[type=submit]"); setBusy(b, true);
    try {
      const tid = await data.createThread({ subject: s.value.trim(), text: t.value.trim(), linkedKind: kind, files: [...form.querySelector("#attachments").files] });
      toast("Sent to Parker.");
      onSent?.(tid);
    } catch (e) { setBusy(b, false); showErrors(form, [{ msg: api.friendlyError(e) }]); }
  });
}

export function render(ctx) {
  const { el, router } = ctx;
  mount(el, html`<div class="page-head"><h1>Support</h1></div>
    <div class="split-msg">
      <div class="split-pane list-pane stack">
        <div data-empty></div>
        <div data-form></div>
        <div data-list aria-live="polite">${skeleton(2)}</div>
      </div>
      <aside class="split-pane thread-pane read-pane" aria-label="Conversation">
        ${emptyState("No conversation open", "Choose a message, or ask a question and it will open here.", "chat")}
      </aside>
    </div>`);
  questionForm(el.querySelector("[data-form]"), { onSent: (tid) => router.go(`#/m/${tid}`) });
  const list = el.querySelector("[data-list]");
  const empty = el.querySelector("[data-empty]");
  let unsub;
  const start = () => {
    unsub?.(); mount(list, skeleton(2)); mount(empty, html``);
    unsub = data.subscribeThreads((rows) => {
      if (!rows.length) {
        mount(empty, emptyState("Have a question? Ask here and Parker will reply.", "Your conversations with Parker will be listed here.", "chat"));
        mount(list, html``);
        return;
      }
      mount(empty, html``);
      mount(list, threadsMarkup(rows));
    }, () => { unsub?.(); mount(list, errorState()); onRetry(list, start); });
  };
  start();
  return () => unsub?.();
}
