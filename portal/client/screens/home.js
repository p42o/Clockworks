// #/home: the dashboard. Online Presence, next step, Shop Notes + Things to try, New Agent Capabilities, Agent Newsletter, Iris, files.
// Markup lives in lib/dash.js so the admin "View Customer Dashboard" preview renders the same thing.
import { html, mount, ic, fmtDateY, toast, setBusy } from "../lib/ui.js";
import * as data from "../lib/data.js";
import { live, emptyState } from "./_util.js";

import * as api from "../lib/api.js";
import { SWAP } from "../swap-config.js";
import { state } from "../lib/session.js";
import { LANDING_COPY } from "../lib/clientCopy.js";
import { ARCHIVED_BODY, fillNotice } from "../lib/statusNotices.js";
import { isIrisChatVisible } from "../lib/irisChat.js";
import { mountIrisChatCard } from "./iris-chat-card.js";
import { isChangelogCardVisible } from "../lib/changelogCard.js";
import { mountChangelogCard } from "./changelog-card.js";
import { dashHtml, greetingFor } from "../lib/dash.js";
import { isTailoredVisible } from "../lib/tailored.js";
import { mountTailoredCards } from "./tailored-cards.js";

const fDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long", month: "short", day: "numeric" });

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

const WELCOME_KEY = "cw.iris.welcome";

export function render(ctx) {
  const { el, router } = ctx;
  const flash = router.takeFlash();
  let irisWelcome = null;
  try {
    const raw = sessionStorage.getItem(WELCOME_KEY);
    if (raw) {
      sessionStorage.removeItem(WELCOME_KEY);
      irisWelcome = JSON.parse(raw);
    }
  } catch { irisWelcome = null; }
  const marked = new Set();    // needs the client just marked done in this visit
  let irisUnmount = null, irisCid = null, changelogUnmount = null, tailoredUnmount = null, tailoredRo = null;
  let last = null, account = null, profile = null, ideas = [];
  document.body.classList.add("dash-fit");

  function paint() {
    // Keep the live Iris chat and the changelog list when Home redraws for a stage or need update.
    const preservedIris = el.querySelector("[data-iris-chat]");
    preservedIris?.remove();
    const preservedChangelog = el.querySelector("[data-changelog-card]");
    preservedChangelog?.remove();
    const preservedTailored = el.querySelector("[data-tailored]");
    preservedTailored?.remove();
    const h = last;
    if (!h) {
      irisUnmount?.(); irisUnmount = null; irisCid = null;
      changelogUnmount?.(); changelogUnmount = null;
      tailoredUnmount?.(); tailoredUnmount = null;
      mount(el, html`<h1>Home</h1>${emptyState("Nothing here yet.", "Parker will set up your home page soon.")}`);
      return;
    }
    const ro = h.access?.mode === "readonly";
    const unread = h.unread || {};
    const name = state.me?.firstName || String(state.me?.contactName || "").trim().split(/\s+/)[0] || "";
    const portalEnabled = h.access?.enabled !== false;
    const showIris = !!(SWAP.irisChat?.showOnHome && isIrisChatVisible({ cid: state.me?.cid, stageKey: h.stageKey, portalEnabled }));
    const showChangelog = isChangelogCardVisible({ cid: state.me?.cid, stageKey: h.stageKey, portalEnabled });
    const showTailored = isTailoredVisible({ cid: state.me?.cid, portalEnabled });
    // Two more cards do not fit one desktop screen: let Home scroll when they are on.
    document.body.classList.toggle("dash-fit", !showTailored);
    const welcomeName = irisWelcome?.name || name;
    mount(el, html`
      ${irisWelcome ? html`<div class="banner info" id="iris-welcome" role="status">${ic("info")}<div>Iris here. Welcome, ${welcomeName || "you"}.</div></div>` : ""}
      <div class="dash-hello">
        <div><h1>${greetingFor()}${name ? html`, <em>${name}</em>` : h.businessName ? html`, <em>${h.businessName}</em>` : ""}</h1>
          <p class="lede">Here's how ${h.businessName || "your business"} looks online and what your agent team has for you.</p></div>
        <p class="dash-when"><span class="live-dot" aria-hidden="true"></span>${fDay.format(new Date())}</p>
      </div>
      ${flash === "readonly" ? html`<div class="banner info" role="status">${ic("info")}<div>That part of the portal is closed now. You can still see your files and data.</div></div>` : ""}
      ${h.stageKey === "onhold" ? html`<div class="banner warn">${ic("clock")}<div>Things are paused. Message Parker any time.</div></div>` : ""}
      ${ro ? html`<div class="banner info">${ic("info")}<div>Our work together has wrapped up. You can still see your files and data ${h.access.readOnlyUntil ? html`until ${fmtDateY(h.access.readOnlyUntil)} (${Math.max(0, Math.ceil(((h.access.readOnlyUntil?.toMillis?.() || new Date(h.access.readOnlyUntil).getTime()) - Date.now()) / 86400000))} days left)` : "here"}.</div></div>` : ""}
      ${(h.access?.state === "archived" || (ro && h.access?.closedAt)) ? html`<section class="card" aria-labelledby="arch-h"><h2 id="arch-h">Your account is ARCHIVED</h2>${fillNotice(ARCHIVED_BODY, { close_date: h.access.closedAt ? fmtDateY(h.access.closedAt) : "", export_window_end_date: h.access.readOnlyUntil ? fmtDateY(h.access.readOnlyUntil) : "" }).split("\n\n").map((p) => html`<p>${p}</p>`)}</section>` : ""}
      ${unread.messages > 0 ? html`<a class="banner copper" href="${h.latestUnread?.threadId ? `#/m/${h.latestUnread.threadId}` : "#/messages"}" style="text-decoration:none;color:inherit">${ic("chat")}<div><b>${h.latestUnread?.subject ? `Parker replied to ${h.latestUnread.subject}` : "You have a reply"}</b>${unread.messages} new ${unread.messages === 1 ? "message" : "messages"} from Parker.</div></a>` : ""}
      ${dashHtml({ home: { ...h, stageLabel: SWAP.stageLabels[h.stageKey] || SWAP.stageLabels.unknown }, account, profile, ideas, firstName: name, marked, showIris, showChangelog, showTailored })}
      ${scheduleCard(h)}
      <p class="dash-landing" data-landing>${LANDING_COPY}</p>`);

    const irisHost = el.querySelector("[data-iris-chat]");
    if (irisHost && preservedIris && irisCid === state.me?.cid) {
      irisHost.replaceWith(preservedIris);
    } else {
      irisUnmount?.(); irisUnmount = null; irisCid = null;
      if (irisHost) {
        irisCid = state.me?.cid;
        irisUnmount = mountIrisChatCard(irisHost, {
          cid: state.me?.cid, clientName: h.businessName || state.me?.businessName || state.me?.displayName,
          email: state.me?.email, phone: state.me?.phone,
        });
      }
    }

    const changelogHost = el.querySelector("[data-changelog-card]");
    if (changelogHost && preservedChangelog) {
      changelogHost.replaceWith(preservedChangelog);
    } else {
      changelogUnmount?.(); changelogUnmount = null;
      if (changelogHost) changelogUnmount = mountChangelogCard(changelogHost);
    }

    const tailoredHost = el.querySelector("[data-tailored]");
    if (tailoredHost && preservedTailored && tailoredRo === ro) {
      tailoredHost.replaceWith(preservedTailored);
    } else {
      tailoredUnmount?.(); tailoredUnmount = null;
      if (tailoredHost) { tailoredRo = ro; tailoredUnmount = mountTailoredCards(tailoredHost, { readonly: ro }); }
    }

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

    // "I've done this" on the next step.
    el.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => {
      const n = (h.needs || []).find((x) => x.id === b.dataset.done); if (!n) return;
      setBusy(b, true);
      try {
        await api.needDone(n.id);
        marked.add(n.id);
        const p = document.createElement("p"); p.className = "small"; p.setAttribute("role", "status"); p.textContent = "Sent. Parker will check it off.";
        b.replaceWith(p);
      } catch (e) { setBusy(b, false); toast("Something went wrong. Please try again."); }
    }));
  }

  // Side data. Each is optional: a missing view or a feature that is off just leaves its card in the empty state.
  const quiet = () => {};
  const unAccount = data.subscribeAccount((a) => { account = a; if (last) paint(); }, quiet);
  const unProfile = data.subscribeProfile((p) => { profile = p; if (last) paint(); }, quiet);
  const unIdeas = state.home?.features?.ideas === false ? null
    : data.subscribeSuggestions((rows) => { ideas = rows; if (last) paint(); }, quiet);

  const teardownLive = live(el, "Home", data.subscribeHome, (h) => { last = h; paint(); });
  return () => {
    teardownLive(); unAccount?.(); unProfile?.(); unIdeas?.(); irisUnmount?.(); changelogUnmount?.(); tailoredUnmount?.();
    document.body.classList.remove("dash-fit");
  };
}
