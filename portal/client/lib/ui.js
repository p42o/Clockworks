import { SWAP } from "../swap-config.js";
// Small UI helpers: escaping html`` template, toast/announce/focus, CT date formatters, icons.

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"'`]/g, (c) => ESC[c]);

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
/** Mark a string as trusted markup (icons, pre-built html``). Never use with user data. */
export const raw = (s) => new Raw(String(s));

/** Tagged template: every interpolation is escaped unless raw() / nested html``; arrays are joined. */
export function html(strings, ...vals) {
  let out = "";
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) out += part(vals[i]);
  });
  return new Raw(out);
}
function part(v) {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(part).join("");
  if (v === null || v === undefined || v === false) return "";
  return esc(v);
}

/** Replace el's content with trusted/escaped markup produced by html``. */
export function mount(el, markup) {
  if (!(markup instanceof Raw)) markup = html`${markup}`;
  el.innerHTML = markup.s; // safe: built only from html`` (escaped) or raw() (trusted)
  return el;
}

// ---------- toast / announce / focus ----------
let toastTimer;
export function toast(msg) {
  const el = document.querySelector(".toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 4000);
}
export function announce(msg) {
  const el = document.getElementById("announcer");
  if (!el) return;
  el.textContent = "";
  setTimeout(() => { el.textContent = msg; }, 50);
}
export function focusHeading() {
  const h = document.querySelector("main h1") || document.querySelector("h1");
  if (!h) return;
  h.setAttribute("tabindex", "-1");
  h.focus({ preventScroll: false });
}

// ---------- dates (America/Chicago) ----------
const TZ = "America/Chicago";
export function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "object" && "seconds" in v) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
const fDT = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fD = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" });
const fDY = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
/** "Tue Oct 14, 3:10 PM CT" */
export function fmtDateTime(v) {
  const d = toDate(v); if (!d) return "";
  const parts = Object.fromEntries(fDT.formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.weekday} ${parts.month} ${parts.day}, ${parts.hour}:${parts.minute} ${parts.dayPeriod} CT`;
}
/** "Oct 14" */
export function fmtDate(v) { const d = toDate(v); return d ? fD.format(d) : ""; }
/** "Oct 14, 2026" */
export function fmtDateY(v) { const d = toDate(v); return d ? fDY.format(d) : ""; }
const dayKey = (d) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d).map((x) => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000; };
/** "due in 3 days" / "due today" / "overdue by 2 days" */
export function dueText(v, now = new Date()) {
  const d = toDate(v); if (!d) return "";
  const n = Math.round(dayKey(d) - dayKey(now));
  if (n === 0) return "due today";
  if (n === 1) return "due tomorrow";
  if (n > 1) return `due in ${n} days`;
  return `overdue by ${-n} day${n === -1 ? "" : "s"}`;
}

// ---------- icons: 24 viewBox, stroke, class "i" ----------
const P = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  intake: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h3"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  lightbulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  "chevron-right": '<path d="M9 5l7 7-7 7"/>',
  "chevron-left": '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  download: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  paperclip: '<path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  logout: '<path d="M10 4H5v16h5"/><path d="M15 8l4 4-4 4"/><path d="M19 12H9"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14 4l2-2"/><path d="M20 20v-5h-5"/>',
  "arrow-right": '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17v4M17 19h4"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>',
  store: '<path d="M4 9h16l-1.2-4H5.2z"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
  folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
  paper: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  upload: '<path d="M12 20V8"/><path d="M7 12l5-5 5 5"/><path d="M5 4h14"/>',
  support: '<path d="M4 12a8 8 0 1 1 3.3 6.5L4 20l1.4-3.3A8 8 0 0 1 4 12z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
};
/** Returns trusted svg markup (string). Wrap with raw() when interpolating into html``. */
export function icon(name) {
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[name] || P.info}</svg>`;
}
export const ic = (name) => raw(icon(name));

// ---------- clock dial (brand linework) ----------
/** Trusted SVG: a clock dial. size = viewBox edge; ticks every 6deg, majors every 30deg. Extra markup goes inside. */
export function dialTicks(size, r1, r2major, r2minor) {
  const c = size / 2; let out = "";
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 - 90) * Math.PI / 180, major = i % 5 === 0, r2 = major ? r2major : r2minor;
    const f = (n) => n.toFixed(2);
    out += `<line${major ? ' class="major"' : ""} x1="${f(c + r1 * Math.cos(a))}" y1="${f(c + r1 * Math.sin(a))}" x2="${f(c + r2 * Math.cos(a))}" y2="${f(c + r2 * Math.sin(a))}"/>`;
  }
  return `<g class="ticks">${out}</g>`;
}

// ---------- shared view bits ----------
export const skeleton = (n = 3) => html`<div class="stack" aria-busy="true"><span class="sr">Loading…</span>${Array.from({ length: n }, () => html`<div class="skel block"></div>`)}</div>`;
export const errorState = () => html`<div class="empty"><h2>We couldn't load this.</h2><p>Try again.</p><button type="button" class="btn" data-retry>${ic("refresh")} Try again</button><p class="small">Still stuck? <a href="mailto:${SWAP.contact.privacyEmail}">Email Parker</a>.</p></div>`;
/** Wire the retry button inside root to fn. */
export function onRetry(root, fn) { root.querySelector("[data-retry]")?.addEventListener("click", fn); }
export function setBusy(btn, busy) { if (!btn) return; btn.disabled = !!busy; btn.setAttribute("aria-busy", busy ? "true" : "false"); }

/** Show an error summary at the top of `host` and move focus to it. items: [{id?, msg}] */
export function showErrors(host, items) {
  host.querySelector(".error-summary")?.remove();
  if (!items.length) return;
  const el = document.createElement("div");
  el.className = "error-summary";
  el.setAttribute("role", "alert");
  el.tabIndex = -1;
  mount(el, html`<h2>Please fix this</h2><ul>${items.map((i) => html`<li>${i.id ? html`<a href="#${i.id}">${i.msg}</a>` : i.msg}</li>`)}</ul>`);
  host.prepend(el);
  el.querySelectorAll("a[href^='#']").forEach((a) => a.addEventListener("click", (ev) => { ev.preventDefault(); document.getElementById(a.getAttribute("href").slice(1))?.focus(); }));
  el.focus();
}
