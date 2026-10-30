// Home dashboard markup (modular: preview tiles + full panels). Pure: no Firebase, no session. The client Home and the admin
// "View Customer Dashboard" preview both render through here, so Parker sees exactly what the client sees.
import { html, ic, raw, fmtDate, dueText, toDate } from "./ui.js";
import { clientPresenceRows, cleanPresenceScore, formatPresenceDate } from "./presenceCopy.js";
import { tailoredModel, notesPanelHtml, tipsPanelHtml, notesTile, tipsTile } from "./tailored.js";
import { tileHtml, panelHtml } from "./modular.js";
import { newsletterIssue } from "./newsletter.js";

export const STAGE_STATE = { done: "Done", current: "Now", upcoming: "Coming up" };
const isIntake = (n) => /^#\/intake/.test(n?.link || "");

// ---------- models ----------

/** The one thing to do next, plus the rest of the open list. Same rules Home has always used. */
export function nextModel(h, marked = new Set()) {
  const ro = h.access?.mode === "readonly";
  const needs = h.needs || [];
  const intakeIn = ["submitted", "reviewed"].includes(h.intake?.status);
  const ranked = needs.map((n, i) => ({ n, i })).sort((a, b) => {
    const rank = (x) => x.state === "done" ? 2 : (marked.has(x.id) || x.clientDoneAt) ? 1 : 0;
    return rank(a.n) - rank(b.n) || a.i - b.i;
  }).map((x) => x.n);
  const top = ro ? null : ranked.find((n) => n.state !== "done" && !marked.has(n.id) && !n.clientDoneAt && !(intakeIn && isIntake(n)));
  const rest = ranked.filter((n) => n !== top && n.state !== "done" && !(intakeIn && isIntake(n)));
  const prog = h.intake?.progress;
  const pct = prog && prog.total ? Math.round((prog.answered / prog.total) * 100) : null;
  return { ro, top, rest, intakeIn, prog, pct, intakeOpen: !intakeIn };
}

/** Latest published presence score, its history and a plain-words verdict. */
export function presenceModel(account) {
  const rows = clientPresenceRows(account?.presenceReports)
    .map((r) => ({ ...r, score: cleanPresenceScore(r.score) }))
    .filter((r) => r.score != null)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  const first = rows[0];
  const s = last.score;
  const verdict = s >= 80 ? "Strong" : s >= 60 ? "Good, a few gaps" : s >= 40 ? "Fair, with room to grow" : "Needs work";
  return { last, first, rows, score: s, delta: rows.length > 1 ? s - first.score : null, verdict };
}

// Agent Newsletter, issue 1: lib/newsletter.js (pure, topic-gated by the client's own "do not touch" answer).
export { newsletterIssue };

// ---------- pieces ----------

function gaugeSvg(score) {
  const off = 100 - score;
  return raw(`<svg class="dash-gauge" viewBox="0 0 150 100" role="img" aria-label="Presence score ${score} of 100">
    <defs><linearGradient id="dash-gg" x1="0" x2="1"><stop offset="0" stop-color="#E9935F"/><stop offset="1" stop-color="#BE4F24"/></linearGradient></defs>
    <path class="trk" d="M15 80 A60 60 0 0 1 135 80"/>
    <path class="val" d="M15 80 A60 60 0 0 1 135 80" pathLength="100" stroke-dasharray="100" style="--off:${off}"/>
    <text x="75" y="74">${score}</text><text class="lbl" x="75" y="92">PRESENCE</text></svg>`);
}
function sparkSvg(pts, w = 150, h = 44) {
  if (pts.length < 2) return "";
  const min = Math.min(...pts) - 4, max = Math.max(...pts) + 2;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, h - ((v - min) / (max - min || 1)) * h]);
  const d = xy.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return raw(`<svg class="dash-spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="f" d="${d} L${w} ${h} L0 ${h}Z"/><path class="l" d="${d}"/>${xy.map((p, i) => `<circle class="${i === xy.length - 1 ? "now" : ""}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5"/>`).join("")}</svg>`);
}
const moreLink = (href, label) => html`<a class="dash-more" href="${href}">${label} ${ic("arrow-right")}</a>`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---------- full content: the sheet panels ----------

function presenceBody(pm) {
  if (!pm) return html`<p class="dash-empty">Parker will share your Online Presence score here when it’s ready. Nothing to do on your side.</p>`;
  return html`<div class="dash-pres">
    <div class="dash-pres-top"><div class="dash-score">${pm.score}<small>/100</small></div>${gaugeSvg(pm.score)}</div>
    <p class="dash-verdict">${pm.verdict}</p>
    ${pm.delta != null ? html`<p class="dash-delta ${pm.delta < 0 ? "down" : ""}">${pm.delta >= 0 ? "↑ +" : "↓ "}${pm.delta} since your first check</p>` : ""}
    ${String(pm.last.summary || "").length ? html`<p class="dash-sum">${pm.last.summary}</p>` : ""}
    ${pm.rows.length > 1 ? html`<div class="dash-trend"><div><b>Trend</b><span>${pm.rows.map((r) => r.score).join(" → ")}</span></div>${sparkSvg(pm.rows.map((r) => r.score))}</div>` : ""}
    <p class="mod-panel-more">${moreLink(`#/account/presence/${encodeURIComponent(pm.last.id)}`, "Open the full assessment")}</p>
  </div>`;
}

function nextBody(h, nm, steps) {
  const { top, rest, intakeIn, prog, pct } = nm;
  const cur = steps.find((s) => s.state === "current");
  const curIdx = steps.indexOf(cur);
  const dueLine = (n) => n.due && n.state !== "done" ? (dueText(n.due).startsWith("overdue")
    ? html`<p class="dash-due over">${ic("alert")} Overdue by ${dueText(n.due).replace("overdue by ", "")}</p>`
    : html`<p class="dash-due">Due ${fmtDate(n.due)} · ${dueText(n.due)}</p>`) : "";
  const goLabel = (n) => isIntake(n) ? (pct ? "Continue your intake" : "Start your intake") : "Open";
  return html`<div class="dash-next">
    <div class="dash-next-top"><p class="dash-stage" id="stage-h">${h.stageLabel}</p>${steps.length && cur ? html`<span class="dash-stepof">Step ${curIdx + 1} of ${steps.length}</span>` : ""}</div>
    ${top ? html`
      <h3 id="next-step-h">Your next step: ${top.text}</h3>
      ${dueLine(top)}
      ${isIntake(top) && !intakeIn ? html`<p>About 20 minutes, mostly taps. It saves as you go, so you can stop and come back.</p>` : h.nextText ? html`<p>${h.nextText}</p>` : ""}
      ${isIntake(top) && pct ? html`<div class="meter"><span>${prog.answered} of ${prog.total} answered</span><div class="progress" role="progressbar" aria-label="Intake progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div></div>` : ""}`
    : intakeIn ? html`<h3 id="next-step-h">Your intake is <em>in</em>.</h3><p>Parker is reviewing it now. You'll see the next step here, and you can message him any time.</p>`
    : html`<h3 id="next-step-h">You're all set <em>for now</em>.</h3><p>Parker will add anything he needs here.</p>${h.nextText ? html`<p>${h.nextText}</p>` : ""}`}
    ${steps.length ? html`<ol class="dash-steps" aria-label="Where things stand">${steps.map((s) => html`<li class="${s.state}"${s.state === "current" ? raw(' aria-current="step"') : ""}><span class="sr">${STAGE_STATE[s.state] || ""}: </span>${s.label}</li>`)}</ol>` : ""}
    ${rest.length ? html`<div class="dash-also"><p class="dash-eyebrow">Also on your list</p><ul>${rest.map((n) => html`<li><span>${n.text}</span>${n.clientDoneAt ? html`<small>Sent</small>` : n.due ? html`<small>${dueText(n.due)}</small>` : ""}</li>`)}</ul></div>` : ""}
    <div class="row-actions">
      ${top?.link ? html`<a class="btn primary" href="${top.link}">${goLabel(top)} <span class="arrow">${ic("arrow-right")}</span></a>` : ""}
      ${top && !isIntake(top) ? html`<button type="button" class="btn" data-done="${top.id}">I've done this</button>` : ""}
      ${!top ? html`<a class="btn primary" href="#/messages">Message Parker <span class="arrow">${ic("arrow-right")}</span></a>` : ""}
    </div>
  </div>`;
}

function newsBody(issue, ideas) {
  if (!issue) return html`<div aria-busy="true"><span class="sr">Loading…</span><div class="skel line w40"></div><div class="skel block"></div></div>`;
  const latestIdea = ideas?.[0];
  return html`<div class="dash-news">
    <div class="dash-issue"><div class="dash-issue-h"><b>Issue ${issue.no}</b><span>${issue.tailored ? "Picked for your trade" : "Your first issue"}</span></div>
      <p class="dash-issue-lede">${issue.lede}</p>
      <ol>${issue.items.map((it) => html`<li><b>${it.t}</b><span>${it.p}</span></li>`)}</ol>
      <div class="dash-issue-f"><small>Made for ${issue.madeFor}</small>${issue.gated ? html`<small>Leaves out anything you asked us not to touch.</small>` : ""}</div></div>
    ${latestIdea ? html`<a class="dash-idea" href="#/i/${latestIdea.id}">${ic("lightbulb")}<span><small>Latest idea from Parker</small><b>${latestIdea.title || "See Parker's latest idea"}</b></span></a>` : ""}
    <p class="mod-panel-more">${moreLink("#/newsletter", "Open the newsletter page")}</p>
  </div>`;
}

function filesBody(files) {
  const list = (files || []).slice(0, 12);
  return html`<div class="dash-files">
    ${list.length ? "" : html`<p class="dash-empty">No files here yet. Anything Parker shares with you, and anything you send him, shows up here.</p>`}
    <div class="dash-file-grid">
      ${list.map((f) => html`<a class="dash-file" href="#/account/files"><span class="fi k-${f.kind}">${ic("file")}</span><span><b>${f.title}</b><small>${fmtDate(f.at)}</small></span></a>`)}
      <a class="dash-file dash-upload" href="#/messages">${ic("upload")}<span><b>Send Parker a file</b><small>Logo, job photos, price sheet</small></span></a>
    </div>
    <p class="mod-panel-more">${moreLink("#/account/files", "All files")}</p>
  </div>`;
}

function todoBody(nm) {
  return nm.rest.length ? html`<ul class="dash-todo">${nm.rest.map((n) => html`<li><b>${n.text}</b>${n.due ? html`<small>${dueText(n.due)}</small>` : ""}</li>`)}</ul>`
    : html`<p class="dash-empty">Nothing else right now.</p>`;
}

// ---------- previews: the tiles ----------

function presenceTile(pm) {
  const t = { key: "presence", icon: "gauge", title: "Online Presence", cta: "See your score" };
  if (!pm) return { ...t, state: "empty", count: "Not yet", headline: "Your score isn't ready yet", line: "Parker will share it here when it's ready. Nothing to do on your side.", cta: "How it works" };
  return { ...t, count: `${pm.score}/100`, kicker: pm.last.date ? `Your ${formatPresenceDate(pm.last.date)} scan` : "From your assessment", headline: pm.verdict,
    line: pm.delta != null ? `${pm.delta >= 0 ? "Up" : "Down"} ${Math.abs(pm.delta)} since your first check` : "Your first check",
    extra: html`<span class="mod-meter" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, pm.score))}%"></i></span>` };
}

function nextTile(h, nm, steps) {
  const cur = steps.find((s) => s.state === "current");
  const t = { key: "next", icon: "check", title: "Your next step", wide: true, cta: "See the details",
    count: steps.length && cur ? `Step ${steps.indexOf(cur) + 1} of ${steps.length}` : h.stageLabel || "",
    kicker: h.stageLabel || "",
    extra: steps.length ? html`<span class="mod-steps" aria-hidden="true">${steps.map((s) => html`<i class="${s.state}"></i>`)}</span>` : "" };
  const { top, intakeIn, pct } = nm;
  if (top) {
    const due = top.due && top.state !== "done" ? dueText(top.due) : "";
    return { ...t, headline: top.text, line: due ? (due.startsWith("overdue") ? `Overdue by ${due.replace("overdue by ", "")}` : `Due ${fmtDate(top.due)} · ${due}`)
      : isIntake(top) && pct ? `${pct}% answered` : h.nextText || "", cta: isIntake(top) ? (pct ? "Continue your intake" : "Start your intake") : "See the details" };
  }
  if (intakeIn) return { ...t, headline: "Your intake is in", line: "Parker is reviewing it now." };
  return { ...t, state: "empty", headline: "You're all set for now", line: h.nextText || "Parker will add anything he needs here." };
}

function newsTile(issue) {
  const t = { key: "news", icon: "paper", title: "Agent Newsletter", cta: "Read the issue" };
  if (!issue) return { ...t, state: "loading" };
  return { ...t, count: plural(issue.items.length, "idea"), kicker: `Issue ${issue.no} · ${issue.tailored ? "Picked for your trade" : "Your first issue"}`,
    headline: issue.items[0]?.t || "", line: issue.items.slice(1).map((x) => x.t).join(" · ") };
}

function filesTile(files) {
  const list = files || [];
  const t = { key: "files", icon: "folder", title: "Files & assets", cta: "Open files" };
  if (!list.length) return { ...t, state: "empty", count: "No files yet", headline: "Send Parker a file", line: "Logo, job photos, price sheet." };
  return { ...t, count: plural(list.length, "file"), kicker: "Latest", headline: list[0].title, line: fmtDate(list[0].at) };
}

function todoTile(nm) {
  const t = { key: "todo", icon: "check", title: "What we need from you", cta: "See the list" };
  if (!nm.rest.length) return { ...t, state: "empty", count: "All clear", headline: "Nothing else right now", line: "Checked off as you go." };
  const n = nm.rest[0];
  return { ...t, count: `${nm.rest.length} open`, headline: n.text, line: n.due ? dueText(n.due) : "Checked off as you go." };
}

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortYmd = (iso) => { const x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return x ? `${SHORT[Number(x[2]) - 1]} ${Number(x[3])}` : ""; };

/** cs: { loading, items } from the changelog mount (or undefined while it starts). */
export function capsTile(cs) {
  const t = { key: "caps", icon: "sparkle", title: "New Agent Capabilities", cta: "See what's new" };
  if (!cs || cs.loading) return { ...t, state: "loading" };
  const items = cs.items || [];
  if (!items.length) return { ...t, state: "empty", count: "None yet", headline: "Nothing new for your shop yet", line: "Check back after Parker's next update." };
  const green = items.filter((x) => x.trafficLight === "green").length;
  const first = items[0];
  return { ...t, count: green ? `${green} for you` : plural(items.length, "update"), kicker: first.date ? `Latest · ${shortYmd(first.date)}` : "Latest",
    headline: first.title, line: items.length > 1 ? `+${items.length - 1} more` : "" };
}

function irisTile() {
  return { key: "iris", icon: "chat", title: "Iris", count: "AI assistant", kicker: "Clockworks support",
    headline: "Questions about your portal?", line: "Ask Iris. You can ask for a human any time.", cta: "Start chat" };
}

export function shopBanner() {
  return html`<a class="card dash-shop" href="#/shop-pass"><span class="dash-ic">${ic("store")}</span>
    <span class="dash-shop-t"><b>Shop Pass</b><small>Keep your portal, Iris and the Agent Newsletter after your follow-up period.</small></span>
    <span class="dash-price">$99<small>/mo</small></span><span class="btn">Coming soon</span></a>`;
}

/**
 * Whole dashboard: a grid of preview tiles plus the hidden panels the sheet (lib/modular.js) opens.
 * m = { home, account, profile, ideas, firstName, marked, showIris, showChangelog, showTailored, topicsOff,
 *       tailored, tlState, caps }.
 * topicsOff: newsletter gating (lib/topicGate.js keys; null = unknown; undefined = still loading).
 * Live slots ([data-iris-chat], [data-changelog-card], [data-tl-notes], [data-tl-tips]) are filled by the caller.
 * m.tailored (admin preview only) renders Shop Notes + Things to try inline and inert.
 * m.tlState / m.caps: the latest live state, so a redraw keeps the tiles current.
 */
export function dashHtml(m) {
  const h = m.home || {};
  const nm = nextModel(h, m.marked);
  const steps = h.steps || [];
  const pm = presenceModel(m.account);
  const issue = m.topicsOff === undefined ? null : newsletterIssue(m.profile, h.businessName, { topicsOff: m.topicsOff });
  const pre = m.tailored !== undefined; // admin preview: static Shop Notes
  const tl = pre ? (tailoredModel(m.tailored) || "empty") : (m.tlState || "loading");
  const cells = [], panels = [];
  const add = (tile, title, sub, body) => { cells.push(tileHtml(tile)); panels.push(panelHtml(tile.key, title, sub, body)); };
  if (!nm.ro) add(nextTile(h, nm, steps), "Your next step", h.stageLabel, nextBody(h, nm, steps));
  if (m.showTailored) {
    add(notesTile(tl), "Shop Notes", "A short note written for your shop", pre ? notesPanelHtml(tl) : html`<div data-tl-notes class="tl-host"></div>`);
    add(tipsTile(tl), "Things to try", "Mark each one done, or tell us it's not for you", pre ? tipsPanelHtml(tl, { readonly: true }) : html`<div data-tl-tips class="tl-host"></div>`);
  }
  add(presenceTile(pm), "Online Presence", pm?.last.date ? `From your assessment · ${formatPresenceDate(pm.last.date)}` : "How your business looks online", presenceBody(pm));
  if (m.showChangelog) add(capsTile(m.caps), "New Agent Capabilities", "What your Grok Bot team learned lately", html`<div data-changelog-card class="changelog-card-host"></div>`);
  else add(todoTile(nm), "What we need from you", "Checked off as you go", todoBody(nm));
  add(newsTile(issue), "Agent Newsletter", issue ? `Issue ${issue.no} · Made for ${issue.madeFor}` : "", newsBody(issue, m.ideas));
  if (m.showIris) add(irisTile(), "Iris", "Clockworks support chat", html`<div data-iris-chat class="iris-card-host" aria-label="Iris support chat"></div>`);
  add(filesTile(m.account?.files), "Files & assets", "", filesBody(m.account?.files));
  return html`<div class="mod" data-mod>
      <h2 class="sr">Your dashboard</h2>
      <ul class="mod-grid" role="list">${cells}</ul>
      <div class="mod-panels" data-panels hidden>${panels}</div>
    </div>`;
}

/** Tiles that live data redraws: Home calls these with the newest state. */
export { notesTile, tipsTile };

/** Static Iris thread for the admin preview: shows the slot without opening a real chat session. */
export function irisPreviewHtml(firstName, avatar) {
  return html`<div class="iris-card card iris-preview"><div class="iris-head"><div class="iris-brand"><img src="${avatar}" alt="" aria-hidden="true" class="iris-avatar"><div><span class="eyebrow">Clockworks support</span><h2>Iris <small>AI assistant</small></h2></div></div></div>
    <div class="iris-bubbles"><div class="bubble iris">Hi${firstName ? ` ${firstName}` : ""}, it's Iris. Ask me anything about your portal or your agent team.</div><div class="iris-typing" aria-hidden="true"><i></i><i></i><i></i></div></div>
    <p class="iris-footer">Preview. The client's real chat opens here.</p></div>`;
}

export const greetingFor = (d = new Date()) => { const h = d.getHours(); return h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
export { toDate };
