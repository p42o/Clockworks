// #/i/<sid> — one idea, with Interested / Not now / Ask a question.
import { html, mount, ic, fmtDate, skeleton, errorState, onRetry, setBusy, showErrors, toast, focusHeading } from "../lib/ui.js";
import * as data from "../lib/data.js";
import * as api from "../lib/api.js";
import { back, trunc } from "./_util.js";
import { ideaChip } from "./ideas.js";

const SAID = { interested: "Interested", not_now: "Not now", asked: "Asked a question" };

export function render(ctx) {
  const { el, params, router } = ctx;
  const sid = params.sid;
  mount(el, html`${back("#/ideas", "Ideas")}<h1>Idea</h1>${skeleton(2)}`);
  api.markIdeasSeen().catch((e) => console.debug("[cw] markIdeasSeen", e && e.code));
  let firstPaint = true;
  let idea = null, resps = [], u1, u2, got1 = false, got2 = false, asking = false;

  const fail = () => { u1?.(); u2?.(); mount(el, html`${back("#/ideas", "Ideas")}<h1>Idea</h1>${errorState()}`); onRetry(el, start); };

  function paint() {
    if (!idea) { mount(el, html`${back("#/ideas", "Ideas")}<h1>Idea</h1><div class="empty"><h2>We couldn't find that idea.</h2></div>`); return; }
    if (el.querySelector("[data-ask-text]")?.value) return;   // don't wipe a half-written question
    const ro = idea.state === "withdrawn";
    const cur = resps[0]?.value;
    mount(el, html`${back("#/ideas", "Ideas")}
      <div class="page-head"><h1>${idea.title}</h1><div>${ideaChip(idea)}</div></div>
      <div class="stack">
        <section class="card">${idea.why ? html`<h2>Why</h2><p>${idea.why}</p>` : ""}
          ${idea.effortNote ? html`<p style="margin-top:12px"><b>Effort:</b> ${idea.effortNote}</p>` : ""}
          ${(idea.links || []).length ? html`<ul style="margin:12px 0 0;padding-left:20px">${idea.links.map((l) => {
            const url = typeof l === "string" ? l : l.url, label = typeof l === "string" ? l : (l.label || l.url);
            return /^https?:\/\//.test(url || "") ? html`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a></li>` : "";
          })}</ul>` : ""}</section>
        ${ro ? html`<div class="banner">${ic("info")}<div>Parker withdrew this idea.</div></div>` : html`
        <section class="card stack" aria-labelledby="resp-h"><h2 id="resp-h">What do you think?</h2>
          <div class="actions" style="margin-top:0">
            <button type="button" class="btn ${cur === "interested" ? "primary" : ""}" data-v="interested" aria-pressed="${cur === "interested"}">${ic("check")} Interested</button>
            <button type="button" class="btn ${cur === "not_now" ? "primary" : ""}" data-v="not_now" aria-pressed="${cur === "not_now"}">Not now</button>
            <button type="button" class="btn" data-ask aria-expanded="${asking}">${ic("chat")} Ask a question</button></div>
          <p class="small muted">Saying Interested doesn't start work or change your plan. It just tells Parker.</p>
          <div data-askbox></div></section>`}
        ${resps.length ? html`<section class="card" aria-labelledby="hist-h"><h2 id="hist-h">Your answers</h2>
          <ul class="list" style="margin-top:8px">${resps.map((r) => html`<li><div class="row"><div class="grow">You said ${SAID[r.value] || r.value}</div><span class="sub">${fmtDate(r.at)}</span></div></li>`)}</ul></section>` : ""}
      </div>`);
    el.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", async () => {
      setBusy(b, true);
      try { await data.respondToIdea(sid, b.dataset.v); toast("Saved. Parker will see it."); }
      catch (e) { setBusy(b, false); showErrors(el.querySelector("section.card.stack"), [{ msg: api.friendlyError(e) }]); }
    }));
    el.querySelector("[data-ask]")?.addEventListener("click", () => { asking = !asking; askBox(); });
    askBox();
    if(firstPaint) { firstPaint=false; focusHeading(); }
  }

  function askBox() {
    const box = el.querySelector("[data-askbox]"); if (!box) return;
    el.querySelector("[data-ask]")?.setAttribute("aria-expanded", String(asking));
    if (!asking) { mount(box, html``); return; }
    mount(box, html`<form class="stack" novalidate>
      <div class="field"><label for="ask-text">Your question</label>
        <textarea data-ask-text id="ask-text" maxlength="4000" aria-describedby="ask-hint"></textarea>
        <span class="hint" id="ask-hint">Please don't include passwords or account numbers.</span></div>
      <button class="btn primary" type="submit">${ic("send")} Send to Parker</button></form>`);
    const f = box.querySelector("form"), ta = f.querySelector("textarea"); ta.focus();
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!ta.value.trim()) { showErrors(f, [{ id: "ask-text", msg: "Write your question first." }]); return; }
      const b = f.querySelector("button[type=submit]"); setBusy(b, true);
      try {
        // Thread first (linked to the idea), then the 'asked' response pointing at it.
        const tid = await data.createThread({ subject: trunc(`About: ${idea.title}`, 120), text: ta.value.trim(), linkedKind: "suggestion", linkedSuggestionId: sid });
        await data.respondToIdea(sid, "asked", tid);
        router.go(`#/m/${tid}`);
      } catch (e) { setBusy(b, false); showErrors(f, [{ msg: api.friendlyError(e) }]); }
    });
  }

  function start() {
    u1?.(); u2?.(); got1 = got2 = false;
    u1 = data.subscribeSuggestion(sid, (s) => { idea = s; got1 = true; if (got2) paint(); }, fail);
    u2 = data.subscribeResponses(sid, (r) => { resps = r; got2 = true; if (got1) paint(); }, fail);
  }
  start();
  return () => { u1?.(); u2?.(); };
}
