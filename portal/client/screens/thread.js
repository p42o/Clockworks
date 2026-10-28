// #/m/<tid> — one conversation.
import { html, mount, ic, fmtDateTime, skeleton, errorState, onRetry, setBusy, showErrors, toast, focusHeading } from "../lib/ui.js";
import * as data from "../lib/data.js";
import * as api from "../lib/api.js";
import { back, act, emptyState } from "./_util.js";
import { stateChip, threadsMarkup } from "./messages.js";

const HIDDEN_NOTICE = "This message wasn't sent. It looked like it had a card or account number. Please don't send passwords or account numbers here.";

export function render(ctx) {
  const { el, params } = ctx;
  const tid = params.tid;
  mount(el, html`${back("#/messages", "Support")}<h1>Conversation</h1>${skeleton(2)}`);
  let thread = null, msgs = [], sideRows = null, unsubT, unsubM, unsubSide, lastReadFor = null, formDone = false;
  const fillSide = () => {
    const slot = el.querySelector("[data-side-list]");
    if (!slot || !sideRows) return;
    mount(slot, threadsMarkup(sideRows, tid));
  };

  const fail = () => { unsubT?.(); unsubM?.(); mount(el, html`${back("#/messages", "Support")}<h1>Conversation</h1>${errorState()}`); formDone = false; onRetry(el, start); };

  function frame() {
    mount(el, html`<div class="split-msg is-thread">
      <div class="split-pane list-pane" data-side-list></div>
      <div class="split-pane thread-pane">
      ${back("#/messages", "Support")}
      <div class="page-head"><h1 data-title></h1><div data-chip></div></div>
      <div class="stack"><div class="bubbles" data-bubbles aria-live="polite"></div>
      <div data-closed></div>
      <form class="card stack" novalidate>
        <div class="field"><label for="reply">Reply</label>
          <textarea id="reply" maxlength="4000" aria-describedby="reply-hint reply-count"></textarea>
          <span class="hint" id="reply-hint">Please don't include passwords or account numbers.</span><span class="count" id="reply-count">0 / 4000</span></div>
        <div class="banner warn"><div>Before posting or uploading: leave out passwords, card or bank numbers, government IDs, and health information. Up to 3 images or PDFs, each smaller than 20 MB.</div></div><div class="actions" style="margin-top:0">
          <div class="field"><label for="reply-files">Attach images or PDFs</label><input id="reply-files" type="file" accept="image/png,image/jpeg,image/webp,image/heic,application/pdf" multiple></div>
          <button type="submit" class="btn primary">${ic("send")} Send</button></div>
      </form></div></div></div>`);
    fillSide();
    const form = el.querySelector("form"), ta = form.querySelector("#reply");
    ta.addEventListener("input", () => { form.querySelector("#reply-count").textContent = `${ta.value.length} / 4000`; });
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      form.querySelector(".field").classList.remove("has-error"); showErrors(form, []);
      if (!ta.value.trim()) { form.querySelector(".field").classList.add("has-error"); showErrors(form, [{ id: "reply", msg: "Write your reply first." }]); return; }
      const b = form.querySelector("button[type=submit]"); setBusy(b, true);
      try { const files = [...form.querySelector("#reply-files").files];
        if (files.length > 3 || files.some(f => f.size >= 20*1024*1024)) { showErrors(form,[{msg:"Choose up to 3 files, each smaller than 20 MB."}]); setBusy(b,false); return; }
        await data.postMessage(tid, ta.value.trim(), files); form.querySelector("#reply-files").value = ""; ta.value = ""; ta.dispatchEvent(new Event("input")); toast("Sent to Parker."); }
      catch (e) { showErrors(form, [{ msg: api.friendlyError(e) }]); }
      setBusy(b, false);
    });
    formDone = true;
  }

  function paint() {
    if (!thread) { mount(el, html`${back("#/messages", "Support")}<h1>Conversation</h1>${emptyState("We couldn't find that conversation.", "It may have been removed. Head back to Support and try another.", "chat")}`); formDone = false; return; }
    const firstPaint = !formDone;
    if (!formDone) frame();
    el.querySelector("[data-title]").textContent = thread.subject || "Conversation";
    mount(el.querySelector("[data-chip]"), stateChip(thread.state));
    mount(el.querySelector("[data-closed]"), thread.state === "closed" ? html`<div class="banner info">${ic("info")}<div>This conversation was closed. Sending a reply will reopen it.</div></div>` : html``);
    mount(el.querySelector("[data-bubbles]"), html`${msgs.map((m) => m.notice
      ? html`<div class="banner warn" role="status">${ic("alert")}<div>${HIDDEN_NOTICE}</div></div>`
      : html`<div class="bubble ${m.by === "client" ? "me" : "parker"}"><b class="sr">${m.by === "client" ? "You" : "Parker"} said:</b>${m.text}${(m.attachments || []).map((a,i) => html`<button class="btn quiet" type="button" data-attachment="${m.id}~${i}">${ic("file")} ${a.name}</button>`)}<span class="meta">${m.by === "client" ? "You" : "Parker"} · ${m.createdAt ? fmtDateTime(m.createdAt) : "Sending…"}</span></div>`)}`);
    el.querySelectorAll('[data-attachment]').forEach(b => b.onclick = async () => { const r = await act(b, () => api.getDownloadLink(`upload:${tid}~${b.dataset.attachment}`)); if(r?.url) location.assign(r.url); });
    if(firstPaint) focusHeading();
    // Tell the server we've read it (once per newest message).
    const last = msgs[msgs.length - 1];
    if (last && last.id !== lastReadFor) { lastReadFor = last.id; api.markThreadRead(tid).catch((e) => console.debug("[cw] markThreadRead", e && e.code)); }
  }

  function start() {
    unsubT?.(); unsubM?.(); formDone = false; thread = null; msgs = [];
    let gotT = false, gotM = false;
    const maybe = () => { if (gotT && gotM) paint(); };
    unsubT = data.subscribeThread(tid, (t) => { thread = t; gotT = true; maybe(); }, fail);
    unsubM = data.subscribeMessages(tid, (m) => { msgs = m; gotM = true; maybe(); }, fail);
    unsubSide?.();
    unsubSide = data.subscribeThreads((rows) => { sideRows = rows; fillSide(); }, () => {});
  }
  start();
  return () => { unsubT?.(); unsubM?.(); unsubSide?.(); };
}
