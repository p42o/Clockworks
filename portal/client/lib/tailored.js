// Tailored dashboard markup: "Shop Notes" (a short issue written for this client) and "Things to try".
// Pure: no Firebase, no session. Home (screens/tailored-cards.js) and the admin "View Customer Dashboard"
// preview both render through here. Modular Home: each is a preview tile (notesTile / tipsTile) plus the
// full content shown in the sheet (notesPanelHtml / tipsPanelHtml). Content comes from clients/{cid}/tailored/current, which the rules let
// a client read only for its own cid and only once Parker publishes it.
import { html, ic } from "./ui.js";
import { tileHtml } from "./modular.js";
import { SWAP } from "../swap-config.js";

/** Client-side gate for the two cards. Published content is still required to fill them. */
export function isTailoredVisible({ cid, portalEnabled } = {}) {
  const f = SWAP.tailoredDashboard;
  if (portalEnabled === false || f?.showOnHome !== true) return false;
  const allow = Array.isArray(f.allowClientIds) ? f.allowClientIds : [];
  return allow.includes("*") || allow.includes(cid);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-10-30" -> "October 30, 2026". No timezone shift. */
export function issueDateLabel(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : "";
}

const str = (v) => (typeof v === "string" ? v : "");
const list = (v) => (Array.isArray(v) ? v : []);

/** Drop anything malformed so a bad doc renders as empty, never half-broken. */
export function tailoredModel(doc) {
  if (!doc || doc.status !== "published") return null;
  const sections = list(doc.digest?.sections).filter((s) => s && str(s.heading) && str(s.body)).slice(0, 4);
  const tips = list(doc.tips).filter((t) => t && /^[a-z0-9-]{2,40}$/.test(str(t.id)) && str(t.title)).slice(0, 5);
  if (!sections.length && !tips.length) return null;
  const fb = doc.feedback && typeof doc.feedback === "object" ? doc.feedback : {};
  return {
    issueNo: Number.isInteger(doc.issueNo) && doc.issueNo > 0 ? doc.issueNo : 1,
    date: issueDateLabel(doc.issueDate),
    madeFor: str(doc.madeFor),
    title: str(doc.digest?.title) || "Shop Notes",
    lede: str(doc.digest?.lede),
    signoff: str(doc.digest?.signoff),
    sections,
    tips: tips.map((t) => ({ ...t, state: ["done", "not_for_me"].includes(fb[t.id]?.state) ? fb[t.id].state : null })),
  };
}

function notesBody(m) {
  return html`<article class="tl-notes" aria-labelledby="tl-notes-h">
    <header class="tl-mast">
      <p class="tl-mast-k"><span>No. ${m.issueNo}</span>${m.date ? html`<span aria-hidden="true">·</span><time>${m.date}</time>` : ""}</p>
      <h3 id="tl-notes-h">${m.title}</h3>
      ${m.madeFor ? html`<p class="tl-mast-for">Written for ${m.madeFor}</p>` : ""}
    </header>
    <div class="tl-notes-b">
      ${m.lede ? html`<p class="tl-lede">${m.lede}</p>` : ""}
      ${m.sections.map((s) => html`<section class="tl-sec">
        <p class="tl-k">${s.kicker}</p>
        <h4>${s.heading}</h4>
        <p>${s.body}</p>
      </section>`)}
      ${m.signoff ? html`<p class="tl-sign">${m.signoff} <a href="#/messages">Open Support ${ic("arrow-right")}</a></p>` : ""}
    </div>
  </article>`;
}

const STATE_NOTE = { done: "Marked done", not_for_me: "Not for you. Hidden from the next notes." };

function tipItem(t, i, o) {
  const st = t.state;
  const busy = o.busy === t.id;
  return html`<li class="tl-tip${st ? ` is-${st.replace(/_/g, "-")}` : ""}" data-tip="${t.id}" tabindex="-1">
    <span class="tl-n" aria-hidden="true">${st === "done" ? ic("check") : String(i + 1).padStart(2, "0")}</span>
    <div class="tl-tip-b">
      <h4>${t.title}</h4>
      ${st === "not_for_me" ? "" : html`<p>${t.why}</p>`}
      <p class="tl-meta">${t.effort ? html`<span>${ic("clock")}${t.effort}</span>` : ""}${t.basis ? html`<span>${ic("info")}${t.basis}</span>` : ""}</p>
      ${o.readonly ? "" : st ? html`<p class="tl-state" role="status">${STATE_NOTE[st]} <button type="button" class="tl-undo" data-tip-act="clear" data-tip-id="${t.id}"${busy ? html` aria-busy="true" disabled` : ""}>Undo<span class="sr"> for ${t.title}</span></button></p>`
        : html`<div class="tl-acts" role="group" aria-label="${`Your answer for: ${t.title}`}">
          <button type="button" class="btn quiet sm" data-tip-act="done" data-tip-id="${t.id}"${busy ? html` aria-busy="true" disabled` : ""}>${ic("check")} Done</button>
          <button type="button" class="btn quiet sm" data-tip-act="not_for_me" data-tip-id="${t.id}"${busy ? html` aria-busy="true" disabled` : ""}>Not for me</button>
        </div>`}
    </div>
  </li>`;
}

const tipCounts = (m) => {
  const done = m.tips.filter((t) => t.state === "done").length;
  const skipped = m.tips.filter((t) => t.state === "not_for_me").length;
  return { done, skipped, open: m.tips.length - done - skipped };
};

function tipsBody(m, o) {
  const c = tipCounts(m);
  return html`<div class="tl-tips">
    <p class="tl-tips-sum">${c.open ? `${m.tips.length} picked for ${m.madeFor || "your shop"} from your scan, intake and goals${c.open < m.tips.length ? ` · ${m.tips.length - c.open} answered` : ""}.` : "All answered. New ones come with your next notes."}</p>
    <ol class="tl-list">${m.tips.map((t, i) => tipItem(t, i, o))}</ol>
    <p class="tl-foot">These are suggestions. Pick what fits and skip what doesn't. Questions go to <a href="#/messages">Support</a>.</p>
  </div>`;
}

// ---------- full content (the sheet) ----------

/** Shop Notes panel body for a model / "empty" / "error" / "loading". */
export function notesPanelHtml(st, o = {}) {
  if (st === "loading") return loadingBody();
  if (st === "error") return errorBody();
  if (!st || st === "empty" || !st.sections.length) return emptyNotesBody();
  return notesBody(st, o);
}
/** Things to try panel body. o: { readonly, busy (tip id in flight) }. Every tip is shown here. */
export function tipsPanelHtml(st, o = {}) {
  if (st === "loading") return loadingBody();
  if (st === "error") return errorBody();
  if (!st || st === "empty" || !st.tips.length) return emptyTipsBody();
  return tipsBody(st, o);
}

function loadingBody() {
  return html`<div class="tl-skel" aria-busy="true"><span class="sr">Loading…</span>${[1, 2, 3].map(() => html`<div class="skel line w30"></div><div class="skel line"></div><div class="skel line w80"></div>`)}</div>`;
}
function emptyNotesBody() {
  return html`<div class="tl-empty">
    <span class="tl-empty-art" aria-hidden="true">${ic("paper")}</span>
    <div><h3>Your Shop Notes aren't ready yet</h3>
      <p>Parker writes these from your Online Presence scan, your intake answers and what you've told him. When your first notes are ready, they'll show up here with a few things to try.</p>
      <p class="tl-empty-small">Nothing to do on your side. Questions? <a href="#/messages">Message Parker</a>.</p></div>
  </div>`;
}
function emptyTipsBody() {
  return html`<div class="tl-empty">
    <span class="tl-empty-art" aria-hidden="true">${ic("lightbulb")}</span>
    <div><h3>No ideas here yet</h3>
      <p>Things to try come with your Shop Notes: a few small ideas picked from your scan, your intake and your goals. You can mark each one done, or tell us it's not for you.</p>
      <p class="tl-empty-small">Nothing to do on your side. Questions? <a href="#/messages">Message Parker</a>.</p></div>
  </div>`;
}
function errorBody() {
  return html`<div class="tl-empty" role="alert">
    <span class="tl-empty-art" aria-hidden="true">${ic("refresh")}</span>
    <div><h3>We couldn't load your Shop Notes</h3><p>Check your connection, then try again.</p>
      <button type="button" class="btn sm" data-tl-retry>${ic("refresh")} Try again</button></div>
  </div>`;
}

// ---------- previews (the grid) ----------

const clip = (s, n) => { const t = String(s || ""); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };

/** st: a tailoredModel, or "loading" | "empty" | "error". */
export function notesTile(st) {
  const base = { key: "notes", icon: "paper", title: "Shop Notes", cta: "Read your notes" };
  if (st === "loading") return { ...base, state: "loading" };
  if (st === "error") return { ...base, state: "error", headline: "We couldn't load your Shop Notes", line: "Open to try again.", cta: "Open" };
  if (!st || st === "empty" || !st.sections.length) return { ...base, state: "empty", count: "Not ready yet", headline: "Your Shop Notes aren't ready yet", line: "Parker writes them from your scan and intake. Nothing to do on your side.", cta: "How it works" };
  const lead = st.sections[0];
  return { ...base, state: "ready", count: `${st.sections.length} ${st.sections.length === 1 ? "section" : "sections"}`,
    kicker: `No. ${st.issueNo}${st.date ? ` · ${st.date}` : ""}`, headline: lead.heading, line: clip(lead.body, 140) };
}

export function tipsTile(st) {
  const base = { key: "tips", icon: "lightbulb", title: "Things to try", cta: "See all ideas" };
  if (st === "loading") return { ...base, state: "loading" };
  if (st === "error") return { ...base, state: "error", headline: "We couldn't load your ideas", line: "Open to try again.", cta: "Open" };
  if (!st || st === "empty" || !st.tips.length) return { ...base, state: "empty", count: "None yet", headline: "Ideas come with your Shop Notes", line: "A few small things to try, picked from your scan and intake.", cta: "How it works" };
  const c = tipCounts(st);
  const next = st.tips.find((t) => !t.state);
  const n = st.tips.length;
  return { ...base, state: "ready", count: c.open === n ? `${n} ${n === 1 ? "idea" : "ideas"}` : c.open ? `${c.open} of ${n} open` : `All ${n} answered`,
    kicker: next ? "Start here" : "All answered", headline: next ? next.title : "New ideas come with your next notes",
    line: next ? (next.effort || next.basis || "") : `${c.done} done · ${c.skipped} not for you`,
    extra: html`<span class="mod-dots" aria-hidden="true">${st.tips.map((t) => html`<i class="${t.state ? t.state.replace(/_/g, "-") : "open"}"></i>`)}</span>` };
}

export const notesTileHtml = (st) => tileHtml(notesTile(st));
export const tipsTileHtml = (st) => tileHtml(tipsTile(st));
