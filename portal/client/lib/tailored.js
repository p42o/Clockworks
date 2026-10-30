// Tailored dashboard markup: "Shop Notes" (a short issue written for this client) and "Things to try".
// Pure: no Firebase, no session. Home (screens/tailored-cards.js) and the admin "View Customer Dashboard"
// preview both render through here. Content comes from clients/{cid}/tailored/current, which the rules let
// a client read only for its own cid and only once Parker publishes it.
import { html, ic } from "./ui.js";
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

function notesCard(m) {
  return html`<article class="card dash-card tl-notes" aria-labelledby="tl-notes-h">
    <header class="tl-mast">
      <p class="tl-mast-k"><span>No. ${m.issueNo}</span>${m.date ? html`<span aria-hidden="true">·</span><time>${m.date}</time>` : ""}</p>
      <h2 id="tl-notes-h">${m.title}</h2>
      ${m.madeFor ? html`<p class="tl-mast-for">Written for ${m.madeFor}</p>` : ""}
    </header>
    <div class="tl-notes-b">
      ${m.lede ? html`<p class="tl-lede">${m.lede}</p>` : ""}
      ${m.sections.map((s) => html`<section class="tl-sec">
        <p class="tl-k">${s.kicker}</p>
        <h3>${s.heading}</h3>
        <p>${s.body}</p>
      </section>`)}
      ${m.signoff ? html`<p class="tl-sign">${m.signoff} <a href="#/messages">Open Support ${ic("arrow-right")}</a></p>` : ""}
    </div>
  </article>`;
}

const COLLAPSED = 3; // phones stay short; "Show all" opens the rest
const STATE_NOTE = { done: "Marked done", not_for_me: "Not for you. Hidden from the next notes." };

function tipItem(t, i, o) {
  const st = t.state;
  const busy = o.busy === t.id;
  return html`<li class="tl-tip${st ? ` is-${st.replace(/_/g, "-")}` : ""}" data-tip="${t.id}">
    <span class="tl-n" aria-hidden="true">${st === "done" ? ic("check") : String(i + 1).padStart(2, "0")}</span>
    <div class="tl-tip-b">
      <h3>${t.title}</h3>
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

function tipsCard(m, o) {
  const open = m.tips.filter((t) => !t.state).length;
  return html`<section class="card dash-card tl-tips" aria-labelledby="tl-tips-h">
    <div class="dash-h"><span class="dash-ic">${ic("lightbulb")}</span><div class="dash-ht"><h2 id="tl-tips-h">Things to try</h2>
      <p>${open ? `${m.tips.length} picked for ${m.madeFor || "your shop"} from your scan, intake and goals${open < m.tips.length ? ` · ${m.tips.length - open} answered` : ""}` : "All answered. New ones come with your next notes."}</p></div></div>
    <ol class="tl-list">${(o.expanded || o.readonly || m.tips.length <= COLLAPSED ? m.tips : m.tips.slice(0, COLLAPSED)).map((t, i) => tipItem(t, i, o))}</ol>
    ${m.tips.length > COLLAPSED && !o.readonly ? html`<button type="button" class="btn quiet tl-more" data-tl-more aria-expanded="${o.expanded ? "true" : "false"}">${o.expanded ? "Show fewer" : `Show all ${m.tips.length}`}</button>` : ""}
    <p class="tl-foot">These are suggestions. Pick what fits and skip what doesn't. Questions go to <a href="#/messages">Support</a>.</p>
  </section>`;
}

/** Both cards. o: { readonly, busy (tip id in flight), expanded (all tips shown; the admin preview passes readonly and sees all) }. */
export function tailoredHtml(doc, o = {}) {
  const m = tailoredModel(doc);
  if (!m) return tailoredEmptyHtml();
  return html`${m.sections.length ? notesCard(m) : ""}${m.tips.length ? tipsCard(m, o) : ""}`;
}

export function tailoredLoadingHtml() {
  return html`<div class="card dash-card tl-notes tl-skel" aria-busy="true"><span class="sr">Loading your Shop Notes…</span>
    <div class="tl-mast"><div class="skel line w40"></div><div class="skel line w70 tall"></div></div>
    <div class="tl-notes-b">${[1, 2, 3].map(() => html`<div class="skel line w30"></div><div class="skel line"></div><div class="skel line w80"></div>`)}</div></div>
    <div class="card dash-card tl-tips tl-skel" aria-hidden="true">${[1, 2, 3].map(() => html`<div class="skel block"></div>`)}</div>`;
}

export function tailoredEmptyHtml() {
  return html`<section class="card dash-card tl-empty" aria-labelledby="tl-empty-h">
    <span class="tl-empty-art" aria-hidden="true">${ic("paper")}</span>
    <div><h2 id="tl-empty-h">Your Shop Notes aren't ready yet</h2>
      <p>Parker writes these from your Online Presence scan, your intake answers and what you've told him. When your first notes are ready, they'll show up here with a few things to try.</p>
      <p class="tl-empty-small">Nothing to do on your side. Questions? <a href="#/messages">Message Parker</a>.</p></div>
  </section>`;
}

export function tailoredErrorHtml() {
  return html`<section class="card dash-card tl-empty" aria-labelledby="tl-err-h" role="alert">
    <span class="tl-empty-art" aria-hidden="true">${ic("refresh")}</span>
    <div><h2 id="tl-err-h">We couldn't load your Shop Notes</h2><p>Check your connection, then try again.</p>
      <button type="button" class="btn sm" data-tl-retry>${ic("refresh")} Try again</button></div>
  </section>`;
}
