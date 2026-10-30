// Home dashboard markup. Pure: no Firebase, no session. The client Home and the admin
// "View Customer Dashboard" preview both render through here, so Parker sees exactly what the client sees.
import { html, ic, raw, fmtDate, dueText, toDate } from "./ui.js";
import { clientPresenceRows, cleanPresenceScore, formatPresenceDate } from "./presenceCopy.js";
import { tailoredHtml } from "./tailored.js";

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

// First Agent Newsletter. A real generator replaces this later; until then every client gets
// issue 1, worded for their trade. Plain ideas only: no prices, no promises.
const PLAYBOOKS = [
  { re: /drywall|plaster|paint|roof|siding|gutter|remodel|construct|contract|carpent|floor|tile|concrete|deck|fence|window|insulat|handyman/i, items: [
    ["Follow up on quiet quotes", "Your agents can draft a short, friendly check-in two days after a quote goes out. You approve every text."],
    ["Turn job photos into Google posts", "Send before and after shots. Your agents write the caption and queue the post for your OK."],
    ["Answer every review", "A drafted reply waits for each new Google review, so nothing sits unanswered."],
  ] },
  { re: /plumb|hvac|heat|cool|furnace|electric|septic|well|water|drain|appliance|garage door|locksmith/i, items: [
    ["Text back every missed call", "When a call goes unanswered, your agents send a quick text so the job does not go to the next number on the list."],
    ["Remind past customers about seasonal service", "A short note before the season turns brings back the customers who already trust you."],
    ["Answer every review", "A drafted reply waits for each new Google review, so nothing sits unanswered."],
  ] },
  { re: /lawn|landscap|tree|snow|pool|pest|clean|maid|window wash|pressure|junk|moving/i, items: [
    ["Confirm tomorrow's route by text", "Your agents can send a short heads-up the day before, so fewer gates are locked when your crew shows up."],
    ["Fill gaps from the waitlist", "When a job cancels, your agents can offer the slot to the next customer waiting."],
    ["Answer every review", "A drafted reply waits for each new Google review, so nothing sits unanswered."],
  ] },
  { re: /restaurant|cafe|coffee|bar|tavern|grill|pizza|bakery|food|catering|brew|diner|kitchen/i, items: [
    ["Post this week's specials", "Tell your agents the special once. They draft the Google and Facebook posts for your OK."],
    ["Catch catering and event requests fast", "Your agents can reply to inquiries with your menu and the next step, even after hours."],
    ["Answer every review", "A drafted reply waits for each new Google review, so nothing sits unanswered."],
  ] },
  { re: /salon|barber|spa|nail|beauty|fitness|gym|yoga|massage|studio|tattoo|groom/i, items: [
    ["Rebook before they leave", "Your agents can send a short rebooking nudge a few weeks after each visit."],
    ["Fill slow days", "Tell your agents which days run light. They draft an offer for regulars, and you approve it."],
    ["Answer every review", "A drafted reply waits for each new Google review, so nothing sits unanswered."],
  ] },
];
const GENERAL = [
  ["Text back every missed call", "When a call goes unanswered, your agents send a quick text so the customer does not move on."],
  ["Post to Google once a week", "Tell your agents what happened this week. They draft the post and wait for your OK."],
  ["Answer every review", "A drafted reply waits for each new Google review, so nothing sits unanswered."],
];

export function newsletterIssue(profile, businessName) {
  const name = String(businessName || profile?.businessName || "").trim();
  // Trade first; the business name is a fair hint when the trade is not filled in yet ("Timely Drywall").
  const pick = PLAYBOOKS.find((p) => p.re.test(String(profile?.trade || ""))) || PLAYBOOKS.find((p) => p.re.test(name));
  return {
    no: 1,
    title: "Ideas for putting your agent team to work",
    lede: name ? `Three things your agent team could take off ${name}'s plate.` : "Three things your agent team could take off your plate.",
    madeFor: name || "your business",
    tailored: !!pick,
    items: (pick ? pick.items : GENERAL).map(([t, p]) => ({ t, p })),
  };
}

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
const cardHead = (icon, title, sub, more, id) => html`<div class="dash-h"><span class="dash-ic">${ic(icon)}</span>
  <div class="dash-ht"><h2 ${id ? raw(`id="${id}"`) : ""}>${title}</h2>${sub ? html`<p>${sub}</p>` : ""}</div>${more || ""}</div>`;
const moreLink = (href, label) => html`<a class="dash-more" href="${href}">${label} ${ic("arrow-right")}</a>`;

function presenceCard(pm) {
  if (!pm) {
    return html`<section class="card dash-card dash-pres" aria-labelledby="pres-h">
      ${cardHead("gauge", "Online Presence", "How your business looks online", "", "pres-h")}
      <p class="dash-empty">Parker will share your Online Presence score here when it’s ready. Nothing to do on your side.</p>
    </section>`;
  }
  const chips = String(pm.last.summary || "").length ? html`<p class="dash-sum">${pm.last.summary}</p>` : "";
  return html`<section class="card dash-card dash-pres" aria-labelledby="pres-h">
    ${cardHead("gauge", "Online Presence", `From your assessment${pm.last.date ? ` · ${formatPresenceDate(pm.last.date)}` : ""}`, moreLink(`#/account/presence/${encodeURIComponent(pm.last.id)}`, "Details"), "pres-h")}
    <div class="dash-pres-top"><div class="dash-score">${pm.score}<small>/100</small></div>${gaugeSvg(pm.score)}</div>
    <p class="dash-verdict">${pm.verdict}</p>
    ${pm.delta != null ? html`<p class="dash-delta ${pm.delta < 0 ? "down" : ""}">${pm.delta >= 0 ? "↑ +" : "↓ "}${pm.delta} since your first check</p>` : ""}
    ${chips}
    ${pm.rows.length > 1 ? html`<div class="dash-trend"><div><b>Trend</b><span>${pm.rows.map((r) => r.score).join(" → ")}</span></div>${sparkSvg(pm.rows.map((r) => r.score))}</div>` : ""}
  </section>`;
}

function nextCard(h, nm, steps) {
  const { top, rest, intakeIn, prog, pct } = nm;
  const cur = steps.find((s) => s.state === "current");
  const curIdx = steps.indexOf(cur);
  const dueLine = (n) => n.due && n.state !== "done" ? (dueText(n.due).startsWith("overdue")
    ? html`<p class="dash-due over">${ic("alert")} Overdue by ${dueText(n.due).replace("overdue by ", "")}</p>`
    : html`<p class="dash-due">Due ${fmtDate(n.due)} · ${dueText(n.due)}</p>`) : "";
  const goLabel = (n) => isIntake(n) ? (pct ? "Continue your intake" : "Start your intake") : "Open";
  return html`<section class="card dash-card dash-next" aria-labelledby="next-step-h">
    <div class="dash-next-top"><p class="dash-stage" id="stage-h">${h.stageLabel}</p>${steps.length && cur ? html`<span class="dash-stepof">Step ${curIdx + 1} of ${steps.length}</span>` : ""}</div>
    ${top ? html`
      <h2 id="next-step-h">Your next step: ${top.text}</h2>
      ${dueLine(top)}
      ${isIntake(top) && !intakeIn ? html`<p>About 20 minutes, mostly taps. It saves as you go, so you can stop and come back.</p>` : h.nextText ? html`<p>${h.nextText}</p>` : ""}
      ${isIntake(top) && pct ? html`<div class="meter"><span>${prog.answered} of ${prog.total} answered</span><div class="progress" role="progressbar" aria-label="Intake progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div></div>` : ""}`
    : intakeIn ? html`<h2 id="next-step-h">Your intake is <em>in</em>.</h2><p>Parker is reviewing it now. You'll see the next step here, and you can message him any time.</p>`
    : html`<h2 id="next-step-h">You're all set <em>for now</em>.</h2><p>Parker will add anything he needs here.</p>${h.nextText ? html`<p>${h.nextText}</p>` : ""}`}
    ${steps.length ? html`<ol class="dash-steps" aria-label="Where things stand">${steps.map((s) => html`<li class="${s.state}"${s.state === "current" ? raw(' aria-current="step"') : ""}><span class="sr">${STAGE_STATE[s.state] || ""}: </span>${s.label}</li>`)}</ol>` : ""}
    ${rest.length ? html`<div class="dash-also"><p class="dash-eyebrow">Also on your list</p><ul>${rest.map((n) => html`<li><span>${n.text}</span>${n.clientDoneAt ? html`<small>Sent</small>` : n.due ? html`<small>${dueText(n.due)}</small>` : ""}</li>`)}</ul></div>` : ""}
    <div class="row-actions">
      ${top?.link ? html`<a class="btn primary" href="${top.link}">${goLabel(top)} <span class="arrow">${ic("arrow-right")}</span></a>` : ""}
      ${top && !isIntake(top) ? html`<button type="button" class="btn" data-done="${top.id}">I've done this</button>` : ""}
      ${!top ? html`<a class="btn primary" href="#/messages">Message Parker <span class="arrow">${ic("arrow-right")}</span></a>` : ""}
    </div>
  </section>`;
}

function newsletterCard(issue, ideas) {
  const latestIdea = ideas?.[0];
  return html`<section class="card dash-card dash-news" aria-labelledby="news-h">
    ${cardHead("paper", "Agent Newsletter", html`Issue ${issue.no} · <span class="dash-new">New</span>`, moreLink("#/newsletter", "Read it"), "news-h")}
    <div class="dash-issue"><div class="dash-issue-h"><b>Issue ${issue.no}</b><span>${issue.tailored ? "Picked for your trade" : "Your first issue"}</span></div>
      <ol>${issue.items.map((it) => html`<li><b>${it.t}</b><span>${it.p}</span></li>`)}</ol>
      <div class="dash-issue-f"><small>Made for ${issue.madeFor}</small></div></div>
    ${latestIdea ? html`<a class="dash-idea" href="#/i/${latestIdea.id}">${ic("lightbulb")}<span><small>Latest idea from Parker</small><b>${latestIdea.title || "See Parker's latest idea"}</b></span></a>` : ""}
  </section>`;
}

function filesCard(files) {
  const list = (files || []).slice(0, 3);
  return html`<section class="card dash-card dash-files" aria-labelledby="files-h">
    ${cardHead("folder", "Files & assets", "", moreLink("#/account/files", "All files"), "files-h")}
    <div class="dash-file-grid">
      ${list.map((f) => html`<a class="dash-file" href="#/account/files"><span class="fi k-${f.kind}">${ic("file")}</span><span><b>${f.title}</b><small>${fmtDate(f.at)}</small></span></a>`)}
      <a class="dash-file dash-upload" href="#/messages">${ic("upload")}<span><b>Send Parker a file</b><small>Logo, job photos, price sheet</small></span></a>
    </div>
  </section>`;
}

export function shopBanner() {
  return html`<a class="card dash-shop" href="#/shop-pass"><span class="dash-ic">${ic("store")}</span>
    <span class="dash-shop-t"><b>Shop Pass</b><small>Keep your portal, Iris and the Agent Newsletter after your follow-up period.</small></span>
    <span class="dash-price">$99<small>/mo</small></span><span class="btn">Coming soon</span></a>`;
}

/**
 * Whole dashboard. m = { home, account, profile, ideas, firstName, marked, showIris, showChangelog, showTailored, tailored, preview }.
 * Live slots: [data-iris-chat], [data-changelog-card] and [data-tailored] are filled by the caller.
 * m.tailored (admin preview only) renders Shop Notes + Things to try inline and inert.
 */
export function dashHtml(m) {
  const h = m.home || {};
  const nm = nextModel(h, m.marked);
  const steps = h.steps || [];
  const pm = presenceModel(m.account);
  const issue = newsletterIssue(m.profile, h.businessName);
  return html`
    <div class="dash-grid${m.showIris ? "" : " no-iris"}${m.showTailored ? " has-tl" : ""}">
      <div class="dash-col c1">${presenceCard(pm)}${!nm.ro ? nextCard(h, nm, steps) : ""}</div>
      <div class="dash-col c2">${m.showChangelog ? html`<div data-changelog-card class="changelog-card-host"></div>` : alsoCard(nm)}${filesCard(m.account?.files)}</div>
      <div class="dash-col c3">${newsletterCard(issue, m.ideas)}</div>
      ${m.showIris ? html`<div class="dash-col c4"><section data-iris-chat class="iris-card-host" aria-label="Iris support chat"></section></div>` : ""}
      ${m.showTailored ? html`<div class="dash-col c5 dash-tl" data-tailored>${m.tailored !== undefined ? tailoredHtml(m.tailored, { readonly: true }) : ""}</div>` : ""}
    </div>`;
}

// When the changelog card is off, column two shows the to-do list instead of sitting empty.
function alsoCard(nm) {
  return html`<section class="card dash-card dash-caps" aria-labelledby="todo-h">
    ${cardHead("check", "What we need from you", "Checked off as you go", "", "todo-h")}
    ${nm.rest.length ? html`<ul class="dash-todo">${nm.rest.map((n) => html`<li><b>${n.text}</b>${n.due ? html`<small>${dueText(n.due)}</small>` : ""}</li>`)}</ul>`
      : html`<p class="dash-empty">Nothing else right now.</p>`}
  </section>`;
}

/** Static Iris thread for the admin preview: shows the slot without opening a real chat session. */
export function irisPreviewHtml(firstName, avatar) {
  return html`<div class="iris-card card iris-preview"><div class="iris-head"><div class="iris-brand"><img src="${avatar}" alt="" aria-hidden="true" class="iris-avatar"><div><span class="eyebrow">Clockworks support</span><h2>Iris <small>AI assistant</small></h2></div></div></div>
    <div class="iris-bubbles"><div class="bubble iris">Hi${firstName ? ` ${firstName}` : ""}, it's Iris. Ask me anything about your portal or your agent team.</div><div class="iris-typing" aria-hidden="true"><i></i><i></i><i></i></div></div>
    <p class="iris-footer">Preview. The client's real chat opens here.</p></div>`;
}

export const greetingFor = (d = new Date()) => { const h = d.getHours(); return h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
export { toDate };
