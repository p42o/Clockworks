// Clockworks client portal: boot -> env check -> session -> router -> shell.
import { isLocalDev, isLiveSite, initFirebase } from "./lib/env.js";
import { html, mount, ic, raw, esc, dialTicks } from "./lib/ui.js";
import { SWAP } from "./swap-config.js";
import * as session from "./lib/session.js";
import * as router from "./lib/router.js";

document.querySelector('.skip')?.addEventListener('click', event => {
  event.preventDefault();
  const main = document.getElementById('main'); if(main) {main.tabIndex=-1;main.focus();}
});
const app = document.getElementById("app");
const markSvg = (cls) => raw(`<svg class="${cls}" aria-hidden="true"><use href="#cw-mark"/></svg>`);

// ---------- layouts ----------
let layout = null;      // 'shell' | 'gate'
let mainEl = null;

/** Router asks for a clean <main> in the right layout. */
function host(want) {
  if (layout !== want) {
    layout = want;
    if (want === "shell") {
      mount(app, html`
        <a class="railbrand" href="#/home" aria-label="Clockworks home">${markSvg("mark")}<span><b>Clockworks<i>.</i></b><small>Client portal</small></span></a>
        <header class="appbar"><span aria-hidden="true">${markSvg("mark")}</span><span class="brand" aria-hidden="true">Clockworks<i>.</i></span>
          <div class="who"><b data-biz>Clockworks</b><small>Client portal</small></div></header>
        <div data-offline></div>
        <main id="main"></main>
        <nav class="tabbar" aria-label="Main"></nav>`);
      renderTabs(); renderBar();
    } else {
      mount(app, html`
        <div class="gate">${gateDial()}<header>${markSvg("mark")}<b>Clockworks<i>.</i></b></header><div data-offline></div>${gateSide()}<main id="main" class="sheet"></main><footer><a href="mailto:${SWAP.contact.privacyEmail}">${SWAP.contact.privacyEmail}</a></footer></div>`);
    }
    updateOffline();
  }
  mainEl = document.getElementById("main");
  mainEl.textContent = "";
  enter(mainEl);
  window.scrollTo(0, 0);
  return mainEl;
}

// Entrance choreography: blocks rise once when a view first shows real content (not its skeleton).
// After that the class comes off, so live data repaints and "show more" never replay the animation.
let enterObs = null, enterTimer = null;
function enter(el) {
  enterObs?.disconnect(); clearTimeout(enterTimer);
  el.classList.remove("fade-in"); void el.offsetWidth; el.classList.add("fade-in");
  const settle = () => {
    if (!el.firstElementChild || el.querySelector('[aria-busy="true"]')) return;
    enterObs?.disconnect(); enterObs = null;
    enterTimer = setTimeout(() => el.classList.remove("fade-in"), 1600);
  };
  enterObs = new MutationObserver(settle);
  enterObs.observe(el, { childList: true });
  settle();
}

const gateDial = () => raw(`<svg class="gate-dial" viewBox="0 0 600 600" aria-hidden="true">${dialTicks(600, 292, 262, 278)}<circle cx="300" cy="300" r="120"/><circle cx="300" cy="300" r="14"/><line class="hand" x1="300" y1="300" x2="470" y2="110"/></svg>`);
function gateSide() {
  return html`<aside class="gate-side" aria-hidden="true" hidden>
    <span class="eyebrow">MN Clockworks · Client portal</span>
    <h2>Your business, <em>organized</em>.</h2>
    <p>One private place for your intake, files, and messages with Parker.</p>
    <ol><li><span><b>Open your invite</b><span>A link or a short code from Parker.</span></span></li>
      <li><span><b>Tell us about your business</b><span>Mostly taps. Saves as you go.</span></span></li>
      <li><span><b>Parker takes it from there</b><span>You'll see every step here.</span></span></li></ol>
  </aside>`;
}

// ---------- appbar / tabs ----------
function renderBar() {
  const b = app.querySelector("[data-biz]");
  if (b) b.textContent = session.state.home?.businessName || "Clockworks";
}
function renderTabs() {
  const nav = app.querySelector(".tabbar");
  if (!nav) return;
  const h = session.state.home || {};
  const f = h.features || {};
  const unread = h.unread || {};
  const intakeDone = ["submitted", "reviewed"].includes(h.intake?.status);
  void intakeDone;
  const tabs = [
    { key: "home", hash: "#/home", label: "Home", icon: "home", n: unread.ideas },
    { key: "messages", hash: "#/messages", label: "Support", icon: "support", feature: "messages", n: unread.messages },
    { key: "account", hash: "#/account", label: "Settings", icon: "settings" },
  ].filter((t) => !t.feature || f[t.feature] !== false)
   .filter((t) => session.state.status !== "readonly" || ["home", "account"].includes(t.key));
  mount(nav, html`${tabs.map((t) => html`<a href="${t.hash}" data-tab="${t.key}">${ic(t.icon)}<span>${t.label}</span>${t.n > 0 ? html`<span class="dot" aria-hidden="true">${t.n > 9 ? "9+" : t.n}</span><span class="sr">${t.n} new</span>` : ""}</a>`)}`);
  markCurrent();
}
function markCurrent() {
  const tab = router.current.route?.tab;
  app.querySelectorAll(".tabbar a").forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

// ---------- offline banner ----------
function updateOffline() {
  const slot = app.querySelector("[data-offline]");
  if (!slot) return;
  mount(slot, navigator.onLine ? html`` : html`<div class="offline" role="status">You're offline. Changes will wait until you're back.</div>`);
}
window.addEventListener("online", updateOffline);
window.addEventListener("offline", updateOffline);

// ---------- boot ----------
function gateScreen(title, body) {
  mount(app, html`<div class="gate">${gateDial()}<header>${markSvg("mark")}<b>Clockworks<i>.</i></b></header>
    <main id="main" class="sheet"><h1>${title}</h1><p>${body}</p></main><footer></footer></div>`);
  document.title = "Clockworks client portal";
}

async function boot() {
  if (!(isLocalDev() || isLiveSite()) || !initFirebase()) {
    // Not local: Firebase is never initialised. Production config is a later, gated decision.
    gateScreen("The client portal isn't open yet.", "If Parker sent you a link, check back soon or message him directly.");
    return;
  }
  await session.init();
  session.subscribe(() => { renderBar(); renderTabs(); });
  router.start({ host, onRoute: markCurrent });
}
boot().catch((e) => {
  console.debug("[cw] boot failed", e);
  gateScreen("Something went wrong.", "Please reload the page and try again.");
});
