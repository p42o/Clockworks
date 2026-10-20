// #/home — stage tracker, what's next, what we need from you, what's done, latest idea.
import { html, mount, ic, raw, fmtDateTime, fmtDateY, fmtDate, dueText, toast, setBusy, dialTicks } from "../lib/ui.js";
import * as data from "../lib/data.js";
import { live, emptyState } from "./_util.js";

import * as api from "../lib/api.js";
import { SWAP } from "../swap-config.js";
import { state } from "../lib/session.js";
import { LANDING_COPY, LOCK_REASON } from "../lib/clientCopy.js";
import { ARCHIVED_BODY, fillNotice } from "../lib/statusNotices.js";
const STATE_TEXT = { done: "Done", current: "Now", upcoming: "Coming up" };

function scheduleItem(h) {
  const s = h.schedule || { locked: true, reason: LOCK_REASON, status: "locked" };
  if (s.locked !== false) {
    return html`<li data-schedule="locked">${ic("clock")}<h3 id="sched-h">Implementation time</h3><span class="chip">${ic("lock")} Locked</span></li>`;
  }
  return "";
}
function scheduleCard(h) {
  const s = h.schedule || {};
  if (s.locked !== false) return "";
  const status = s.status === "confirmed" ? "Parker confirmed this time."
    : s.status === "change_requested" ? "You asked for a different time. Parker will confirm."
    : s.status === "proposed" ? "Parker proposed this time." : "";
  return html`<section class="card" aria-labelledby="sched-h" data-schedule="open"><span class="eyebrow">Scheduling</span><h2 id="sched-h">Implementation time</h2>
    ${s.whenLabel ? html`<p data-when>${s.whenLabel}</p>` : html`<p>Parker has not set a time yet.</p>`}
    ${status ? html`<p>${status}</p>` : ""}
    <form data-new-time class="stack" novalidate style="margin-top:16px">
      <div class="field"><label for="new-time">Request a different time</label>
        <textarea id="new-time" maxlength="400"></textarea></div>
      <button class="btn" type="submit">Request a different time</button>
    </form></section>`;
}
/** Clock-dial progress: hand + copper arc point at the current stage. */
function stageDial(steps) {
  const n = steps.length || 6;
  let cur = steps.findIndex((s) => s.state === "current");
  const doneN = steps.filter((s) => s.state === "done").length;
  const pos = cur >= 0 ? cur + 1 : doneN;
  const frac = Math.max(0.04, Math.min(1, pos / n));
  const R = 46, len = 2 * Math.PI * R;
  return raw(`<svg class="dial" viewBox="0 0 120 120" aria-hidden="true">${dialTicks(120, 58, 52, 55)}
    <circle class="ring" cx="60" cy="60" r="${R}"/>
    <circle class="arc" cx="60" cy="60" r="${R}" style="--arc-len:${len.toFixed(1)};stroke-dasharray:${len.toFixed(1)};stroke-dashoffset:${(len * (1 - frac)).toFixed(1)}"/>
    <line class="hand" x1="60" y1="60" x2="60" y2="22" style="--hand:${(frac * 360).toFixed(0)}deg"/>
    <circle class="hub" cx="60" cy="60" r="3.5"/>
    <text x="60" y="88" text-anchor="middle">${pos}/${n}</text></svg>`);
}
const fDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric" });
const STAGE_WINDOW = 3;
const NEED_WINDOW = 2;
const DONE_WINDOW = 3;

export function render(ctx) {
  const { el, router } = ctx;
  const flash = router.takeFlash();
  const marked = new Set();    // needs the client just marked done in this visit
  let ideaUnsub = null, ideaFor = null, ideaTitle = "";
  let showStages = false, showNeeds = false, showDone = false;
  let last = null;

  function stageWindow(steps) {
    if (showStages || steps.length <= STAGE_WINDOW) {
      return { items: steps.map((s, i) => ({ s, i })), more: steps.length > STAGE_WINDOW };
    }
    let current = steps.findIndex((s) => s.state === "current");
    if (current < 0) current = steps.length - 1;
    let start = Math.max(0, current - 1);
    let end = Math.min(steps.length, start + STAGE_WINDOW);
    start = Math.max(0, end - STAGE_WINDOW);
    return { items: steps.slice(start, end).map((s, n) => ({ s, i: start + n })), more: true };
  }

  function paint() {
    const h = last;
    if (!h) {
      mount(el, html`<h1>Home</h1>${emptyState("Nothing here yet.", "Parker will set up your home page soon.")}`);
      return;
    }
    const ro = h.access?.mode === "readonly";
    const steps = h.steps || [];
    const needs = h.needs || [];
    const openNeeds = needs.filter((n) => n.state !== "done");
    const stage = stageWindow(steps);
    const ranked = needs.map((n, i) => ({ n, i })).sort((a, b) => {
      const rank = (item) => item.state === "done" ? 2 : (marked.has(item.id) || item.clientDoneAt) ? 1 : 0;
      return rank(a.n) - rank(b.n) || a.i - b.i;
    }).map((x) => x.n);
    const shownNeeds = showNeeds || ranked.length <= NEED_WINDOW ? ranked : ranked.slice(0, NEED_WINDOW);
    const doneItems = h.doneItems || [];
    const shownDone = showDone || doneItems.length <= DONE_WINDOW ? doneItems : doneItems.slice(0, DONE_WINDOW);

    const top = ro ? null : ranked.find((n) => n.state !== "done" && !marked.has(n.id) && !n.clientDoneAt);
    const rest = ranked.filter((n) => n !== top);
    const shownRest = showNeeds || rest.length <= NEED_WINDOW ? rest : rest.slice(0, NEED_WINDOW);
    const prog = h.intake?.progress;
    const pct = prog && prog.total ? Math.round((prog.answered / prog.total) * 100) : null;
    const isIntake = (n) => /^#\/intake/.test(n.link || "");
    const intakeOpen = !["submitted", "reviewed"].includes(h.intake?.status);
    const goLabel = (n) => isIntake(n) ? (pct ? "Continue your intake" : "Start your intake") : "Open";
    const cur = steps.find((s) => s.state === "current");
    const curIdx = steps.indexOf(cur);
    const name = state.me?.firstName;
    const f = h.features || {};
    const unread = h.unread || {};
    const showLocks = !ro;
    const dueLine = (n) => n.due && n.state !== "done" ? (dueText(n.due).startsWith("overdue") ? html`<div class="sub"><b>${ic("alert")} Overdue by ${dueText(n.due).replace("overdue by ", "")}</b></div>` : html`<div class="sub">Due ${fmtDate(n.due)} · ${dueText(n.due)}</div>`) : "";

    mount(el, html`
      <div class="hero">
        <div>
          <span class="eyebrow rule">${fDay.format(new Date())}</span>
          <h1>${name ? html`Hi, <em>${name}</em>.` : h.businessName ? html`Welcome, <em>${h.businessName}</em>.` : "Home"}</h1>
          <p class="lede">${cur ? html`You're at <b>${cur.label}</b>, step ${curIdx + 1} of ${steps.length}. Here's what's happening and what Parker needs from you.` : "Here's where things stand and what Parker needs from you."}</p>
          ${h.flowLabel ? html`<p class="chip live" id="flow-stage">${h.flowLabel}</p>` : ""}
        </div>
        ${steps.length ? stageDial(steps) : ""}
      </div>
      <div class="stack">
        ${flash === "readonly" ? html`<div class="banner info" role="status">${ic("info")}<div>That part of the portal is closed now. You can still see your files and data.</div></div>` : ""}
        ${h.stageKey === "onhold" ? html`<div class="banner warn">${ic("clock")}<div>Things are paused. Message Parker any time.</div></div>` : ""}
        ${ro ? html`<div class="banner info">${ic("info")}<div>Our work together has wrapped up. You can still see your files and data ${h.access.readOnlyUntil ? html`until ${fmtDateY(h.access.readOnlyUntil)} (${Math.max(0, Math.ceil(((h.access.readOnlyUntil?.toMillis?.() || new Date(h.access.readOnlyUntil).getTime()) - Date.now()) / 86400000))} days left)` : "here"}.</div></div>` : ""}
        ${(h.access?.state === "archived" || (ro && h.access?.closedAt)) ? html`<section class="card" aria-labelledby="arch-h"><h2 id="arch-h">Your account is ARCHIVED</h2>${fillNotice(ARCHIVED_BODY, { close_date: h.access.closedAt ? fmtDateY(h.access.closedAt) : "", export_window_end_date: h.access.readOnlyUntil ? fmtDateY(h.access.readOnlyUntil) : "" }).split("\n\n").map((p) => html`<p>${p}</p>`)}</section>` : ""}
        ${unread.messages > 0 ? html`<a class="banner copper" href="${h.latestUnread?.threadId ? `#/m/${h.latestUnread.threadId}` : "#/messages"}" style="text-decoration:none;color:inherit">${ic("chat")}<div><b>${h.latestUnread?.subject ? `Parker replied to ${h.latestUnread.subject}` : "You have a reply"}</b>${unread.messages} new ${unread.messages === 1 ? "message" : "messages"} from Parker.</div></a>` : ""}

        <div class="dash">
          ${!ro ? html`<section class="card next-card" aria-labelledby="next-step-h">
            <svg class="gear" aria-hidden="true"><use href="#cw-mark"/></svg>
            <span class="eyebrow">Your next step</span>
            ${top ? html`
              <h2 id="next-step-h">${top.text}</h2>
              ${dueLine(top)}
              ${isIntake(top) && intakeOpen ? html`<p>About 20 minutes, mostly taps. It saves as you go, so you can stop and come back.</p>` : h.nextText ? html`<p>${h.nextText}</p>` : ""}
              ${isIntake(top) && pct ? html`<div class="meter"><span>${prog.answered} of ${prog.total} answered</span><div class="progress" role="progressbar" aria-label="Intake progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div></div>` : ""}
              <div class="row-actions">
                ${top.link ? html`<a class="btn primary" href="${top.link}">${goLabel(top)} <span class="arrow">${ic("arrow-right")}</span></a>` : ""}
                ${isIntake(top) ? "" : html`<button type="button" class="btn" data-done="${top.id}">I've done this</button>`}
              </div>`
            : html`<h2 id="next-step-h">You're all set <em>for now</em>.</h2><p>Parker will add anything he needs here.</p>${h.nextText ? html`<p style="margin-top:8px">${h.nextText}</p>` : ""}`}
          </section>` : ""}

          <section class="card stage-card" aria-labelledby="stage-h">
            <span class="eyebrow">Where things stand</span>
            <h2 id="stage-h">${SWAP.stageLabels[h.stageKey] || SWAP.stageLabels.unknown}</h2>
            ${steps.length ? html`<ol class="tracker">${stage.items.map(({ s }) => html`
              <li class="${s.state}"${s.state === "current" ? raw(' aria-current="step"') : ""}><span class="node" aria-hidden="true">${s.state === "done" ? ic("check") : ""}</span>
                <span class="label">${s.label}<span class="state">${STATE_TEXT[s.state] || ""}</span></span></li>`)}</ol>` : ""}
            ${stage.more ? html`<button type="button" class="btn quiet show-more" data-more="stages" aria-expanded="${showStages ? "true" : "false"}">${showStages ? "Show fewer stages" : `Show all ${steps.length} stages`}</button>` : ""}
            ${h.updatedAt ? html`<p class="stage-updated">Updated ${fmtDateTime(h.updatedAt)}</p>` : ""}
          </section>

          ${!ro ? html`<nav class="tiles span" aria-label="Shortcuts">
            ${f.messages !== false ? html`<a class="tile" href="#/messages"><span class="ico">${ic("chat")}</span><b>Messages</b><small>Ask Parker anything</small>${unread.messages > 0 ? html`<span class="badge">${unread.messages}</span>` : ""}</a>` : ""}
            ${f.ideas !== false ? html`<a class="tile" href="#/ideas"><span class="ico">${ic("lightbulb")}</span><b>Ideas</b><small>Parker's suggestions</small>${unread.ideas > 0 ? html`<span class="badge">${unread.ideas}</span>` : ""}</a>` : ""}
            <a class="tile" href="#/account/files"><span class="ico">${ic("file")}</span><b>Files</b><small>Receipts and documents</small></a>
          </nav>` : ""}

          ${rest.length ? html`<section class="card" aria-labelledby="needs-h">
            <span class="eyebrow">${openNeeds.length > (top ? 1 : 0) ? "Also on your list" : "Checked off"}</span>
            <h2 id="needs-h">What we need from you</h2>
            <ul class="list need-list">${shownRest.map((n) => html`<li><div class="need">
              <div class="grow"><div class="title">${n.text}</div>
                ${dueLine(n)}
                ${n.link ? html`<div class="sub"><a href="${n.link}">Open link</a></div>` : ""}</div>
              ${n.state === "done" ? html`<span class="chip ok">${ic("check")} Done</span>`
                : (marked.has(n.id) || n.clientDoneAt) ? html`<p class="small" role="status">Sent — Parker will check it off.</p>`
                : ro ? "" : html`<button type="button" class="btn" data-done="${n.id}">I've done this</button>`}
            </div></li>`)}</ul>
            ${rest.length > NEED_WINDOW ? html`<button type="button" class="btn quiet show-more" data-more="needs" aria-expanded="${showNeeds ? "true" : "false"}">${showNeeds ? "Show fewer" : `Show all ${rest.length}`}</button>` : ""}
          </section>` : ""}

          ${doneItems.length ? html`<section class="card" aria-labelledby="done-h"><span class="eyebrow">Progress</span><h2 id="done-h">What's done</h2>
            <ul class="list done-list">${shownDone.map((d) => html`<li><div class="row"><span class="chip ok">${ic("check")} Done</span><div class="grow">${d.text}${d.at ? html`<div class="sub">${fmtDate(d.at)}</div>` : ""}</div></div></li>`)}</ul>
            ${doneItems.length > DONE_WINDOW ? html`<button type="button" class="btn quiet show-more" data-more="done" aria-expanded="${showDone ? "true" : "false"}">${showDone ? "Show fewer" : `Show all ${doneItems.length}`}</button>` : ""}
            </section>` : ""}

          ${h.latestSuggestionId ? html`<a class="card link" href="#/i/${h.latestSuggestionId}">
            <span class="eyebrow">Latest idea</span><h2 data-idea-title>${ic("lightbulb")} See Parker's latest idea</h2>
            <span class="small muted">Take a look ${ic("chevron-right")}</span></a>` : ""}

          ${scheduleCard(h)}

          ${showLocks ? html`<section class="card lock-card" aria-labelledby="locks-h">
            <div class="lock-head"><span class="ico">${ic("lock")}</span><div><span class="eyebrow">After you sign</span><h2 id="locks-h">These open up later</h2></div></div>
            <ul class="lock-list">
              ${scheduleItem(h)}
              <li>${ic("shield")}<h3 id="pay-lock-h">Payment</h3><span class="chip">${ic("lock")} Locked</span></li>
              <li>${ic("sparkle")}<h3 id="deploy-lock-h">Deploy Prompt</h3><span class="chip">${ic("lock")} Locked</span></li>
            </ul>
            <p class="why-locked">${LOCK_REASON}</p>
          </section>` : ""}

          <section class="card about-card" aria-labelledby="land-h" data-landing><span class="eyebrow">How this works</span><h2 id="land-h" class="sr">How this works</h2><p>${LANDING_COPY}</p></section>
        </div>
      </div>`);

    el.querySelectorAll("[data-more]").forEach((b) => b.addEventListener("click", () => {
      const which = b.dataset.more;
      if (which === "stages") showStages = !showStages;
      if (which === "needs") showNeeds = !showNeeds;
      if (which === "done") showDone = !showDone;
      paint();
      el.querySelector(`[data-more="${which}"]`)?.focus();
    }));

    // "I've done this": post to the need's thread, or open a thread linked to the need.
    el.querySelector("[data-new-time]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const text = el.querySelector("#new-time").value.trim();
      if (text.length < 2) return;
      const b = ev.currentTarget.querySelector("button");
      setBusy(b, true);
      try {
        await api.clientRequestNewTime(text);
        toast("Sent to Parker.");
      } catch (e) { setBusy(b, false); toast("Something went wrong. Please try again."); }
    });

    el.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => {
      const n = needs.find((x) => x.id === b.dataset.done); if (!n) return;
      setBusy(b, true);
      try {
        await api.needDone(n.id);
        marked.add(n.id);
        const p = document.createElement("p"); p.className = "small"; p.setAttribute("role", "status"); p.textContent = "Sent — Parker will check it off.";
        b.replaceWith(p);
      } catch (e) { setBusy(b, false); toast("Something went wrong. Please try again."); }
    }));

    // Title of the latest idea (separate small subscription; cached so re-draws keep it).
    const fillIdea = () => { const t = el.querySelector("[data-idea-title]"); if (t && ideaTitle) t.textContent = ideaTitle; };
    fillIdea();
    if (h.latestSuggestionId && h.latestSuggestionId !== ideaFor) {
      ideaUnsub?.(); ideaFor = h.latestSuggestionId; ideaTitle = "";
      ideaUnsub = data.subscribeSuggestion(ideaFor, (s) => { ideaTitle = s?.title || ""; fillIdea(); });
    }
  }

  const teardownLive = live(el, "Home", data.subscribeHome, (h) => { last = h; paint(); });
  return () => { teardownLive(); ideaUnsub?.(); };
}
