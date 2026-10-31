// Modular Home (2026-10-30, pass 2): a compact grid of preview tiles; each opens its full content in a sheet.
// Tiles are real <button>s. The full content of every card sits in a hidden panel next to the grid
// ([data-panel="<key>"]); the sheet MOVES that node in while open and back out on close, so live content
// (Iris chat, Things to try feedback, capabilities list) keeps its listeners and state.
import { html, ic, mount } from "./ui.js";

/**
 * One preview tile. t = { key, icon, title, count, kicker?, headline?, line?, cta?, state?, extra?, wide? }
 * state: "ready" | "loading" | "empty" | "error". count is the short number ("5 ideas", "58/100", "Step 3 of 6").
 */
export function tileInnerHtml(t) {
  const busy = t.state === "loading";
  return html`<span class="mod-top"><span class="mod-ic" aria-hidden="true">${ic(t.icon || "info")}</span>
      <span class="mod-t">${t.title}</span>${t.count ? html`<span class="mod-count">${t.count}</span>` : ""}</span>
    <span class="mod-body" id="mod-${t.key}-d">${busy ? html`<span class="skel line w70" aria-hidden="true"></span><span class="skel line w40" aria-hidden="true"></span><span class="sr">Loading…</span>`
      : html`${t.kicker ? html`<span class="mod-k">${t.kicker}</span>` : ""}${t.headline ? html`<span class="mod-hl">${t.headline}</span>` : ""}${t.line ? html`<span class="mod-line">${t.line}</span>` : ""}`}</span>
    ${t.extra && !busy ? t.extra : ""}
    <span class="mod-go" aria-hidden="true">${t.cta || "Open"} ${ic("arrow-right")}</span>`;
}

const tileLabel = (t) => `${t.title}${t.count ? `, ${t.count}` : t.state === "loading" ? ", loading" : ""}`;

export function tileHtml(t) {
  return html`<li class="mod-cell mod-${t.key}${t.wide ? " is-wide" : ""}" data-cell="${t.key}">
    <button type="button" class="mod-tile is-${t.state || "ready"}" data-open="${t.key}" aria-haspopup="dialog"
      aria-label="${tileLabel(t)}" aria-describedby="mod-${t.key}-d">${tileInnerHtml(t)}</button></li>`;
}

/** Redraw one tile in place. The <button> itself stays, so focus (and the sheet's opener) survive. */
export function paintTile(root, t) {
  const b = root?.querySelector(`[data-open="${t.key}"]`);
  if (!b) return;
  b.className = `mod-tile is-${t.state || "ready"}`;
  b.setAttribute("aria-label", tileLabel(t));
  mount(b, tileInnerHtml(t));
}

/** A hidden panel: the full card. title/sub head the sheet. */
export function panelHtml(key, title, sub, body) {
  return html`<section class="mod-panel mod-panel-${key}" data-panel="${key}" data-title="${title}" data-sub="${sub || ""}">${body}</section>`;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The sheet. One per screen. root holds the tiles ([data-open]) and the panels ([data-panel]).
 * Desktop: a centered modal. Phones (<720px): a bottom sheet, full height when the content needs it.
 * Esc, the close button and a backdrop click close it; focus is trapped inside and goes back to the tile.
 * opts: onOpen(key), onClose(key), onFit(key) (the visible viewport changed while open, e.g. the keyboard).
 * Returns { open(key), close(), rebind(root), destroy(), get openKey() }.
 */
export function createSheet(root, opts = {}) {
  const dlg = document.createElement("dialog");
  dlg.className = "mod-sheet";
  dlg.setAttribute("aria-modal", "true");
  dlg.setAttribute("aria-labelledby", "mod-sheet-t");
  dlg.setAttribute("aria-describedby", "mod-sheet-s");
  mount(dlg, html`<div class="mod-sheet-in">
    <header class="mod-sheet-h"><span class="mod-grab" aria-hidden="true"></span>
      <div class="mod-sheet-ht"><h2 id="mod-sheet-t" tabindex="-1"></h2><p id="mod-sheet-s"></p></div>
      <button type="button" class="mod-x" data-sheet-close aria-label="Close">${ic("x")}</button></header>
    <div class="mod-sheet-b" data-sheet-body></div></div>`);
  document.body.appendChild(dlg);
  const body = dlg.querySelector("[data-sheet-body]");
  let key = null, panel = null, opener = null;

  // body scroll lock while open (html overflow; the sheet body scrolls on its own)
  const lock = (on) => document.documentElement.classList.toggle("mod-locked", on);

  // On-screen keyboard: the layout viewport keeps its height, the visual viewport shrinks (and may scroll).
  // --vvh = the height you can see, --kb = how much of the bottom is covered. The phone CSS lifts the sheet by
  // --kb and caps it at --vvh, so the Iris composer stays above the keyboard. Desktop ignores both.
  const fit = () => {
    const vv = window.visualViewport;
    if (!vv || !dlg.open) return;
    const kb = Math.max(0, Math.round(document.documentElement.clientHeight - vv.offsetTop - vv.height));
    dlg.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
    dlg.style.setProperty("--kb", `${kb}px`);
    dlg.classList.toggle("is-short", vv.height < 600);
    // the new height settles a frame later (seen in Chromium); tell the caller after that
    const k = key;
    requestAnimationFrame(() => requestAnimationFrame(() => { if (key === k) opts.onFit?.(k); }));
  };
  const watch = (on) => {
    const vv = window.visualViewport;
    if (!vv) return;
    for (const ev of ["resize", "scroll"]) vv[on ? "addEventListener" : "removeEventListener"](ev, fit);
  };
  function open(k, from) {
    const p = root.querySelector(`[data-panel="${k}"]`);
    if (!p) return;
    if (key) close({ restore: false });
    key = k; panel = p;
    opener = from || root.querySelector(`[data-open="${k}"]`);
    dlg.querySelector("#mod-sheet-t").textContent = p.dataset.title || "";
    const sub = dlg.querySelector("#mod-sheet-s");
    sub.textContent = p.dataset.sub || "";
    sub.hidden = !p.dataset.sub;
    dlg.dataset.key = k;
    body.replaceChildren(p);
    body.scrollTop = 0;
    lock(true);
    if (!dlg.open) dlg.showModal();
    fit(); watch(true);
    dlg.querySelector("#mod-sheet-t").focus({ preventScroll: true });
    opts.onOpen?.(k);
  }
  function close({ restore = true } = {}) {
    if (!key) return;
    const k = key;
    // the panel goes home (hidden), unless Home redrew meanwhile and its slot is gone
    const home = root.querySelector("[data-panels]");
    if (panel && home && root.isConnected) home.appendChild(panel); else panel?.remove();
    key = null; panel = null;
    if (dlg.open) dlg.close();
    watch(false);
    lock(false);
    if (restore) {
      const back = opener?.isConnected ? opener : root.querySelector(`[data-open="${k}"]`);
      back?.focus({ preventScroll: true });
    }
    opener = null;
    opts.onClose?.(k);
  }

  const onClick = (e) => {
    const t = e.target.closest?.("[data-open]");
    if (t && root.contains(t)) { e.preventDefault(); open(t.dataset.open, t); }
  };
  root.addEventListener("click", onClick);
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) { close(); return; } // the backdrop
    if (e.target.closest("[data-sheet-close]")) { close(); return; }
    // following a link inside the sheet (e.g. "Read it", "Message Parker") closes it first
    const a = e.target.closest("a[href]");
    if (a && !e.defaultPrevented && /^#\//.test(a.getAttribute("href") || "")) close({ restore: false });
  });
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    const f = [...dlg.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dlg.querySelector("#mod-sheet-t"))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  const onHash = () => close({ restore: false });
  addEventListener("hashchange", onHash);

  return {
    open, close,
    get openKey() { return key; },
    /** Home redrew: point at the new root. An open sheet swaps in the new panel for the same card. */
    rebind(newRoot) {
      root.removeEventListener("click", onClick);
      root = newRoot;
      root.addEventListener("click", onClick);
      if (!key) return;
      const fresh = root.querySelector(`[data-panel="${key}"]`);
      if (fresh && fresh !== panel) { panel?.remove(); panel = fresh; body.replaceChildren(fresh); }
      opener = root.querySelector(`[data-open="${key}"]`);
    },
    destroy() {
      if (key) close({ restore: false });
      root.removeEventListener("click", onClick);
      removeEventListener("hashchange", onHash);
      dlg.remove();
    },
  };
}

