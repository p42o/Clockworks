// Admin "View Customer Dashboard". Runs in an iframe inside the admin CRM, same origin.
// No Firebase here: the admin page reads the client's data with its own admin sign-in and posts it in.
// Everything is inert. Nothing on this page can write, send or sign.
import { html, mount, ic, toast } from "./ui.js";
import { SWAP } from "../swap-config.js";
import { LANDING_COPY } from "./clientCopy.js";
import { isIrisChatVisible, IRIS_AVATAR } from "./irisChat.js";
import { dashHtml, greetingFor, irisPreviewHtml, capsTile } from "./dash.js";
import { isTailoredVisible } from "./tailored.js";
import { createSheet, paintTile } from "./modular.js";
import { mountChangelogCard } from "../screens/changelog-card.js";

const app = document.getElementById("app");
const mark = () => '<svg class="mark" aria-hidden="true"><use href="#cw-mark"/></svg>';
let sheet = null;
// Tiles and the sheet's own controls work in the preview, so Parker can open every card. Nothing else does.
const OPENS = "[data-open], [data-sheet-close], [data-changelog-more]";
const fDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long", month: "short", day: "numeric" });

function render(m) {
  const h = m.home || {};
  const portalEnabled = h.access?.enabled !== false;
  const showIris = !!(SWAP.irisChat?.showOnHome && isIrisChatVisible({ cid: m.cid, stageKey: h.stageKey, portalEnabled }));
  const showChangelog = m.changelog?.visible !== false;
  // Shop Notes: the live (published) doc, or the draft when Parker opens "Preview draft". null = the empty state.
  const showTailored = m.tailoredDraft === true || isTailoredVisible({ cid: m.cid, portalEnabled });
  const ro = h.access?.mode === "readonly";
  const tabs = [["home", "Home", "home"], ["messages", "Support", "support"], ["account", "Settings", "settings"]]
    .filter(([k]) => !ro || k === "home" || k === "account");
  const name = m.firstName || "";
  mount(app, html`
    <a class="railbrand" href="#" aria-label="Clockworks home"><span><b>Clockworks<i>.</i></b><small>Client portal</small></span></a>
    <header class="appbar"><span class="brand" aria-hidden="true">Clockworks<i>.</i></span>
      <div class="who"><b>${h.businessName || "Clockworks"}</b><small>Client portal</small></div></header>
    <main id="main">
      <div class="dash-hello"><div><h1>${greetingFor()}${name ? html`, <em>${name}</em>` : h.businessName ? html`, <em>${h.businessName}</em>` : ""}</h1>
        <p class="lede">Here's how ${h.businessName || "your business"} looks online and what your agent team has for you.</p></div>
        <p class="dash-when"><span class="live-dot" aria-hidden="true"></span>${fDay.format(new Date())}</p></div>
      ${h.stageKey === "onhold" ? html`<div class="banner warn">${ic("clock")}<div>Things are paused. Message Parker any time.</div></div>` : ""}
      ${ro ? html`<div class="banner info">${ic("info")}<div>Our work together has wrapped up. You can still see your files and data here.</div></div>` : ""}
      ${(h.unread?.messages || 0) > 0 ? html`<div class="banner copper">${ic("chat")}<div><b>You have a reply</b>${h.unread.messages} new from Parker.</div></div>` : ""}
      ${dashHtml({ home: { ...h, stageLabel: SWAP.stageLabels[h.stageKey] || SWAP.stageLabels.unknown }, account: m.account, profile: m.profile, ideas: m.ideas || [], firstName: name, showIris, showChangelog, showTailored, tailored: m.tailored ?? null,
        // the admin reads the intake's "do not touch" answer and sends topic keys only; missing = unknown
        topicsOff: Array.isArray(m.topicsOff) ? m.topicsOff : null })}
      <p class="dash-landing">${LANDING_COPY}</p>
    </main>
    <nav class="tabbar" aria-label="Main">${tabs.map(([k, label, icon]) => html`<a href="#" data-tab="${k}"${k === "home" ? html` aria-current="page"` : ""}>${ic(icon)}<span>${label}</span></a>`)}</nav>`);
  // brand mark (trusted static svg)
  app.querySelector(".railbrand")?.insertAdjacentHTML("afterbegin", mark());
  const grid = app.querySelector("[data-mod]");
  const ch = app.querySelector("[data-changelog-card]");
  if (ch) mountChangelogCard(ch, { items: Array.isArray(m.changelog?.items) ? m.changelog.items : [], expanded: true, bare: true,
    onItems: (cs) => paintTile(app.querySelector("[data-mod]"), capsTile(cs)) });
  const iris = app.querySelector("[data-iris-chat]");
  if (iris) mount(iris, irisPreviewHtml(name, IRIS_AVATAR));
  app.querySelectorAll("button, input, textarea, select").forEach((el) => { if (!el.matches(OPENS)) el.disabled = true; });
  sheet?.destroy();
  sheet = grid ? createSheet(grid) : null;
}

// Read-only: links and forms never leave the page.
document.addEventListener("click", (e) => {
  const a = e.target.closest("a, button");
  if (!a || a.matches(OPENS)) return;
  e.preventDefault();
  toast("Preview only. This is what the client sees.");
}, true);
document.addEventListener("submit", (e) => e.preventDefault(), true);

addEventListener("message", (e) => {
  if (e.origin !== location.origin || e.source !== parent || e.data?.type !== "cw-dash-preview") return;
  try { render(e.data.model || {}); } catch (err) { console.debug("[cw] preview", err); mount(app, html`<main id="main"><h1>Preview failed</h1><p>Close and try again.</p></main>`); }
});
parent.postMessage({ type: "cw-dash-preview-ready" }, location.origin);
