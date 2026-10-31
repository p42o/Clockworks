
// Clockworks Portal · CRM. Admin-only; access and data shape are enforced by firebase/firestore.rules.
// On localhost it talks to the Firebase emulators unless the URL has ?prod.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, connectAuthEmulator, signInWithCredential } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator, terminate, clearIndexedDbPersistence,
  collection, collectionGroup, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, limit, serverTimestamp, Timestamp, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, connectStorageEmulator, ref as sref, listAll, getMetadata, getDownloadURL, uploadBytesResumable, deleteObject, updateMetadata } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { firebaseConfig } from "./config.js";
import { SWAP } from "../client/swap-config.js";
import { DEFAULT_FOLLOW_UP_GRACE_DAYS, followUpGraceDecision, graceAdminLine, shopPassKeepsPortalOpen, ymdChicago } from "../client/lib/followUpGrace.js";
import { onlinePresenceCardHtml } from "../client/lib/presenceAdmin.js";
import { fillPresenceFrame } from "../client/lib/presenceView.js";
import { topicsOff as intakeTopicsOff } from "../client/lib/topicGate.js";

const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const EMU = LOCAL && !new URLSearchParams(location.search).has("prod");
// Emulator data, Auth, and Functions are project demo-clockworks-v3. The hosted config stays
// clockworks-portal-pgs and is used only when this page is not on the local emulator.
const fb = initializeApp(EMU ? { ...firebaseConfig, projectId: "demo-clockworks-v3" } : firebaseConfig);
const auth = getAuth(fb);
const db = EMU ? initializeFirestore(fb, {}) : initializeFirestore(fb, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const storage = getStorage(fb);
const fns = getFunctions(fb, "us-central1");
if (EMU) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(fns, "127.0.0.1", 5001);
}
function callError(err) {
  return String(err?.message || "Something went wrong.")
    .replace(/^FirebaseError:\s*/i, "")
    .replace(/^Firebase:\s*/i, "")
    .replace(/\s*\(functions\/[a-z0-9-]+\)\.?$/i, "");
}
async function callFn(name, data) {
  // Prod and emulator both use httpsCallable; EMU connects the Functions emulator above.
  try {
    const res = await httpsCallable(fns, name)(data);
    return res.data;
  } catch (err) {
    const e = new Error(callError(err));
    e.code = err?.code || "";
    throw e;
  }
}

// ------------------------------------------------------------------ constants
// Parker stage remap 2026-10-23 (approved map). MAIN_COUNT = pipeline before Paused/Closed gap.
const STAGES = ["Lead", "Intake", "Deployment Prepped", "Deployment Complete", "Follow-Up", "Paused", "Closed"];
const MAIN_COUNT = 5; // Lead … Follow-Up
const MAIN = STAGES.slice(0, MAIN_COUNT);
const STAGE_SHORT = { "Deployment Prepped": "Prepped", "Deployment Complete": "Complete" };
const REPORTS = [
  { type: "agent-free", name: "Agent Team · Free", fam: "agent", cost: "~$0.50", time: "~2 min", desc: "From public signals: likely systems, likely tasks and hours, a compliance heads-up, a starter team sketch." },
  { type: "agent-full", name: "Agent Team · Full", fam: "agent", cost: "intake + call", time: "1–2 sessions", desc: "Intake + discovery: integration gap matrix, real-number ROI, full compliance review, roster proposal." },
  { type: "presence-full", name: "Online presence scan", fam: "presence", cost: "incl. in $499", time: "30–60 min", desc: "16 towns, 4 AI assistants, listings, website, domain, top fixes, receipts." },
];
const RTYPE = Object.fromEntries(REPORTS.map((r) => [r.type, r]));
const PILLARS = [["maps", "Maps"], ["reviews", "Reviews"], ["ai", "AI"], ["search", "Search"], ["listings", "Listings"], ["website", "Website"]];
const KINDS = ["Note", "Call", "Text", "Decision"];
const TECH_ST = { confirmed: "Confirmed", assumed: "Assumed", unknown: "Unknown" };
const INT_ST = { active: "On the path", asked: "Asked about", earlier: "Earlier idea" };
const band = (s) => (s >= 80 ? "Strong" : s >= 60 ? "Good" : s >= 40 ? "Fair" : "Needs work");
const bandCls = (s) => (s >= 60 ? "ok" : s >= 40 ? "warn" : "bad");
const PALETTE = ["#A8441F", "#3C5A4A", "#4A5A6A", "#7A5A1E", "#6E4A5E", "#56683A", "#8C4A3A"];
const DEAL_TYPES = [["audit", "Audit"], ["pilot", "Pilot"], ["managed", "Managed"], ["ai-team", "AI team"]];
const PAY_ST = [["unpaid", "Unpaid"], ["paid", "Paid"], ["refunded", "Refunded"]];
const INTAKE_ST = [["not-sent", "Not sent"], ["sent", "Sent"], ["returned", "Returned"], ["reviewed", "Reviewed"]];
const INTAKE_RANK = { "not-sent": 0, sent: 1, returned: 2, reviewed: 3 };
const LEAD_SRC = [["referral", "Referral"], ["outreach", "Outreach"], ["inbound", "Inbound"], ["alarm-network", "Alarm network"], ["other", "Other"]];
const AI_SETUP = [
  ["planSignedUp", "Plan signed up"],
  ["accessShared", "Systems access shared"],
  ["clientRoom", "Client room created"],
  ["templateFolder", "Template folder set up"],
  ["firstWorkflowLive", "First workflow live"],
  ["week1Review", "Week 1 review"],
];
const SCOPE_ROWS = [
  ["team_bots", "Agent crew"], ["presence", "Presence"], ["intake", "Intake"], ["tech_stack", "Tech stack"],
  ["vendors", "Contracts / vendors"], ["quotes", "Quotes"], ["seo_track", "SEO track"], ["household", "Household"],
];
const TOUCH_CH = [["Call", "Call"], ["Text", "Text"], ["Email", "Email"], ["In-person", "In-person"], ["DM", "DM"], ["Other", "Other"]];
const AGREE_ST = [["none", "None"], ["draft", "Draft"], ["sent", "Sent"], ["signed", "Signed"], ["expired", "Expired"]];
const MONEY_ST = [["unpaid", "Unpaid"], ["partial", "Partial"], ["paid", "Paid"], ["comp", "Comp"], ["na", "N/A"]];
const ACCESS_ST = [["shared", "Shared"], ["requested", "Requested"], ["revoked", "Revoked"], ["na", "N/A"]];
const ACCESS_LOGOS = [
  ["gmail", "Gmail"], ["gcal", "Google Calendar"], ["quo", "Quo"], ["discord", "Discord"], ["notion", "Notion"],
  ["slack", "Slack"], ["microsoft", "Microsoft 365"], ["apple", "Apple"], ["stripe", "Stripe"], ["venmo", "Venmo"],
  ["alarm", "Alarm.com"], ["generic", "Other"],
];
const TIME_KINDS = [["call", "Call"], ["text", "Text"], ["meeting", "Meeting"], ["build", "Build"], ["research", "Research"], ["admin", "Admin"], ["other", "Other"]];
const FACE_KINDS = new Set(["call", "text", "meeting"]);
const BUILD_KINDS = new Set(["build", "research", "admin"]);

const labelOf = (pairs, id, fb = id) => (pairs.find((x) => x[0] === id) || [id, fb])[1];

// path UI label ↔ schema. Presence is an opt-in module; Teams/Life are the defaults.
const PATH_OPTS = [["business", "Teams"], ["personal", "Life"]];
const PATH_HINT = { business: "Business crew", personal: "Your household" };
const ENGAGE_BUSINESS = [["teams", "Agent crew"], ["presence", "Presence scan"], ["audit", "Business audit"]];
const ALWAYS_MODULES = ["profile", "contacts", "intake", "files", "log", "next_steps"];
const MODULE_CATALOG = [
  "profile", "contacts", "intake", "files", "log", "next_steps",
  "team_bots", "presence", "tech_stack", "vendors", "seo_track", "quotes",
  "household", "events", "finance", "meals", "health", "shopping", "family",
];
const MODULE_LABELS = {
  team_bots: "Agent crew", presence: "Presence", tech_stack: "Tech stack", vendors: "Contracts / vendors",
  intake: "Intake", seo_track: "SEO track", quotes: "Quotes", household: "Household",
  events: "Events", finance: "Finance", meals: "Meals", health: "Health",
  shopping: "Shopping", family: "Family", profile: "Profile", contacts: "Contacts",
  files: "Files", log: "Log", next_steps: "Next steps",
};
const ON_STATUSES = new Set(["available", "active", "done"]);
function clientPath(c) { return c?.path === "personal" ? "personal" : "business"; }
function clientEngagement(c) {
  const p = clientPath(c);
  if (c?.engagement) return c.engagement;
  return p === "personal" ? "household" : "teams";
}
function pathLabel(path) { return labelOf(PATH_OPTS, path || "business"); }
function seedModules(path, engagement) {
  const p = path === "personal" ? "personal" : "business";
  const eng = p === "personal" ? "household" : (engagement || "teams");
  const st = Object.fromEntries(MODULE_CATALOG.map((id) => [id, { status: "off" }]));
  ALWAYS_MODULES.forEach((id) => { st[id] = { status: "active" }; });
  if (p === "personal") {
    st.household = { status: "active" };
    st.intake = { status: "active" };
    return st;
  }
  st.tech_stack = { status: "active" };
  st.vendors = { status: "active" };
  st.intake = { status: "active" };
  if (eng === "presence") {
    st.presence = { status: "active" };
    st.team_bots = { status: "available" };
  } else if (eng === "audit") {
    st.presence = { status: "available" };
    st.team_bots = { status: "available" };
  } else {
    st.team_bots = { status: "active" };
    st.presence = { status: "off" };
  }
  st.seo_track = { status: "off" };
  st.quotes = { status: "off" };
  return st;
}
function defaultModuleIds(path, engagement) {
  return Object.entries(seedModules(path, engagement)).filter(([, m]) => m.status !== "off").map(([id]) => id);
}
function hasModule(c, id) {
  const m = c?.modules?.[id];
  if (m) return ON_STATUSES.has(m.status);
  const path = c?.path || "business";
  const eng = c?.engagement || (path === "personal" ? "household" : "teams");
  return defaultModuleIds(path, eng).includes(id);
}
function defaultNextWhat(path, engagement, hasWebsite) {
  const p = path === "personal" ? "personal" : "business";
  const eng = p === "personal" ? "household" : (engagement || "teams");
  if (p === "personal") return hasWebsite ? "Send Life intake" : "Say hello and learn what they need";
  if (eng === "presence") return hasWebsite ? "Run a Presence scan" : "Say hello and learn what they need";
  return hasWebsite ? "Send intake / start agent crew onboarding" : "Say hello and learn what they need";
}
function reportModule(type) {
  const t = String(type || "");
  if (t.startsWith("presence")) return "presence";
  if (t.startsWith("agent")) return "team_bots";
  return "";
}
function mergeModules(existing, path, engagement) {
  const seed = seedModules(path, engagement);
  if (!existing || typeof existing !== "object") return seed;
  const out = { ...seed };
  for (const [id, m] of Object.entries(existing)) {
    const next = seed[id];
    const nextOn = next && next.status !== "off";
    const curOn = m && m.status && m.status !== "off";
    if (nextOn && curOn) out[id] = { ...m };
    else if (next) out[id] = next;
    else out[id] = m;
  }
  return out;
}
function blankClientDoc({ name, trade = "", town = "", website = "", email = "", stage = "Lead", phone = "", contacts = [], interests = [], path = "business", engagement }) {
  const p = path === "personal" ? "personal" : "business";
  const eng = p === "personal" ? "household" : (engagement || "teams");
  return {
    name, trade, town, website, email: email || "", stage, phone: phone || "", hq: "", towns: [], tags: [], brand: {},
    contacts, interests, tech: [], vendors: [],
    path: p, engagement: eng, modules: seedModules(p, eng),
    next: { what: defaultNextWhat(p, eng, !!website), due: "" },
    created: serverTimestamp(), updated: serverTimestamp(), lastTouch: serverTimestamp(),
  };
}
function moduleChipsHtml(c) {
  const path = clientPath(c);
  const eng = clientEngagement(c);
  const mods = c.modules || seedModules(path, eng);
  const skip = new Set();
  const chips = [];
  const engLabel = path === "personal" ? "Household" : labelOf(ENGAGE_BUSINESS, eng, "Agent crew");
  const engMod = path === "personal" ? "household" : eng === "presence" ? "presence" : "team_bots";
  const engSt = mods[engMod]?.status || "active";
  chips.push(`<span class="chip ${engSt === "done" ? "ok" : "acc"}">${esc(engLabel)}</span>`);
  skip.add(engMod);
  if (path === "personal") skip.add("household");
  const extras = Object.entries(mods).filter(([id, m]) => {
    if (skip.has(id) || !m || m.status === "off" || m.status === "available") return false;
    if (ALWAYS_MODULES.includes(id) && id !== "intake") return false;
    return true;
  });
  extras.forEach(([id, m]) => chips.push(`<span class="chip ${m.status === "done" ? "ok" : "acc"}">${esc(MODULE_LABELS[id] || id)}</span>`));
  const availId = mods.presence?.status === "available" && !skip.has("presence") ? "presence"
    : Object.keys(mods).find((id) => mods[id]?.status === "available" && !skip.has(id) && !(ALWAYS_MODULES.includes(id) && id !== "intake"));
  if (availId) chips.push(`<span class="chip dash">+ ${esc(MODULE_LABELS[availId] || availId)}</span>`);
  return chips.join("");
}

// ------------------------------------------------------------------ helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const daysUntil = (iso) => Math.round((new Date(iso + "T12:00:00") - new Date(todayISO() + "T12:00:00")) / 86400000);
const fmtDay = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); return `${MON[m - 1]} ${d}${y !== new Date().getFullYear() ? ", " + y : ""}`; };
const toDate = (ts) => (ts instanceof Timestamp ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : ts ? new Date(ts) : null);
const dayOf = (ts) => { const d = toDate(ts); return d ? `${MON[d.getMonth()]} ${d.getDate()}` : ""; };
function ago(ts) {
  const d = toDate(ts); if (!d) return "just now";
  const s = (Date.now() - d) / 1000;
  if (s < 90) return "just now"; if (s < 3600) return `${Math.round(s / 60)}m ago`; if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const n = Math.round(s / 86400); return n === 1 ? "yesterday" : n < 45 ? `${n}d ago` : `${Math.round(n / 30)}mo ago`;
}
const money = (n) => "$" + Math.round(n || 0).toLocaleString("en-US");
const initials = (name) => (name || "?").replace(/\(.*?\)/g, "").replace(/'s\b/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const colorOf = (c) => (c.brand && c.brand.color1) || PALETTE[[...(c.id || c.name || "")].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PALETTE.length];
const siteUrl = (w) => (w ? (w.startsWith("http") ? w : "https://" + w) : "");
const mailLink = (e) => (e ? `<a href="mailto:${esc(e)}" style="color:var(--accent-ink);text-decoration:none">${esc(e)}</a>` : "");
function dueInfo(next) {
  if (!next || !next.what) return { cls: "", label: "", rank: 9 };
  if (!next.due) return { cls: "nodate", label: "No date", rank: 3 };
  const n = daysUntil(next.due);
  if (n < 0) return { cls: "over", label: `${-n}d overdue`, rank: 0, sub: "due " + fmtDay(next.due) };
  if (n === 0) return { cls: "today", label: "Today", rank: 1 };
  return { cls: "", label: n === 1 ? "Tomorrow" : `${DAYS[new Date(next.due + "T12:00:00").getDay()]}`, rank: 2, sub: fmtDay(next.due) };
}
const quoteTotal = (q) => { const sub = (q.items || []).reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.price) || 0), 0); const disc = sub * (Number(q.discountPct) || 0) / 100; return { sub, disc, total: sub - disc }; };

const ICON = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.7.7 2.8 2.4 3.2 5.2"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-5"/>', file: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  out: '<path d="M15 4h4v16h-4M10 16l4-4-4-4M14 12H4"/>', eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  play: '<path d="M8 5v14l11-7z"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5S14.5 17.9 12 20.5C9.5 17.9 8.5 15.1 8.5 12S9.5 6.1 12 3.5z"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>', wrench: '<path d="M14.5 5.5a4 4 0 0 0 5 5L12 18l-3 3-3-3 3-3 7.5-7.5a4 4 0 0 1-2-2z"/>', spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  msg: '<path d="M4 5h16v11H9l-5 4z"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>', trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8 20h8"/>',
  box: '<path d="M3 8l9-4 9 4-9 4z"/><path d="M3 8v9l9 4 9-4V8"/><path d="M12 12v9M3 8l9 4 9-4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/>',
  more: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
};
const ic = (n, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ""}</svg>`;
const mark = (cls = "mark") => `<svg class="${cls}" viewBox="0 0 364 361" aria-hidden="true">${$("#cw-mark").innerHTML}</svg>`;

let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }
function confetti() {
  if (reduced) return;
  const c = document.createElement("canvas"); c.className = "confetti"; c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; document.body.appendChild(c);
  const x = c.getContext("2d"); x.scale(devicePixelRatio, devicePixelRatio);
  const cols = ["#BE4F24", "#E2703F", "#3C5A4A", "#8DB39E", "#C8901E", "#1A1916"];
  const ps = Array.from({ length: 90 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .42, vx: (Math.random() - .5) * 11, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 3, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, va: (Math.random() - .5) * .3 }));
  const t0 = performance.now();
  (function f(t) {
    x.clearRect(0, 0, innerWidth, innerHeight);
    ps.forEach((p) => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
    if (t - t0 < 1800) requestAnimationFrame(f); else c.remove();
  })(t0);
}
function countUp(root = document) {
  $$("[data-count]", root).forEach((el) => {
    const to = Number(el.dataset.count), pre = el.dataset.pre || "";
    if (reduced || !to) { el.textContent = pre + to.toLocaleString("en-US"); return; }
    const t0 = performance.now(), d = 900;
    const step = (t) => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = pre + Math.round(to * e).toLocaleString("en-US"); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

// ------------------------------------------------------------------ data (live)
const S = { clients: [], logs: {}, timeLogs: {}, reports: [], quotes: [], privacy: [], audit: {}, ready: false };
let unsubs = [], logUnsubs = {}, timeLogUnsubs = {};
function listen() {
  unsubs.push(onSnapshot(collection(db, "clients"), (snap) => {
    S.clients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    S.clients.forEach((c) => {
      if (!logUnsubs[c.id]) {
        logUnsubs[c.id] = onSnapshot(query(collection(db, "clients", c.id, "log"), orderBy("at", "desc"), limit(60)), (s) => { S.logs[c.id] = s.docs.map((d) => ({ id: d.id, client: c.id, ...d.data() })); refresh(); });
      }
      if (!timeLogUnsubs[c.id]) {
        timeLogUnsubs[c.id] = onSnapshot(query(collection(db, "clients", c.id, "timeLogs"), orderBy("at", "desc"), limit(40)), (s) => { S.timeLogs[c.id] = s.docs.map((d) => ({ id: d.id, client: c.id, ...d.data() })); refresh(); }, () => { S.timeLogs[c.id] = S.timeLogs[c.id] || []; });
      }
    });
    Object.keys(logUnsubs).forEach((id) => { if (!S.clients.find((c) => c.id === id)) { logUnsubs[id](); delete logUnsubs[id]; delete S.logs[id]; } });
    Object.keys(timeLogUnsubs).forEach((id) => { if (!S.clients.find((c) => c.id === id)) { timeLogUnsubs[id](); delete timeLogUnsubs[id]; delete S.timeLogs[id]; } });
    S.ready = true; refresh();
  }, (e) => toast("Couldn't load clients: " + e.code)));
  unsubs.push(onSnapshot(collectionGroup(db, "reports"), (s) => { S.reports = s.docs.map((d) => ({ id: d.id, client: d.ref.parent.parent.id, ...d.data() })); refresh(); }));
  unsubs.push(onSnapshot(collectionGroup(db, "quotes"), (s) => { S.quotes = s.docs.map((d) => ({ id: d.id, client: d.ref.parent.parent.id, ...d.data() })); refresh(); }));
  unsubs.push(onSnapshot(collection(db, "privacyRequests"), (s) => {
    S.privacy = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    refresh();
  }, () => { S.privacy = []; }));
  unsubs.push(onSnapshot(collectionGroup(db, "adminAudit"), (s) => {
    const by = {};
    s.docs.forEach((d) => {
      const cid = d.ref.parent.parent?.id;
      if (!cid) return;
      (by[cid] ||= []).push({ id: d.id, ...d.data() });
    });
    Object.values(by).forEach((rows) => rows.sort((a, b) => (toDate(b.at)?.getTime() || 0) - (toDate(a.at)?.getTime() || 0)));
    S.audit = by;
    refresh();
  }, () => { S.audit = {}; }));
}
function stopAll() { unsubs.forEach((f) => f()); unsubs = []; Object.values(logUnsubs).forEach((f) => f()); logUnsubs = {}; Object.values(timeLogUnsubs).forEach((f) => f()); timeLogUnsubs = {}; }
const client = (id) => S.clients.find((c) => c.id === id);
const allLogs = () => Object.values(S.logs).flat().sort((a, b) => (toDate(b.at) || 0) - (toDate(a.at) || 0));
const clientReports = (id) => S.reports.filter((r) => r.client === id).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
const clientQuotes = (id) => S.quotes.filter((q) => q.client === id).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
const latestPresence = (id) => clientReports(id).find((r) => r.type.startsWith("presence") && r.status === "published" && r.score != null);
const cref = (id) => doc(db, "clients", id);
const save = (id, patch) => updateDoc(cref(id), { ...patch, updated: serverTimestamp() }).catch((e) => { toast("Save failed: " + e.code); throw e; });
const logEntry = (id, text, kind = "Note", meta = null) => {
  const patch = { lastTouch: serverTimestamp() };
  if (meta && meta.channel) patch.lastTouchMeta = { channel: meta.channel, note: meta.note || "" };
  return Promise.all([addDoc(collection(cref(id), "log"), { at: serverTimestamp(), kind, text }), updateDoc(cref(id), patch)]);
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function accessLogoHtml(key, system) {
  const k = (key || "generic").toLowerCase();
  const label = system || labelOf(ACCESS_LOGOS, k, k);
  const ini = initials(label).slice(0, 2) || "?";
  const colors = { gmail: "#EA4335", gcal: "#4285F4", quo: "#5B5FC7", discord: "#5865F2", notion: "#111111", slack: "#4A154B", microsoft: "#00A4EF", apple: "#555555", stripe: "#635BFF", venmo: "#008CFF", alarm: "#E4572E", generic: "#6B7280" };
  return `<span class="acc-logo" style="--acc:${colors[k] || colors.generic}" title="${esc(label)}" aria-hidden="true">${esc(ini)}</span>`;
}
function moneyTruth(c) {
  const m = c.money;
  if (m && (m.status || m.owed != null || m.paid != null || m.home || m.nextInvoice)) return m;
  const p = c.payment || {};
  if (!(p.status || p.amount != null || p.date)) return null;
  return { owed: p.status === "paid" ? 0 : (p.amount ?? null), paid: p.status === "paid" ? (p.amount ?? null) : null, currency: "USD", nextInvoice: { amount: null, due: "", label: "" }, home: "", homeNote: "", status: p.status === "paid" ? "paid" : (p.status === "refunded" ? "na" : "unpaid"), _fromPayment: true };
}
function recomputeHours(rows) {
  let face = 0, build = 0, billable = 0, nonBillable = 0;
  for (const r of rows) {
    const h = Number(r.hours) || 0;
    if (FACE_KINDS.has(r.kind)) face += h;
    else if (BUILD_KINDS.has(r.kind)) build += h;
    else build += h;
    if (r.billable) billable += h; else nonBillable += h;
  }
  const round = (n) => Math.round(n * 10) / 10;
  return { total: round(face + build), face: round(face), build: round(build), billable: round(billable), nonBillable: round(nonBillable), updatedAt: serverTimestamp() };
}
async function persistHoursRollup(clientId) {
  const rows = S.timeLogs[clientId] || [];
  await save(clientId, { hours: recomputeHours(rows) });
}

// ------------------------------------------------------------------ auth
let me = null;
function renderGate(kind) {
  const denied = kind === "denied";
  $("#app").innerHTML = `<div class="gate" data-kind="${denied ? "denied" : "in"}">
    <div class="gate-bg" aria-hidden="true">
      <span class="gate-orb o1"></span>
      <span class="gate-orb o2"></span>
      <span class="gate-orb o3"></span>
      <div class="gate-grid"></div>
      <div class="gate-ticks"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    </div>
    <div class="card gate-card">
      <div class="gate-mark-wrap">
        <span class="gate-ring" aria-hidden="true"></span>
        <span class="gate-ring r2" aria-hidden="true"></span>
        ${mark("mark sweep gate-mark")}
      </div>
      <p class="gate-kicker">${denied ? "Access" : "MN Clockworks"}</p>
      <h1>${denied ? "Not on the list" : "Clockworks"}</h1>
      <p class="gate-lead">${denied
        ? `${esc(me.email)} is signed in, but this account doesn't have portal access.`
        : "Your clients, assessments and quotes. Sign in to get to work."}</p>
      ${denied
        ? `<button class="btn" id="out">Sign out</button>`
        : `<button class="btn p gate-cta" id="signin">Sign in with Google</button>`}
      ${EMU && !denied ? `<button class="btn link" id="devin">Emulator: sign in as Parker</button>` : ""}
      ${denied ? "" : `<p class="gate-foot"><span class="gate-pulse" aria-hidden="true"></span>Operator command center</p>`}
    </div>
  </div>`;
  if (denied) { $("#out").onclick = doSignOut; return; }
  $("#signin").onclick = async () => {
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    // Popup only. A redirect lands on the firebaseapp.com auth handler, and browsers that partition
    // storage (Safari, iOS, newer Chrome) lose its state: "Unable to process request due to missing initial state".
    try { await signInWithPopup(auth, p); } catch (e) {
      const c = e.code || "";
      if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return;
      toast(c === "auth/popup-blocked" ? "Allow pop-ups for mnclockworks.com, then tap Sign in again." : "Sign-in failed: " + (c || e.message));
    }
  };
  if (EMU) $("#devin").onclick = () => window.__portalDevSignIn();
}
async function doSignOut() {
  stopAll(); await signOut(auth);
  if (!EMU) { try { await terminate(db); await clearIndexedDbPersistence(db); } catch (e) {} location.reload(); }
}
window.__portalDevSignIn = EMU ? (email = "parks.phone@gmail.com") => signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: "test-" + email.replace(/\W/g, "-"), email, email_verified: true }))) : undefined;

onAuthStateChanged(auth, async (u) => {
  stopAll(); me = u;
  // Local preview: ?splash=1 forces the signed-out gate so motion can be reviewed without signing out.
  if (LOCAL && /(?:^|[?&])splash=1(?:&|$)/.test(location.search)) return renderGate("in");
  if (!u) return renderGate("in");
  const tok = await u.getIdTokenResult(true);
  // The rules decide who's an admin (claim or the allowlist kept in firestore.rules), so just try a read.
  const ok = tok.claims.admin === true || (await getDocs(query(collection(db, "clients"), limit(1))).then(() => true, () => false));
  if (!ok) return renderGate("denied");
  renderShell(); listen(); route();
});

// ------------------------------------------------------------------ shell
function renderShell() {
  const first = (me.displayName || "Parker").split(" ")[0];
  $("#app").innerHTML = `<div class="shell">
    <aside class="rail">
      <a class="brand" href="#/">${mark("mark sweep")}<span><b>Clockworks<i>.</i></b><small>Portal · CRM</small></span></a>
      <div class="nav-lbl">Workspace</div>
      <nav class="nav" id="nav">
        <a href="#/" data-r="dash">${ic("home")}Today</a>
        <a href="#/clients" data-r="clients">${ic("users")}Clients<span class="n" id="navClients"></span></a>
        <a href="#/assess" data-r="assess">${ic("gauge")}Assessments</a>
        <a href="#/quotes" data-r="quotes">${ic("file")}Money</a>
        <details class="nav-more"><summary>${ic("more")}More</summary>
          <a href="#/due" data-r="due">${ic("cal")}Due</a>
          <a href="#/assets" data-r="assets">${ic("box")}Assets</a>
          <a href="#/privacy" data-r="privacy">${ic("shield")}Privacy</a>
        </details>
      </nav>
      <div class="nav-lbl">Clients</div>
      <nav class="nav" id="navPins"></nav>
      <div class="grow"></div>
      <div class="clock"><b id="clk">--:--</b><small><span class="live" title="Live: changes sync as they happen" aria-hidden="true"></span><span id="clkd"></span></small></div>
      <div class="me"><span class="av">${me.photoURL ? `<img src="${esc(me.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc(initials(me.displayName || me.email))}</span><span><b>${esc(me.displayName || first)}</b><small>MN Clockworks</small></span><button id="out" title="Sign out" aria-label="Sign out">${ic("out")}</button></div>
    </aside>
    <div class="main">
      <header class="topbar">
        <a class="mobile-brand" href="#/" aria-label="Clockworks home">${mark("mark sweep")}</a>
        <div class="search">${ic("search")}<input id="q" type="search" placeholder="Search clients, contacts, tools…" autocomplete="off" aria-label="Search"><kbd class="desk">⌘K</kbd><div class="results" id="res" hidden></div></div>
        <span class="sp"></span>
        <button class="btn p desk" id="addTop">${ic("plus")}Add prospect</button>
        <button class="iconbtn" id="theme" aria-label="Switch light or dark">${ic("moon")}</button>
      </header>
      <main class="content" id="view"></main>
    </div>
    <nav class="tabbar" id="tabs">
      <a href="#/" data-r="dash">${ic("home")}Home</a><a href="#/clients" data-r="clients">${ic("users")}Clients</a>
      <button class="plus" id="addTab"><span class="b">${ic("plus")}</span>Prospect</button>
      <a href="#/assess" data-r="assess">${ic("gauge")}Assess</a>
      <button type="button" id="moreTab" data-r="more">${ic("more")}More</button>
    </nav></div>`;
  $("#out").onclick = doSignOut;
  $("#addTop").onclick = $("#addTab").onclick = () => addProspect();
  $("#moreTab").onclick = openMore;
  $("#theme").onclick = toggleTheme; paintThemeIcon();
  wireSearch(); tickClock(); setInterval(tickClock, 1000);
  document.addEventListener("keydown", (e) => {
    const typing = e.target.closest("input, textarea, select, [contenteditable]");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#q").focus(); $("#q").select(); }
    else if (!typing && e.key === "/") { e.preventDefault(); $("#q").focus(); }
    else if (!typing && e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !$("#modal").innerHTML) { e.preventDefault(); addProspect(); }
    else if (e.key === "Escape" && $("#modal").innerHTML) closeModal();
  });
}
function tickClock() {
  const d = new Date(), h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  const el = $("#clk"); if (!el) return;
  el.innerHTML = `${h % 12 || 12}<i>:</i>${m} <span style="font-size:12px;color:var(--rail-ink-2)">${h < 12 ? "AM" : "PM"}</span>`;
  $("#clkd").textContent = `${DAYS[d.getDay()]} · ${MON[d.getMonth()]} ${d.getDate()} · Maple Grove`;
}
const curTheme = () => document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
function toggleTheme() { const t = curTheme() === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; store.set("cw-portal-theme", t); paintThemeIcon(); }
function paintThemeIcon() { const b = $("#theme"); if (b) b.innerHTML = ic(curTheme() === "dark" ? "sun" : "moon"); }

// ------------------------------------------------------------------ search
function wireSearch() {
  const q = $("#q"), res = $("#res");
  let hi = 0, hits = [];
  const paint = () => {
    const t = q.value.trim().toLowerCase();
    if (!t) { res.hidden = true; return; }
    hits = [];
    S.clients.forEach((c) => {
      const hay = [c.name, c.trade, c.town, c.website, c.stage, c.email].join(" ").toLowerCase();
      if (hay.includes(t)) hits.push({ c, what: [c.trade, c.town, c.stage].filter(Boolean).join(" · ") });
      if (c.email && String(c.email).toLowerCase().includes(t) && !hits.some((h) => h.c === c && /^Email/.test(h.what))) hits.push({ c, what: `Email · ${c.email}` });
      (c.contacts || []).forEach((p) => { if ([p.name, p.role, p.email, p.phone].join(" ").toLowerCase().includes(t)) hits.push({ c, what: `Contact · ${p.name}${p.role ? " · " + p.role : ""}` }); });
      (c.tech || []).forEach((x) => { if ([x.name, x.category].join(" ").toLowerCase().includes(t)) hits.push({ c, what: `Tech stack · ${x.name}` }); });
      (c.interests || []).forEach((x) => { if (x.title.toLowerCase().includes(t)) hits.push({ c, what: `Interested in · ${x.title}` }); });
    });
    (S.logs ? allLogs() : []).forEach((l) => { if (hits.length < 12 && (l.text || "").toLowerCase().includes(t)) { const c = client(l.client); if (c) hits.push({ c, what: `Note · ${l.text.slice(0, 60)}${l.text.length > 60 ? "…" : ""}` }); } });
    hits = hits.slice(0, 10); hi = 0;
    res.innerHTML = hits.length ? hits.map((h, i) => `<a href="#/c/${esc(h.c.id)}" class="${i === hi ? "hi" : ""}"><span class="avatar" style="width:30px;height:30px;border-radius:9px;font-size:11px;background:${colorOf(h.c)}">${esc(initials(h.c.name))}</span><span><b>${esc(h.c.name)}</b><br><small>${esc(h.what)}</small></span><small>${esc(h.c.stage)}</small></a>`).join("")
      : `<div class="empty">Nothing matches “${esc(q.value)}”. <button class="btn link" id="resAdd">Add it as a prospect</button></div>`;
    res.hidden = false;
    const ra = $("#resAdd"); if (ra) ra.onclick = () => { const n = q.value; q.value = ""; res.hidden = true; addProspect({ name: n }); };
  };
  q.addEventListener("input", paint);
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); hi = (hi + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % Math.max(1, hits.length); $$("a", res).forEach((a, i) => a.classList.toggle("hi", i === hi)); }
    if (e.key === "Enter" && hits[hi]) { location.hash = "#/c/" + hits[hi].c.id; q.value = ""; res.hidden = true; q.blur(); }
    if (e.key === "Escape") { q.value = ""; res.hidden = true; q.blur(); }
  });
  res.addEventListener("click", (e) => { if (e.target.closest("a")) { q.value = ""; res.hidden = true; } });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) res.hidden = true; });
}

// ------------------------------------------------------------------ router
let R = { name: "dash", args: [] };
window.addEventListener("hashchange", () => { if ($("#view")) route(); });
function route() {
  const h = location.hash.replace(/^#\/?/, "").split("?")[0], parts = h.split("/").map(decodeURIComponent);
  R = parts[0] === "c" && parts[1] ? { name: "client", args: [parts[1]] }
    : parts[0] === "q" && parts[2] ? { name: "quote", args: [parts[1], parts[2]] }
    : ["clients", "assess", "quotes", "assets", "due", "privacy"].includes(parts[0]) ? { name: parts[0], args: [] } : { name: "dash", args: [] };
  if (R.name !== "quote") qDraft = null;
  window.scrollTo(0, 0);
  refresh(true);
}
let refreshQueued = false, entering = false, lastPainted = "", enterT, enterAt = 0;
function refresh(force) {
  if (!$("#view")) return;
  // Don't repaint under someone typing or with a dialog open; the next change or navigation will.
  if (!force && ($("#modal").innerHTML || document.activeElement?.closest("#view input, #view textarea, #view select"))) return;
  if (refreshQueued && !force) return;
  refreshQueued = true;
  requestAnimationFrame(() => { refreshQueued = false; paint(force); });
}
function paint(first) {
  const railR = R.name === "client" ? "clients" : R.name === "quote" ? "quotes" : R.name;
  const moreR = ["assets", "quotes", "quote", "due", "privacy", "settings", "more"];
  const tabR = R.name === "client" ? "clients" : moreR.includes(R.name) ? "more" : R.name;
  $$("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.r === railR));
  $$("#tabs [data-r]").forEach((a) => a.classList.toggle("on", a.dataset.r === tabR));
  $("#navClients").textContent = S.clients.length || "";
  $("#navPins").innerHTML = S.clients.slice().sort((a, b) => (toDate(b.lastTouch) || 0) - (toDate(a.lastTouch) || 0)).slice(0, 5)
    .map((c) => `<a href="#/c/${esc(c.id)}" class="${R.name === "client" && R.args[0] === c.id ? "on" : ""}"><span class="dot" style="background:${colorOf(c)}"></span>${esc(c.name.replace(/ \(.*\)/, ""))}</a>`).join("");
  if (!S.ready) { $("#view").innerHTML = `<div class="skel-wrap" aria-busy="true"><span class="sr">Loading your clients…</span><div class="skel line w40"></div><div class="skel line w60"></div><div class="skel-tiles"><div class="skel tile-s"></div><div class="skel tile-s"></div><div class="skel tile-s"></div><div class="skel tile-s"></div></div><div class="skel block"></div></div>`; return; }
  const v = $("#view");
  const scroll = window.scrollY;
  // Entrance motion only when the page itself changes, not on every live-data repaint.
  const key = R.name + "/" + R.args.join("/");
  const fresh = key !== lastPainted; lastPainted = key;
  // the first data snapshots land within a few hundred ms of opening; let those repaints keep the entrance too
  entering = fresh || performance.now() - enterAt < 450;
  if (fresh) { enterAt = performance.now(); v.classList.remove("enter"); void v.offsetWidth; v.classList.add("enter"); clearTimeout(enterT); enterT = setTimeout(() => v.classList.remove("enter"), 1200); }
  ({ dash: viewDash, clients: viewClients, client: viewClient, assess: viewAssess, quotes: viewQuotes, quote: viewQuote, assets: viewAssets, due: viewDue, privacy: viewPrivacy }[R.name])(v);
  if (!first) window.scrollTo(0, scroll);
  if (first) countUp(v); else $$("[data-count]", v).forEach((el) => (el.textContent = (el.dataset.pre || "") + Number(el.dataset.count).toLocaleString("en-US")));
}

// ------------------------------------------------------------------ customer dashboard preview
// Read-only: the client's own Home, rendered by the client app's lib/dash.js inside an iframe.
// Data comes from the same clientView docs the client reads; admin rules already allow these reads.
const plainData = (v) => v == null ? v : typeof v.toDate === "function" ? v.toDate() : Array.isArray(v) ? v.map(plainData)
  : (typeof v === "object" && !(v instanceof Date)) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plainData(x)])) : v;
async function customerModel(cid) {
  const view = async (n) => { try { const s = await getDoc(doc(db, "clients", cid, "clientView", n)); return s.exists() ? plainData(s.data()) : null; } catch { return null; } };
  const [home, account, profile] = await Promise.all([view("home"), view("account"), view("profile")]);
  let ideas = [];
  if (home && home.features?.ideas !== false) {
    try { ideas = (await getDocs(query(collection(db, "clients", cid, "suggestions"), orderBy("publishedAt", "desc"), limit(20)))).docs
      .map((d) => ({ id: d.id, ...plainData(d.data()) })).filter((x) => !x.state || x.state === "published"); } catch { ideas = []; }
  }
  let firstName = "";
  try { const u = (await getDocs(query(collection(db, "clientUsers"), where("cid", "==", cid), limit(1)))).docs[0]?.data();
    firstName = u?.firstName || String(u?.contactName || u?.displayName || "").trim().split(/\s+/)[0] || ""; } catch { firstName = ""; }
  let changelog = { visible: true, items: [] };
  try { changelog = await callFn("adminChangelogPreview", { cid }); } catch { changelog = { visible: true, items: [], failed: true }; }
  // Shop Notes: only a PUBLISHED doc shows, same as the client's rules; anything else previews as the empty state.
  let tailored = null;
  try { const t = await getDoc(doc(db, "clients", cid, "tailored", "current")); tailored = t.exists() && t.data().status === "published" ? plainData(t.data()) : null; } catch { tailored = null; }
  // Agent Newsletter gating, same as the client's Home: topic keys from the newest intake's "do not touch" answer
  // (admin read). Only the keys go into the preview, never the answer text. null = could not read (preview shows neutral ideas).
  let topicsOff = [];
  try {
    const ins = (await getDocs(collection(db, "clients", cid, "intakes"))).docs
      .sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0));
    if (ins[0]) { const a = await getDoc(doc(db, "clients", cid, "intakes", ins[0].id, "answers", "d_never")); topicsOff = intakeTopicsOff(a.exists() ? a.data().value : ""); }
  } catch { topicsOff = null; }
  return { cid, home, account, profile, ideas, firstName, changelog, tailored, topicsOff };
}
/** opts.tailoredDraft: render this draft as if published (Shop Notes review). */
async function openCustomerDashboard(c, opts = {}) {
  document.querySelector(".cdash")?.remove();
  const wrap = document.createElement("div");
  wrap.className = "cdash"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-label", `Customer dashboard for ${c.name}`);
  wrap.innerHTML = `<header class="cdash-bar"><span class="chip ok"><span class="d"></span>Read only</span><b>What ${esc(c.name)} sees</b><small class="cdash-note">Loading…</small><span class="sp"></span>
    <div class="cdash-size" role="group" aria-label="Screen size"><button type="button" data-w="" aria-pressed="true">Desktop</button><button type="button" data-w="390" aria-pressed="false">Phone</button></div>
    <button type="button" class="btn sm" data-close>${ic("x")}Close</button></header>
    <div class="cdash-stage"><iframe title="Customer dashboard preview" src="/portal/client/preview.html?v=counsel-20261030"></iframe></div>`;
  document.body.appendChild(wrap); document.body.classList.add("cdash-open");
  const frame = wrap.querySelector("iframe"), note = wrap.querySelector(".cdash-note");
  const close = () => { removeEventListener("message", onMsg); removeEventListener("keydown", onKey); wrap.remove(); document.body.classList.remove("cdash-open"); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  let model = null, ready = false;
  const send = () => { if (model && ready) frame.contentWindow.postMessage({ type: "cw-dash-preview", model }, location.origin); };
  const onMsg = (e) => { if (e.origin === location.origin && e.source === frame.contentWindow && e.data?.type === "cw-dash-preview-ready") { ready = true; send(); } };
  addEventListener("message", onMsg); addEventListener("keydown", onKey);
  wrap.querySelector("[data-close]").onclick = close;
  wrap.querySelectorAll("[data-w]").forEach((b) => (b.onclick = () => {
    wrap.querySelectorAll("[data-w]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    wrap.querySelector(".cdash-stage").classList.toggle("phone", !!b.dataset.w);
  }));
  wrap.querySelector("[data-close]").focus();
  model = await customerModel(c.id);
  if (opts.tailoredDraft) model = { ...model, tailored: { ...opts.tailoredDraft, status: "published" }, tailoredDraft: true };
  note.textContent = opts.tailoredDraft ? "DRAFT Shop Notes shown as if published. The client cannot see this yet." : !model.home ? "No portal yet: the client has not been set up, so they would see an empty Home."
    : model.changelog?.failed ? "Capabilities list could not load; the rest is live." : "Live data, exactly as rendered for the client.";
  send();
}

// ------------------------------------------------------------------ Shop Notes + Things to try (tailored dashboard)
// Reads clients/{cid}/tailored/{draft,current} with the admin's own sign-in (rules: admin read, no browser writes).
// Every write is a Function: adminTailoredGenerate (draft) and adminTailoredPublish (published | hidden | draft).
const tailoredSt = {};
async function loadTailored(cid, force) {
  const st = tailoredSt[cid];
  if (st && !force && (st.loading || st.loaded)) return;
  tailoredSt[cid] = { ...(st || {}), loading: true };
  try {
    const [d, cur] = await Promise.all([getDoc(doc(db, "clients", cid, "tailored", "draft")), getDoc(doc(db, "clients", cid, "tailored", "current"))]);
    tailoredSt[cid] = { loaded: true, draft: d.exists() ? plainData(d.data()) : null, current: cur.exists() ? plainData(cur.data()) : null };
  } catch (e) { tailoredSt[cid] = { loaded: true, err: callError(e) }; }
  refresh();
}
const tlFlagOn = (cid) => { const a = SWAP.tailoredDashboard?.allowClientIds || []; return SWAP.tailoredDashboard?.showOnHome === true && (a.includes("*") || a.includes(cid)); };
const TL_FB = { done: ["ok", "Done"], not_for_me: ["dash", "Not for me"] };
function tailoredIssueHtml(d, live) {
  const fb = d.feedback || {};
  return `<div class="tl-issue">
    <p class="tl-issue-h"><b>No. ${esc(d.issueNo)}</b> · ${esc(fmtDay(d.issueDate))} · <span class="mono">${esc(d.generator || "template")}</span>${d.polishNote ? ` · <span class="chip warn mini">${esc(d.polishNote.replace(/_/g, " "))}</span>` : ""}</p>
    <ol class="tl-issue-secs">${(d.digest?.sections || []).map((x) => `<li><small>${esc(x.kicker)}</small><b>${esc(x.heading)}</b></li>`).join("")}</ol>
    <p class="tl-issue-k">Things to try</p>
    <ol class="tl-issue-tips">${(d.tips || []).map((t) => `<li><b>${esc(t.title)}</b> <span class="chip mini">${esc(t.category)}</span>${live && fb[t.id] ? ` <span class="chip mini ${TL_FB[fb[t.id].state]?.[0] || ""}">${esc(TL_FB[fb[t.id].state]?.[1] || fb[t.id].state)}</span>` : ""}</li>`).join("")}</ol>
    ${d.sources ? `<details class="tl-src"><summary>Where each line came from</summary><dl>${d.sources.map((x) => `<dt class="mono">${esc(x.for)}</dt><dd class="mono">${x.paths.map(esc).join("<br>") || "—"}</dd>`).join("")}</dl></details>` : ""}
  </div>`;
}
function tailoredPanelHtml(c) {
  const st = tailoredSt[c.id];
  const head = `<div class="ph"><h2 id="tl-admin-h">Shop Notes &amp; Things to try <small>in-dashboard only · nothing is emailed</small></h2>${st?.loaded ? `<button type="button" class="btn sm ghost" data-tl="reload">Reload</button>` : ""}</div>`;
  if (!st?.loaded) { loadTailored(c.id); return `<section class="panel tl-admin" aria-labelledby="tl-admin-h" aria-busy="true">${head}<div class="pb"><div class="skel line w60"></div></div></section>`; }
  if (st.err) return `<section class="panel tl-admin" aria-labelledby="tl-admin-h">${head}<div class="pb"><div class="empty-note">Couldn't load Shop Notes: ${esc(st.err)}</div></div></section>`;
  const { draft, current } = st;
  const busy = st.busy ? " disabled aria-busy=\"true\"" : "";
  const liveChip = !current ? `<span class="chip dash">Nothing published</span>`
    : current.status === "published" ? `<span class="chip ok"><span class="d"></span>Live on their Home · No. ${esc(current.issueNo)}</span>`
    : `<span class="chip warn">Hidden · No. ${esc(current.issueNo)}</span>`;
  return `<section class="panel tl-admin" id="tailored-admin" aria-labelledby="tl-admin-h">${head}<div class="pb">
    <p class="tl-lead">Built only from this client's own record: CRM fields, published presence scans, intake answers, portal stage, and the shared changelog cache. Review, then publish. ${tlFlagOn(c.id) ? "" : `<b>Not switched on for this client</b> (swap-config <span class="mono">tailoredDashboard.allowClientIds</span>), so publishing stores it but their Home won't show it yet.`}</p>
    <div class="tl-cols">
      <div><p class="tl-col-k">Live ${liveChip}</p>
        ${current ? tailoredIssueHtml(current, true) : `<div class="empty-note">They see a calm "not ready yet" card${tlFlagOn(c.id) ? "" : " (once switched on)"}.</div>`}
        <div class="tl-acts">${current?.status === "published" ? `<button type="button" class="btn sm" data-tl="preview-live"${busy}>${ic("eye")}Preview</button><button type="button" class="btn sm" data-tl="hidden"${busy}>Hide</button><button type="button" class="btn sm ghost" data-tl="draft"${busy}>Back to draft</button>` : ""}${current && current.status !== "published" && !draft ? `<button type="button" class="btn sm p" data-tl="published"${busy}>Show again</button>` : ""}</div></div>
      <div><p class="tl-col-k">Draft ${draft ? `<span class="chip data">Draft · No. ${esc(draft.issueNo)}</span>` : `<span class="chip dash">None</span>`}</p>
        ${draft ? tailoredIssueHtml(draft, false) : `<div class="empty-note">Generate a draft from what's on file. It stays private until you publish.</div>`}
        <div class="tl-acts"><button type="button" class="btn sm${draft ? "" : " p"}" data-tl="generate"${busy}>${ic("bolt")}${draft ? "Regenerate" : "Generate draft"}</button>
          <label class="tl-polish"><input type="checkbox" data-tl-polish${st.polish ? " checked" : ""}> Wording pass (x.ai, if the key is bound)</label>
          ${draft ? `<button type="button" class="btn sm" data-tl="preview-draft"${busy}>${ic("eye")}Preview draft</button><button type="button" class="btn sm p" data-tl="published"${busy}>${ic("check")}Publish</button>` : ""}</div></div>
    </div>
  </div></section>`;
}
async function tailoredAction(c, act) {
  const st = tailoredSt[c.id] || {};
  if (act === "reload") return loadTailored(c.id, true);
  if (act === "preview-draft" && st.draft) return openCustomerDashboard(c, { tailoredDraft: st.draft });
  if (act === "preview-live") return openCustomerDashboard(c);
  const short = c.name.replace(/ \(.*\)/, "");
  if (act === "published" && !window.confirm(`Publish these Shop Notes to ${short}'s Home? They can read them right away. Nothing is emailed.`)) return;
  tailoredSt[c.id] = { ...st, busy: true }; refresh(true);
  try {
    if (act === "generate") {
      const r = await callFn("adminTailoredGenerate", { cid: c.id, polish: !!st.polish });
      toast(`Draft No. ${r.issueNo} ready · ${r.tips} things to try${r.polishNote ? " · wording pass skipped" : ""}`);
    } else {
      const r = await callFn("adminTailoredPublish", { cid: c.id, status: act });
      toast(r.status === "published" ? `Live on ${short}'s Home.` : r.status === "hidden" ? "Hidden from their Home." : "Moved back to draft. Hidden from their Home.");
    }
  } catch (e) { toast(e.message || "Something went wrong."); }
  tailoredSt[c.id] = { ...tailoredSt[c.id], busy: false };
  await loadTailored(c.id, true);
}

// ------------------------------------------------------------------ dashboard
function milestones() {
  const pub = S.reports.filter((r) => r.status === "published").sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const created = S.clients.map((c) => toDate(c.created)).filter(Boolean).sort((a, b) => a - b);
  const pastMeeting = S.clients.filter((c) => { const i = STAGES.indexOf(c.stage); return i > 1 && i < MAIN_COUNT; });
  const sent = S.quotes.filter((q) => q.kind === "quote" && ["sent", "accepted"].includes(q.status));
  const paid = S.quotes.filter((q) => q.kind === "invoice" && q.status === "paid");
  const meeting = S.clients.find((c) => c.stage === "Intake");
  return [
    { t: "First prospect added", done: S.clients.length > 0, when: created[0] ? dayOf(created[0]) : "", hint: "Add someone you'd like to help." },
    { t: "First assessment published", done: pub.length > 0, when: pub[0] ? fmtDay(pub[0].date) : "", hint: "Queue an Agent Team report for a prospect.", sub: pub[0] ? `${client(pub[0].client)?.name || ""} · ${pub[0].score ?? ""}` : "" },
    { t: "First sit-down held", done: pastMeeting.length > 0, when: "", hint: meeting ? `${meeting.name} agreed to talk. Lock in the date.` : "Book a conversation with a prospect." },
    { t: "First quote sent", done: sent.length > 0, when: sent[0] ? fmtDay(sent[0].date) : "", hint: "Draft the pilot quote after the sit-down." },
    { t: "First paid invoice", done: paid.length > 0, when: paid[0] ? fmtDay(paid[0].paidDate || paid[0].date) : "", hint: "The pilot pays for itself. This is the big one." },
    { t: "Five prospects in the pipeline", done: S.clients.length >= 5, when: "", hint: `${S.clients.length} of 5 so far.`, sub: "" },
  ];
}
function moves(days) { const since = Date.now() - days * 86400000; return allLogs().filter((l) => (toDate(l.at) || 0) >= since); }
function spark(daysBack = 14) {
  const counts = Array(daysBack).fill(0), now = new Date(todayISO() + "T23:59:59");
  allLogs().forEach((l) => { const d = toDate(l.at); if (!d) return; const i = daysBack - 1 - Math.floor((now - d) / 86400000); if (i >= 0 && i < daysBack) counts[i]++; });
  const max = Math.max(1, ...counts), w = 88 / daysBack;
  return `<svg class="spark" viewBox="0 0 88 30" aria-hidden="true">${counts.map((n, i) => `<rect x="${(i * w + .6).toFixed(1)}" y="${(30 - Math.max(2, (n / max) * 28)).toFixed(1)}" width="${(w - 1.4).toFixed(1)}" height="${Math.max(2, (n / max) * 28).toFixed(1)}" rx="1.2" fill="${i === daysBack - 1 ? "var(--accent)" : n ? "var(--data)" : "var(--surface-3)"}"/>`).join("")}</svg>`;
}
function viewDash(v) {
  const d = new Date(), h = d.getHours();
  const greet = h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = (me.displayName || "Parker").split(" ")[0];
  const pub = S.reports.filter((r) => r.status === "published");
  const nextSet = S.clients.filter((c) => c.next && c.next.what);
  const over = S.clients.filter((c) => dueInfo(c.next).cls === "over");
  const week = moves(7);
  const openQ = S.quotes.filter((q) => q.kind === "quote" && ["draft", "sent"].includes(q.status));
  const unpaid = S.quotes.filter((q) => q.kind === "invoice" && q.status === "unpaid");
  const active = S.clients.filter((c) => ["Deployment Prepped", "Deployment Complete", "Follow-Up"].includes(c.stage));
  const leads = S.clients.filter((c) => { const i = STAGES.indexOf(c.stage); return i >= 0 && i < 3; });
  const lines = ["Every client starts as a conversation.", "Small, steady moves add up.", "One good sit-down can change the month.", "You're building something real here.", "The best time to follow up is today."];
  const line = lines[(d.getDate() + d.getMonth()) % lines.length];
  const summary = S.clients.length === 0 ? "A clean slate. Add your first prospect and let's get moving."
    : `${S.clients.length} ${S.clients.length === 1 ? "prospect" : "prospects"} in motion${pub.length ? `, ${pub.length === 1 ? "your first assessment is live" : pub.length + " assessments published"}` : ""}${over.length ? `, and ${over.length} follow-up${over.length > 1 ? "s" : ""} waiting on you` : ""}. ${line}`;
  const ms = milestones(), done = ms.filter((m) => m.done).length, nowI = ms.findIndex((m) => !m.done);
  const C = 2 * Math.PI * 31, off = C * (1 - done / ms.length);
  const meeting = S.clients.find((c) => c.stage === "Intake");
  const latestPub = pub.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const stepAct = [
    `<button class="btn sm p" data-add>${ic("plus")}Add a prospect</button>`,
    `<a class="btn sm p" href="#/assess">${ic("spark")}Start an agent crew</a>`,
    meeting ? `<a class="btn sm p" href="#/c/${esc(meeting.id)}">${ic("cal")}Open ${esc(meeting.name.replace(/ \(.*\)/, ""))}</a>` : `<a class="btn sm p" href="#/clients">${ic("users")}Pick someone</a>`,
    `<button class="btn sm p" data-newquote>${ic("file")}Draft the quote</button>`,
    `<a class="btn sm p" href="#/quotes">${ic("file")}Open quotes</a>`,
    `<button class="btn sm p" data-add>${ic("plus")}Add a prospect</button>`,
  ];
  const gauge = (s) => { const g = 2 * Math.PI * 15; return `<svg class="gauge" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="15" fill="none" stroke="var(--surface-3)" stroke-width="5"/><circle cx="20" cy="20" r="15" fill="none" stroke="var(--${bandCls(s)}-fill)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${g.toFixed(1)}" stroke-dashoffset="${(g * (1 - s / 100)).toFixed(1)}" transform="rotate(-90 20 20)"/><text x="20" y="24.5" text-anchor="middle">${s}</text></svg>`; };

  // next moves: real next steps first, then a couple of friendly suggestions
  const q = S.clients.filter((c) => c.next && c.next.what).map((c) => ({ c, d: dueInfo(c.next) })).sort((a, b) => a.d.rank - b.d.rank || (a.c.next.due || "").localeCompare(b.c.next.due || ""));
  const ideas = [];
  const noScan = S.clients.find((c) => hasModule(c, "presence") && c.website && !clientReports(c.id).some((r) => r.type.startsWith("presence")));
  if (noScan) ideas.push({ t: `Online presence scan included for ${noScan.name}`, sub: "The online presence scan is included in the $499 package.", act: `<a class="btn sm" href="#/assess?client=${esc(noScan.id)}&type=presence-full">Open</a>` });
  if (S.clients.length < 5) ideas.push({ t: `Add prospect #${S.clients.length + 1}`, sub: "A plumber, electrician or HVAC shop you already know. Warm intros win.", act: `<button class="btn sm" data-add>Add</button>` });
  const noInt = S.clients.find((c) => !(c.interests || []).length);
  if (noInt && ideas.length < 2) ideas.push({ t: `Note what ${noInt.name.replace(/ \(.*\)/, "")} cares about`, sub: "Even one line helps you walk in prepared.", act: `<a class="btn sm" href="#/c/${esc(noInt.id)}">Open</a>` });

  const feed = allLogs().slice(0, 7);
  const kindIcon = (k, t) => (/published|report/i.test(t) ? ["ok", "check"] : k === "Call" ? ["acc", "phone"] : k === "Text" ? ["acc", "msg"] : k === "Decision" ? ["data", "flag"] : /^Stage/.test(t) ? ["data", "flag"] : ["", "pen"]);

  v.innerHTML = `
  <section class="hello dash-hello">
    <div><div class="date">${DAYS[d.getDay()]} · ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}</div><h1>${greet}, <em>${esc(first)}</em>.</h1><p>${esc(summary)}</p></div>
    <div class="acts"><a class="btn p" href="#/assess">${ic("spark")}Start an agent crew</a><button class="btn" data-add>${ic("plus")}Add a prospect</button>${S.clients.some((c) => hasModule(c, "presence")) ? `<a class="btn ghost" href="#/assess?type=presence-full">${ic("globe")}Online presence scan</a>` : ""}</div>
  </section>

  <section class="tiles">
    <a class="panel tile" href="#/clients" style="text-decoration:none"><span class="lbl">${ic("users")}Prospects &amp; clients</span><span class="row1"><span class="big" data-count="${S.clients.length}">${S.clients.length}</span><span class="stack">${S.clients.slice(0, 4).map((c) => `<span style="background:${colorOf(c)}">${esc(initials(c.name))}</span>`).join("")}</span></span><span class="sub">${active.length ? `<b>${active.length} active</b> · ` : ""}${leads.length} in the pipeline</span></a>
    <a class="panel tile" href="#/assess" style="text-decoration:none"><span class="lbl">${ic("gauge")}Assessments published</span><span class="row1"><span class="big" data-count="${pub.length}">${pub.length}</span>${latestPub && latestPub.score != null ? gauge(latestPub.score) : ""}</span><span class="sub">${latestPub ? `Latest: ${esc(client(latestPub.client)?.name || "")}` : "Your first one is a click away"}</span></a>
    ${openQ.length || unpaid.length
      ? `<a class="panel tile" href="#/quotes" style="text-decoration:none"><span class="lbl">${ic("file")}Quotes out</span><span class="big" data-count="${Math.round(openQ.reduce((a, x) => a + quoteTotal(x).total, 0))}" data-pre="$">${money(openQ.reduce((a, x) => a + quoteTotal(x).total, 0))}</span><span class="sub">${openQ.length} open${unpaid.length ? ` · ${money(unpaid.reduce((a, x) => a + quoteTotal(x).total, 0))} to collect` : ""}</span></a>`
      : `<button class="panel tile cta" data-newquote><span class="lbl">${ic("file")}Quotes</span><span class="big">Draft your first quote <span class="arr">→</span></span><span class="sub">When a sit-down lands, the pilot quote goes here.</span></button>`}
  </section>

  <section class="grid g-main">
    <div class="grid col">
      <div class="panel p-moves">
        <div class="ph"><h2>Your next moves <small>${nextSet.length} set · overdue first</small></h2><a class="btn link" href="#/clients">All clients</a></div>
        <div class="queue" style="margin-top:10px">
          ${q.map(({ c, d }) => `<div class="q ${d.cls}"><div class="when">${esc(d.label)}${d.sub ? `<br><span style="font-weight:500">${esc(d.sub)}</span>` : ""}</div><div><div class="w">${esc(c.next.what)}</div><div class="who"><a href="#/c/${esc(c.id)}">${esc(c.name)}</a> · ${esc(c.stage)}</div></div><div style="display:flex;gap:6px"><button class="btn sm" data-done="${esc(c.id)}">${ic("check")}Done</button></div></div>`).join("")}
          ${ideas.slice(0, 2).map((i) => `<div class="q idea"><div class="when">Idea</div><div><div class="w">${esc(i.t)}</div><div class="who">${esc(i.sub)}</div></div><div>${i.act}</div></div>`).join("")}
          ${!q.length && !ideas.length ? `<div class="pb"><div class="empty-note"><b>All caught up.</b> Enjoy it, then pick someone to call.</div></div>` : ""}
        </div>
      </div>
      <div class="panel p-feed">
        <div class="ph"><h2>Recent activity <small>across clients</small></h2></div>
        <div class="feed" style="margin-top:8px">${feed.length ? feed.map((l) => { const [cl, icn] = kindIcon(l.kind, l.text || ""); const c = client(l.client); return `<div class="fi"><span class="ic ${cl}">${ic(icn)}</span><div><b style="font-weight:600">${esc(l.text)}</b><br><small><a href="#/c/${esc(l.client)}" style="text-decoration:none">${esc(c?.name || "")}</a> · ${esc(l.kind || "Note")}</small></div><time>${esc(ago(l.at))}</time></div>`; }).join("") : `<div class="pb"><div class="empty-note">Your story starts with the first note.</div></div>`}</div>
      </div>
    </div>
    <div class="grid col">
      <div class="panel lane p-lane">
        <div class="ph" style="padding:0"><h2>Pipeline <small>${S.clients.length} ${S.clients.length === 1 ? "client" : "clients"}</small></h2></div>
        <div class="lane-track">${MAIN.map((s) => { const here = S.clients.filter((c) => c.stage === s); return `<div class="lane-col ${here.length ? "has" : ""}"><span class="bar"></span><small>${esc(STAGE_SHORT[s] || s)}</small><div class="pucks">${here.map((c) => `<a class="puck" href="#/c/${esc(c.id)}" title="${esc(c.name)}" style="background:${colorOf(c)}">${esc(initials(c.name))}</a>`).join("")}</div></div>`; }).join("")}</div>
      </div>
      ${(() => { const rows = S.clients.map((c) => ({ c, r: latestPresence(c.id) })).filter((x) => x.r && hasModule(x.c, "presence")); return rows.length ? `<div class="panel p-scores"><div class="ph"><h2>Presence scores <small>latest per client</small></h2></div><div class="pb scores">${rows.map(({ c, r }) => `<div class="score-row"><a href="#/c/${esc(c.id)}" style="text-decoration:none"><b style="font:600 13.5px var(--ff)">${esc(c.name)}</b><br><small class="chip ${bandCls(r.score)}" style="height:20px;margin-top:3px">${esc(band(r.score))}</small></a><span class="track"><span class="fill ${bandCls(r.score)}" style="width:${r.score}%"></span></span><b>${r.score}</b></div>`).join("")}</div></div>` : ""; })()}
    </div>
  </section>`;
  wireCommon(v);
}

// ------------------------------------------------------------------ shared actions
function wireCommon(v) {
  $$("[data-add]", v).forEach((b) => (b.onclick = () => addProspect()));
  $$("[data-newquote]", v).forEach((b) => (b.onclick = () => newQuote(b.dataset.newquote)));
  $$("[data-done]", v).forEach((b) => (b.onclick = () => markDone(b.dataset.done)));
}
async function markDone(id) {
  const c = client(id); if (!c || !c.next?.what) return;
  const w = c.next.what;
  await save(id, { next: { what: "", due: "" } }); await logEntry(id, "Done: " + w, "Note");
  confetti(); toast("Done. Nice work.");
  setTimeout(() => editNext(id, true), 700);
}

// ------------------------------------------------------------------ more sheet (mobile overflow)
function openMore() {
  const themeLabel = curTheme() === "dark" ? "Switch to light" : "Switch to dark";
  const themeIcon = curTheme() === "dark" ? "sun" : "moon";
  openModal(`<div class="more-sheet">
    <h2>More</h2>
    <div class="more-list">
      <a class="more-item" href="#/assets" data-go>${ic("box")}<span><b>Assets</b><small>Kit files &amp; intake forms</small></span></a>
      <a class="more-item" href="#/quotes" data-go>${ic("file")}<span><b>Quotes &amp; invoices</b><small>Drafts, sent, paid</small></span></a>
      <a class="more-item" href="#/due" data-go>${ic("cal")}<span><b>Due</b><small>Today &amp; overdue steps</small></span></a>
      <a class="more-item" href="#/privacy" data-go>${ic("shield")}<span><b>Privacy requests</b><small>Due dates and extensions</small></span></a>
    </div>
    <div class="more-sec">Settings</div>
    <div class="more-list">
      <button type="button" class="more-item" id="moreTheme">${ic(themeIcon)}<span><b>Theme</b><small>${themeLabel}</small></span></button>
      <button type="button" class="more-item" id="moreOut">${ic("out")}<span><b>Sign out</b><small>Leave the portal</small></span></button>
    </div>
  </div>`, (d) => {
    $$("[data-go]", d).forEach((a) => (a.onclick = () => closeModal()));
    $("#moreTheme", d).onclick = () => {
      toggleTheme();
      const t = curTheme() === "dark" ? "sun" : "moon";
      const label = curTheme() === "dark" ? "Switch to light" : "Switch to dark";
      $("#moreTheme", d).innerHTML = `${ic(t)}<span><b>Theme</b><small>${label}</small></span>`;
      paintThemeIcon();
    };
    $("#moreOut", d).onclick = () => { closeModal(); doSignOut(); };
  });
  const mt = $("#moreTab"); if (mt) mt.classList.add("on");
}

// ------------------------------------------------------------------ modal + forms
function openModal(html, onMount, dialogClass = "") {
  const cls = dialogClass ? `dialog ${dialogClass}` : "dialog";
  $("#modal").innerHTML = `<div class="scrim" id="scrim"><div class="${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
  const dlg = $("#modal .dialog");
  const heading = dlg && $("h2", dlg);
  if (heading && dlg) {
    if (!heading.id) heading.id = "dlgTitle";
    dlg.setAttribute("aria-labelledby", heading.id);
  }
  $("#scrim").addEventListener("mousedown", (e) => { if (e.target.id === "scrim") closeModal(); });
  const f = $("#modal input, #modal textarea, #modal select"); if (f) setTimeout(() => f.focus(), 30);
  onMount && onMount($("#modal .dialog"));
}
function closeModal() { $("#modal").innerHTML = ""; refresh(true); }
// fields: [{k, label, type, options, placeholder, full}]
function formDialog({ title, intro, fields, values = {}, submit = "Save", onSave, onDelete, onMount }) {
  const f = (x) => {
    const val = values[x.k] ?? "";
    let inp;
    if (x.type === "segment") {
      inp = `<div class="seg" role="radiogroup" aria-label="${esc(x.label)}">${x.options.map((o) => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<label class="seg-opt"><input type="radio" name="${x.k}" value="${esc(ov)}" ${ov === val ? "checked" : ""}><span>${esc(ol)}</span></label>`; }).join("")}</div>${x.hint ? `<small class="seg-hint">${esc(x.hint)}</small>` : ""}`;
    } else if (x.type === "select") {
      inp = `<select class="input" name="${x.k}">${x.options.map((o) => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${ov === val ? "selected" : ""}>${esc(ol)}</option>`; }).join("")}</select>`;
    } else if (x.type === "textarea") {
      inp = `<textarea class="input" name="${x.k}" placeholder="${esc(x.placeholder || "")}" ${x.required ? "required" : ""}>${esc(val)}</textarea>`;
    } else {
      inp = `<input class="input" name="${x.k}" type="${x.type || "text"}" value="${esc(val)}" placeholder="${esc(x.placeholder || "")}" ${x.required ? "required" : ""} ${x.type === "tel" ? 'inputmode="tel"' : ""} autocomplete="off">`;
    }
    return `<label class="field" ${x.hide ? "hidden" : ""} data-fk="${esc(x.k)}" style="${x.full ? "flex-basis:100%" : ""}">${esc(x.label)}${inp}</label>`;
  };
  openModal(`<form id="fd"><div style="display:grid;gap:14px"><h2>${esc(title)}</h2>${intro ? `<p>${intro}</p>` : ""}<div class="row">${fields.map(f).join("")}</div>
    <div class="foot">${onDelete ? `<button type="button" class="btn danger ghost" id="fdDel" style="margin-right:auto">${ic("trash")}Remove</button>` : ""}<button type="button" class="btn ghost" id="fdX">Cancel</button><button class="btn p">${esc(submit)}</button></div></div></form>`, (d) => {
    $("#fdX", d).onclick = closeModal;
    if (onDelete) $("#fdDel", d).onclick = async (e) => { const b = e.currentTarget; if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Tap again to remove"; return; } await onDelete(); closeModal(); };
    $("#fd", d).onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      Object.keys(data).forEach((k) => (data[k] = String(data[k]).trim()));
      try { await onSave(data); closeModal(); }
      catch (err) {
        console.error(err);
        let box = $("#fdErr", d);
        if (!box) {
          box = document.createElement("p");
          box.id = "fdErr";
          box.setAttribute("role", "alert");
          box.style.cssText = "margin:0;color:var(--bad);font:600 14px/1.4 var(--ff)";
          const foot = $(".foot", d);
          if (foot) foot.before(box); else d.appendChild(box);
        }
        box.textContent = err?.message || "Save failed.";
      }
    };
    onMount && onMount(d);
  });
}
function slugify(s) { return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "client"; }
function pathSegHtml(val, hintId) {
  return `<label class="field" style="flex-basis:100%">Path
    <div class="seg" role="radiogroup" aria-label="Path">${PATH_OPTS.map(([ov, ol]) => `<label class="seg-opt"><input type="radio" name="path" value="${esc(ov)}" ${ov === val ? "checked" : ""}><span>${esc(ol)}</span></label>`).join("")}</div>
    <small class="seg-hint" id="${hintId}">${esc(PATH_HINT[val] || PATH_HINT.business)}</small></label>`;
}
function engSegHtml(val) {
  return `<label class="field" style="flex-basis:100%" id="engField">Engagement
    <div class="seg" role="radiogroup" aria-label="Engagement">${ENGAGE_BUSINESS.map(([ov, ol]) => `<label class="seg-opt"><input type="radio" name="engagement" value="${esc(ov)}" ${ov === val ? "checked" : ""}><span>${esc(ol)}</span></label>`).join("")}</div></label>`;
}
function wirePathEng(d) {
  const sync = () => {
    const path = $("[name=path]:checked", d)?.value || "business";
    const hint = $("#pathHint", d);
    if (hint) hint.textContent = PATH_HINT[path] || PATH_HINT.business;
    const eng = $("#engField", d);
    if (eng) eng.hidden = path === "personal";
  };
  $$("[name=path]", d).forEach((r) => (r.onchange = sync));
  sync();
}
function addProspect(pre = {}) {
  const path0 = pre.path === "personal" ? "personal" : "business";
  const eng0 = pre.engagement || "teams";
  openModal(`<form id="fd"><div style="display:grid;gap:14px"><h2>Add a prospect</h2><p>Just the basics. You can fill in the rest as you learn it.</p>
    <div class="row">
      ${pathSegHtml(path0, "pathHint")}
      <label class="field" style="flex-basis:100%">Name<input class="input" name="name" required placeholder="Business name" value="${esc(pre.name || "")}" autocomplete="off"></label>
      <label class="field">Town<input class="input" name="town" placeholder="Rogers, MN" value="${esc(pre.town || "")}" autocomplete="off"></label>
      <label class="field">Trade<input class="input" name="trade" placeholder="Plumbing, HVAC…" value="${esc(pre.trade || "")}" autocomplete="off"></label>
      <label class="field" style="flex-basis:100%">Website<input class="input" name="website" placeholder="example.com" value="${esc(pre.website || "")}" autocomplete="off"></label>
      ${engSegHtml(eng0)}
      <label class="field">Stage<select class="input" name="stage">${STAGES.map((s) => `<option ${s === (pre.stage || "Lead") ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
      <label class="field">Contact name<input class="input" name="contact" placeholder="Who you'd talk to" value="${esc(pre.contact || "")}" autocomplete="off"></label>
      <label class="field">Contact phone<input class="input" name="phone" type="tel" inputmode="tel" value="${esc(pre.phone || "")}" autocomplete="off"></label>
      <label class="field" style="flex-basis:100%">What are they interested in? (optional)<input class="input" name="interest" placeholder="e.g. more Google reviews, missed calls after hours" value="${esc(pre.interest || "")}" autocomplete="off"></label>
    </div>
    <div class="foot"><button type="button" class="btn ghost" id="fdX">Cancel</button><button class="btn p">Add prospect</button></div></div></form>`, (d) => {
    $("#fdX", d).onclick = closeModal;
    wirePathEng(d);
    $("#fd", d).onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      Object.keys(data).forEach((k) => (data[k] = String(data[k]).trim()));
      if (!data.name) return toast("Add a name first");
      const path = data.path === "personal" ? "personal" : "business";
      const engagement = path === "personal" ? "household" : (data.engagement || "teams");
      let id = slugify(data.name); while (client(id)) id += "-2";
      await setDoc(cref(id), blankClientDoc({
        name: data.name, trade: data.trade, town: data.town, website: data.website, stage: data.stage || "Lead",
        phone: data.phone || "", path, engagement,
        contacts: data.contact ? [{ name: data.contact, role: "", phone: data.phone || "", email: "", channel: "Text" }] : [],
        interests: data.interest ? [{ title: data.interest, note: "", status: "active" }] : [],
      }));
      await addDoc(collection(cref(id), "log"), { at: serverTimestamp(), kind: "Note", text: `Added as a prospect (${data.stage || "Lead"}).` });
      confetti(); toast(`${data.name} added. Welcome aboard.`);
      closeModal();
      setTimeout(() => (location.hash = "#/c/" + id), 250);
    };
  });
}
function editNext(id, fresh) {
  const c = client(id); if (!c) return;
  formDialog({ title: fresh ? "What's next?" : "Next step", intro: fresh ? `Keep ${esc(c.name.replace(/ \(.*\)/, ""))} moving with one clear next step.` : "", submit: "Save", values: c.next || {},
    fields: [{ k: "what", label: "Next step", full: true, required: true, placeholder: "e.g. Text the owner to pick a date" }, { k: "due", label: "By when", type: "date" }],
    onSave: async (d) => { await save(id, { next: { what: d.what, due: d.due } }); await logEntry(id, `Next step: ${d.what}${d.due ? " (by " + fmtDay(d.due) + ")" : ""}`, "Note"); toast("Next step set"); } });
}

// ------------------------------------------------------------------ clients
let clientFilter = "All";
let portalFilter = "All";
let clientQuery = "";
const PORTAL_FILTERS = ["All", "none", "invited", "active", "SUSPENDED", "ARCHIVED"];
function portalStatusOf(c) {
  const p = c?.portal || {};
  const state = String(p.accessState || "").toLowerCase();
  if (state === "suspended") return "SUSPENDED";
  if (state === "archived") return "ARCHIVED";
  if (p.enabled === true) return "active";
  if (p.inviteOpen === true) return "invited";
  return "none";
}
function portalChip(st) {
  if (st === "SUSPENDED") return "warn";
  if (st === "ARCHIVED") return "bad";
  if (st === "active") return "ok";
  if (st === "invited") return "data";
  return "dash";
}
function updatedAtMs(c) {
  const d = toDate(c?.updatedAt);
  return d ? d.getTime() : null;
}
function fmtUtc(ts) {
  const d = toDate(ts);
  return d ? d.toISOString().slice(0, 10) : "—";
}
function showFormError(root, message) {
  let box = $("#fdErr", root);
  if (!box) {
    box = document.createElement("p");
    box.id = "fdErr";
    box.setAttribute("role", "alert");
    box.style.cssText = "margin:0;color:var(--bad);font:600 14px/1.4 var(--ff)";
    const foot = $(".foot", root);
    if (foot) foot.before(box); else root.appendChild(box);
  }
  box.textContent = message || "Save failed.";
}
function viewClients(v) {
  const q = clientQuery.trim().toLowerCase();
  const stages = ["All", ...STAGES.filter((s) => S.clients.some((c) => c.stage === s))];
  const list = S.clients.filter((c) => {
    if (clientFilter !== "All" && c.stage !== clientFilter) return false;
    if (portalFilter !== "All" && portalStatusOf(c) !== portalFilter) return false;
    if (!q) return true;
    return [c.name, c.trade, c.town, c.email, c.stage, portalStatusOf(c)].join(" ").toLowerCase().includes(q);
  }).sort((a, b) => dueInfo(a.next).rank - dueInfo(b.next).rank || (toDate(b.lastTouch) || 0) - (toDate(a.lastTouch) || 0));
  v.innerHTML = `<section class="hello"><div><div class="date">Clients &amp; prospects</div><h1>Your people.</h1><p>${S.clients.length ? `${S.clients.length} so far. Every one of them started as a conversation.` : "No one yet. Your first prospect is the hardest and the best."}</p></div></section>
    <div class="client-tools"><label class="field" style="flex:1;min-width:180px">Search<input id="clientSearch" class="input" type="search" value="${esc(clientQuery)}" autocomplete="off"></label></div>
    <div class="client-tools" role="group" aria-label="Portal status">${PORTAL_FILTERS.map((s) => `<button type="button" class="chip ${s === portalFilter ? "acc" : "dash"}" data-pf="${esc(s)}">${esc(s === "All" ? "All access" : s)} <span class="mono">${s === "All" ? S.clients.length : S.clients.filter((c) => portalStatusOf(c) === s).length}</span></button>`).join("")}</div>
    <div class="client-tools" role="group" aria-label="Stage">${stages.map((s) => `<button type="button" class="chip ${s === clientFilter ? "acc" : "dash"}" data-f="${esc(s)}">${esc(s)} <span class="mono">${s === "All" ? S.clients.length : S.clients.filter((c) => c.stage === s).length}</span></button>`).join("")}</div>
    <div class="clist">${list.map((c) => { const d = dueInfo(c.next), r = latestPresence(c.id), st = portalStatusOf(c); return `<a class="panel ccard" href="#/c/${esc(c.id)}"><div class="top"><span class="avatar" style="background:${colorOf(c)}">${esc(initials(c.name))}</span><div><div class="nm">${esc(c.name)}</div><div class="sub">${esc([c.trade, c.town].filter(Boolean).join(" · ") || "Details to come")}</div></div></div>
      <div class="nx">${ic("flag")}<span>${esc(c.next?.what || "No next step yet")}</span></div>
      <div class="meta"><span class="chip data">${esc(c.stage)}</span><span class="chip ${portalChip(st)}">${esc(st)}</span><span class="chip ${clientPath(c) === "personal" ? "acc" : "dash"}">${esc(pathLabel(clientPath(c)))}</span>${d.cls ? `<span class="chip ${d.cls === "over" ? "bad" : "warn"}">${esc(d.label)}</span>` : ""}${r && hasModule(c, "presence") ? `<span class="chip ${bandCls(r.score)}">Presence ${r.score}</span>` : ""}<span class="chip dash">${c.lastTouch ? `Last activity ${esc(ago(c.lastTouch))}` : "No activity yet"}</span></div></a>`; }).join("")}
      <button class="panel addcard" data-add><span class="plus">${ic("plus")}</span><b>Add a prospect</b><small>A shop you already know is the best place to start. <kbd>N</kbd> works anywhere.</small></button></div>`;
  const box = $("#clientSearch", v);
  if (box) box.oninput = () => {
    clientQuery = box.value;
    const pos = box.selectionStart;
    viewClients(v);
    const again = $("#clientSearch", v);
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) {} }
  };
  $$("[data-f]", v).forEach((b) => (b.onclick = () => { clientFilter = b.dataset.f; refresh(true); }));
  $$("[data-pf]", v).forEach((b) => (b.onclick = () => { portalFilter = b.dataset.pf; refresh(true); }));
  wireCommon(v);
}
function viewPrivacy(v) {
  const rows = S.privacy.slice().sort((a, b) => (toDate(a.dueAt)?.getTime() || 0) - (toDate(b.dueAt)?.getTime() || 0));
  v.innerHTML = `<section class="hello"><div><div class="date">Privacy</div><h1>Privacy requests.</h1><p>Received date, a due date of 10 business days and never past 30 days, and one 30-day extension with a stated reason.</p></div>
    <div class="acts"><button class="btn p" id="addPrivacy" type="button">Record a request</button></div></section>
    <section class="panel" id="privacy-queue" aria-labelledby="privacy-q"><div class="ph"><h2 id="privacy-q">Queue</h2></div><div class="pb privacy-wrap">${rows.length ? `<table class="privacy-table"><caption>Privacy request queue</caption><thead><tr><th scope="col">Received</th><th scope="col">Due</th><th scope="col">Status</th><th scope="col">From</th><th scope="col">Actions</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(fmtUtc(r.receivedAt))}</td><td>${esc(fmtUtc(r.dueAt))}</td><td><span class="chip ${r.status === "completed" ? "ok" : r.status === "extended" ? "warn" : "data"}">${esc(r.status || "")}</span></td><td>${esc(r.requesterEmail || "")}${r.requesterName ? `<small>${esc(r.requesterName)}</small>` : ""}${r.extension?.reason ? `<small>Extension: ${esc(r.extension.reason)}</small>` : ""}</td><td class="privacy-acts">
        ${r.extensionUsed ? "" : `<button type="button" class="btn sm" data-ext="${esc(r.id)}">Extend 30 days</button>`}
        ${r.status === "completed" || r.status === "declined" ? "" : `<button type="button" class="btn sm" data-done="${esc(r.id)}">Mark completed</button>`}
      </td></tr>`).join("")}
    </tbody></table>` : `<div class="empty-note">No privacy requests yet.</div>`}</div></section>`;
  $("#addPrivacy", v).onclick = () => formDialog({
    title: "Record a privacy request",
    fields: [
      { k: "requesterEmail", label: "Email", type: "email", required: true, full: true },
      { k: "requesterName", label: "Name", full: true },
      { k: "kind", label: "Kind", type: "select", options: [["access", "Access"], ["delete", "Delete"], ["correct", "Correct"], ["export", "Export"]] },
      { k: "receivedAt", label: "Received", type: "date", full: true },
    ],
    submit: "Save",
    onSave: async (d) => {
      await callFn("adminRecordPrivacyRequest", {
        requesterEmail: d.requesterEmail, requesterName: d.requesterName, kind: d.kind, receivedAt: d.receivedAt || null,
      });
      toast("Request recorded");
    },
  });
  $$("[data-ext]", v).forEach((b) => (b.onclick = () => formDialog({
    title: "Extend 30 days",
    intro: "One extension. A reason is required.",
    fields: [{ k: "reason", label: "Reason", type: "textarea", required: true, full: true }],
    submit: "Extend",
    onSave: async (d) => {
      if (!d.reason) throw new Error("A reason is required.");
      await callFn("adminUpdatePrivacyRequest", { id: b.dataset.ext, reason: d.reason });
      toast("Extended");
    },
  })));
  $$("[data-done]", v).forEach((b) => (b.onclick = async () => {
    try { await callFn("adminUpdatePrivacyRequest", { id: b.dataset.done, status: "completed" }); toast("Completed"); }
    catch (err) { toast(err.message || "Could not update"); }
  }));
}

// ------------------------------------------------------------------ files (Storage-only listing; no Firestore writes)
const MAX_BYTES = 20 * 1024 * 1024;
const FILE_TAGS = [{ id: "returned-intake", label: "Returned intake" }, { id: "general", label: "General" }];
const ASSET_CATS = [
  { id: "client-intake", label: "Onboarding kit", blurb: "Blank business intakes." },
  { id: "personal-intake", label: "Life kit", blurb: "Personal intake PDFs." },
  { id: "marketing", label: "Marketing", blurb: "One-pagers and leave-behinds." },
  { id: "playbooks", label: "Playbooks", blurb: "Short agent-handable cheat sheets." },
  { id: "agreements", label: "Agreements", blurb: "Contracts and engagement letters." },
  { id: "other", label: "Other", blurb: "Everything else worth keeping." },
];
const tagLabel = (id) => FILE_TAGS.find((t) => t.id === id)?.label || "General";
function fmtSize(n) {
  const x = Number(n) || 0;
  if (x < 1024) return `${x} B`;
  if (x < 1024 * 1024) return `${x < 10 * 1024 ? (x / 1024).toFixed(1) : Math.round(x / 1024)} KB`;
  const mb = x / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
function safeFileName(name) {
  const base = String(name || "file").split(/[/\\]/).pop();
  const cleaned = base.replace(/[^\w.\-()+ ]+/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[.-]+|[.-]+$/g, "");
  return (cleaned || "file").slice(0, 80);
}
const fileCache = {};
const fileLoading = {};
const fileFilter = {};
const uploadCat = {};
const uploads = {};
function fileItems(prefix) {
  const items = (fileCache[prefix]?.items || []).slice();
  items.sort((a, b) => {
    const ar = a.category === "returned-intake" ? 0 : 1, br = b.category === "returned-intake" ? 0 : 1;
    if (ar !== br) return ar - br;
    return (b.timeCreated || "").localeCompare(a.timeCreated || "");
  });
  const f = fileFilter[prefix] || "all";
  return f === "all" ? items : items.filter((x) => x.category === f);
}
async function loadFiles(prefix, force) {
  if (!force && fileCache[prefix]) return;
  if (fileLoading[prefix]) return fileLoading[prefix];
  fileLoading[prefix] = (async () => {
    try {
      const list = await listAll(sref(storage, prefix));
      const items = await Promise.all(list.items.map(async (item) => {
        const meta = await getMetadata(item);
        const cm = meta.customMetadata || {};
        const stored = item.name;
        const stripped = stored.replace(/^\d{10,}-/, "") || stored;
        const downloadName = cm.downloadName || cm.originalName || stripped;
        const display = cm.displayName || prettyAssetTitle(downloadName);
        const contentType = meta.contentType || "";
        return {
          path: item.fullPath, name: display, downloadName, size: meta.size, timeCreated: meta.timeCreated,
          uploadedBy: cm.uploadedBy || "", category: cm.category === "returned-intake" ? "returned-intake" : "general",
          contentType, thumbPath: cm.thumbPath || assetThumbPath(item.fullPath, contentType, downloadName),
        };
      }));
      fileCache[prefix] = { items, at: Date.now() };
    } catch (e) {
      fileCache[prefix] = { items: [], err: e.code || e.message || String(e), at: Date.now() };
    } finally {
      delete fileLoading[prefix];
      refresh();
    }
  })();
  return fileLoading[prefix];
}
function isImageType(t) { return String(t || "").startsWith("image/"); }
function isPdfType(t, name) {
  const n = String(name || "").toLowerCase();
  return String(t || "") === "application/pdf" || n.endsWith(".pdf");
}
function baseNameNoExt(name) {
  const b = String(name || "").split("/").pop() || "file";
  return b.replace(/\.[^.]+$/, "") || b;
}
function prettyAssetTitle(name) {
  const raw = String(name || "").replace(/\.[^.]+$/, "");
  const known = {
    "AI-Team-OnePager": "AI Team One-Pager",
    "Grok-Teams-Brief": "Team Bots Brief",
    "Grok-Bot-Security-Brief": "Security 2-Pager",
    "Grok-vs-Dots-vs-Muse": "Grok vs Dots vs Muse",
    "Client-Intake-Form-Blank-v2": "Client Intake Form (Blank)",
    "Personal-Life-Intake-Blank-v2": "Personal Life Intake (Blank)",
  };
  if (known[raw]) return known[raw];
  return raw.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function assetThumbPath(fullPath, contentType, name) {
  if (isImageType(contentType)) return fullPath;
  if (!isPdfType(contentType, name || fullPath)) return "";
  const parts = String(fullPath).split("/");
  const file = parts.pop() || "";
  return `${parts.join("/")}/thumbs/${baseNameNoExt(file)}.jpg`;
}
async function downloadAssetBlob(path, downloadName) {
  const url = await getDownloadURL(sref(storage, path));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = downloadName || path.split("/").pop() || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}
async function openAssetViewer(file) {
  const path = file.path;
  const title = file.name || path.split("/").pop() || "Asset";
  const dlName = file.downloadName || (path.split("/").pop() || "download.pdf").replace(/^\d{10,}-/, "");
  const pdf = isPdfType(file.contentType, dlName);
  let url;
  try { url = await getDownloadURL(sref(storage, path)); }
  catch (e) { toast("Couldn't open: " + (e.code || e.message)); return; }
  let zoom = 1;
  const body = pdf
    ? `<div class="av-frame"><iframe class="av-iframe" title="${esc(title)}" src="${esc(url)}"></iframe></div>`
    : isImageType(file.contentType)
      ? `<div class="av-frame"><img class="av-img" alt="${esc(title)}" src="${esc(url)}"></div>`
      : `<div class="av-frame av-fallback"><p>Preview isn't available for this file type.</p><a class="btn p" href="${esc(url)}" target="_blank" rel="noopener">Open in new tab</a></div>`;
  openModal(`<div class="av-head"><div><h2>${esc(title)}</h2><small>${esc(dlName)}</small></div>
    <div class="av-tools">
      <button type="button" class="btn sm ghost" data-av-zoom="-">−</button>
      <span class="av-zoom-lbl">100%</span>
      <button type="button" class="btn sm ghost" data-av-zoom="+">+</button>
      <button type="button" class="btn sm ghost" data-av-zoom="1">Reset</button>
      <button type="button" class="btn sm p" data-av-dl>${ic("link")}Download</button>
      <button type="button" class="btn sm ghost" data-av-x aria-label="Close">✕</button>
    </div></div>${body}`, (d) => {
    const frame = $(".av-frame", d);
    const lbl = $(".av-zoom-lbl", d);
    const applyZoom = () => {
      if (!frame) return;
      frame.style.transform = `scale(${zoom})`;
      if (lbl) lbl.textContent = `${Math.round(zoom * 100)}%`;
    };
    $$("[data-av-zoom]", d).forEach((b) => (b.onclick = () => {
      const v = b.dataset.avZoom;
      if (v === "+") zoom = Math.min(2.5, +(zoom + 0.15).toFixed(2));
      else if (v === "-") zoom = Math.max(0.5, +(zoom - 0.15).toFixed(2));
      else zoom = 1;
      applyZoom();
    }));
    $("[data-av-dl]", d).onclick = async () => {
      try { await downloadAssetBlob(path, dlName); toast("Download started."); }
      catch (e) { toast("Download failed: " + (e.message || e)); }
    };
    $("[data-av-x]", d).onclick = closeModal;
    applyZoom();
  }, "asset-viewer");
}
function filesCardHtml(prefix, { title, empty, taggable, showcase }) {
  if (!fileCache[prefix] && !fileLoading[prefix]) loadFiles(prefix);
  const rec = fileCache[prefix];
  const items = fileItems(prefix);
  const ups = uploads[prefix] || [];
  const filt = fileFilter[prefix] || "all";
  const cat = uploadCat[prefix] || "general";
  const n = rec ? (rec.items || []).length : 0;
  const filterBar = taggable ? `<div class="file-filters">${[{ id: "all", label: "All" }, ...FILE_TAGS].map((t) => `<button type="button" class="chip ${t.id === filt ? "acc" : "dash"}" data-ff="${esc(t.id)}" style="cursor:pointer;border:0;height:26px">${esc(t.label)}</button>`).join("")}</div>` : "";
  const tagSelect = taggable ? `<label class="field file-tag" style="min-width:150px;flex:0;margin:0">Tag<select class="input" data-upcat>${FILE_TAGS.map((t) => `<option value="${t.id}" ${t.id === cat ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></label>` : "";
  const list = showcase
    ? [
      ...ups.map((u) => `<div class="file tile" data-up="${esc(u.id)}"><div class="tile-thumb ph"><span class="tile-ph">Uploading</span></div><div class="tile-meta"><b>${esc(u.name)}</b><small>${u.pct}%</small></div><div class="upbar"><i style="width:${u.pct}%"></i></div></div>`),
      ...items.map((f) => {
        const img = isImageType(f.contentType);
        const pdf = !img && isPdfType(f.contentType, f.downloadName || f.name);
        const hasThumb = !!(f.thumbPath);
        const thumbCls = hasThumb ? "" : (pdf ? "pdf" : "file");
        const ph = hasThumb ? "…" : (pdf ? "PDF" : "FILE");
        const thumb = `<button type="button" class="tile-thumb ${thumbCls}" data-view="${esc(f.path)}" ${hasThumb ? `data-thumb="${esc(f.thumbPath)}"` : ""} aria-label="Open ${esc(f.name)}"><span class="tile-ph">${ph}</span></button>`;
        return `<div class="file tile" data-fpath="${esc(f.path)}" data-fname="${esc(f.name)}" data-fdl="${esc(f.downloadName || f.name)}" data-ftype="${esc(f.contentType || "")}">
      ${thumb}
      <div class="tile-meta"><b title="${esc(f.name)}">${esc(f.name)}</b><small>${esc(fmtSize(f.size))}${f.timeCreated ? " · " + esc(fmtDay(String(f.timeCreated).slice(0, 10))) : ""}</small></div>
      <div class="file-acts"><button type="button" class="btn sm" data-view="${esc(f.path)}">${ic("link")}Open</button><button type="button" class="btn sm ghost danger" data-rm="${esc(f.path)}" aria-label="Delete ${esc(f.name)}">${ic("trash")}</button></div>
    </div>`;
      }),
    ].join("")
    : [
      ...ups.map((u) => `<div class="file" data-up="${esc(u.id)}"><div><b>${esc(u.name)}</b><small>Uploading… ${u.pct}%</small></div><div class="upbar"><i style="width:${u.pct}%"></i></div></div>`),
      ...items.map((f) => `<div class="file" data-fpath="${esc(f.path)}" data-fname="${esc(f.name)}" data-fdl="${esc(f.downloadName || f.name)}" data-ftype="${esc(f.contentType || "")}">
      <div><b>${esc(f.name)}</b><small>${esc(fmtSize(f.size))}${f.timeCreated ? " · " + esc(fmtDay(String(f.timeCreated).slice(0, 10))) : ""}${f.uploadedBy ? " · " + esc(f.uploadedBy) : ""}</small></div>
      ${taggable ? `<button type="button" class="chip ${f.category === "returned-intake" ? "acc" : "dash"}" data-retag="${esc(f.path)}" data-cat="${esc(f.category)}" title="Tap to retag" style="cursor:pointer;border:0">${esc(tagLabel(f.category))}</button>` : ""}
      <div class="file-acts"><button type="button" class="btn sm" data-view="${esc(f.path)}">${ic("link")}Open</button><button type="button" class="btn sm ghost danger" data-rm="${esc(f.path)}" aria-label="Delete ${esc(f.name)}">${ic("trash")}</button></div>
    </div>`),
    ].join("");
  let body;
  if (!rec) body = `<div class="empty-note">Loading files…</div>`;
  else if (rec.err && !n && !ups.length) body = `<div class="empty-note">Couldn't list files (${esc(rec.err)}). Storage may still be off for this project.</div>`;
  else if (!items.length && !ups.length) body = `<div class="empty-note">${empty}</div>`;
  else body = `<div class="files${showcase ? " showcase" : ""}">${list}</div>`;
  return `<section class="panel files-card${showcase ? " showcase-card" : ""}" data-prefix="${esc(prefix)}" data-taggable="${taggable ? "1" : "0"}" data-showcase="${showcase ? "1" : "0"}">
    <div class="ph"><h2>${esc(title)} <small>${n || ""}</small></h2>
      <div class="file-head">${tagSelect}<button type="button" class="btn sm p" data-uppick>${ic("plus")}Upload</button>
      <input type="file" accept="application/pdf,image/*" multiple hidden data-filepick></div></div>
    <div class="pb">${filterBar}${body}</div></section>`;
}
function wireFilesPanel(root) {
  $$(".files-card", root).forEach((card) => {
    const prefix = card.dataset.prefix;
    const taggable = card.dataset.taggable === "1";
    const pick = $("[data-filepick]", card);
    const catSel = $("[data-upcat]", card);
    if (catSel) catSel.onchange = () => { uploadCat[prefix] = catSel.value; };
    const up = $("[data-uppick]", card);
    if (up) up.onclick = () => pick.click();
    pick.onchange = async () => {
      const files = [...pick.files]; pick.value = "";
      const tag = taggable ? (uploadCat[prefix] || catSel?.value || "general") : (prefix.split("/")[1] || "general");
      for (const file of files) await uploadOne(prefix, file, tag);
    };
    $$("[data-ff]", card).forEach((b) => (b.onclick = () => { fileFilter[prefix] = b.dataset.ff; refresh(true); }));
    const fileFromBtn = (b) => {
      const row = b.closest("[data-fpath]") || b.closest(".file");
      const path = b.dataset.view || b.dataset.dl || row?.dataset.fpath;
      const cached = (fileCache[prefix]?.items || []).find((x) => x.path === path);
      if (cached) return cached;
      return {
        path,
        name: row?.dataset.fname || path?.split("/").pop() || "Asset",
        downloadName: row?.dataset.fdl || path?.split("/").pop() || "download",
        contentType: row?.dataset.ftype || "",
      };
    };
    $$("[data-view]", card).forEach((b) => (b.onclick = async () => {
      try { await openAssetViewer(fileFromBtn(b)); }
      catch (e) { toast("Couldn't open: " + (e.code || e.message)); }
    }));
    $$("[data-dl]", card).forEach((b) => (b.onclick = async () => {
      try { await openAssetViewer(fileFromBtn(b)); }
      catch (e) { toast("Couldn't open: " + (e.code || e.message)); }
    }));
    $$("[data-rm]", card).forEach((b) => (b.onclick = async (e) => {
      const btn = e.currentTarget;
      if (btn.dataset.armed !== "1") { btn.dataset.armed = "1"; btn.textContent = "Tap again"; setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ""; btn.innerHTML = ic("trash"); } }, 4000); return; }
      try {
        const path = btn.dataset.rm;
        const cached = (fileCache[prefix]?.items || []).find((x) => x.path === path);
        await deleteObject(sref(storage, path));
        if (cached?.thumbPath && cached.thumbPath !== path) {
          try { await deleteObject(sref(storage, cached.thumbPath)); } catch (_) { /* thumb may be missing */ }
        }
        toast("File removed.");
        await loadFiles(prefix, true);
      }
      catch (err) { toast("Delete failed: " + (err.code || err.message)); }
    }));
    $$("[data-retag]", card).forEach((b) => (b.onclick = async () => {
      const next = b.dataset.cat === "returned-intake" ? "general" : "returned-intake";
      try {
        await updateMetadata(sref(storage, b.dataset.retag), { customMetadata: { category: next } });
        toast(next === "returned-intake" ? "Tagged Returned intake." : "Tagged General.");
        if (prefix.startsWith("clients/") && next === "returned-intake") await maybeBumpIntake(prefix.split("/")[1], next);
        await loadFiles(prefix, true);
      } catch (err) { toast("Retag failed: " + (err.code || err.message)); }
    }));
    if (card.dataset.showcase === "1") {
      $$("[data-thumb]", card).forEach(async (el) => {
        try {
          const url = await getDownloadURL(sref(storage, el.dataset.thumb));
          el.classList.remove("pdf", "file");
          el.innerHTML = `<img src="${esc(url)}" alt="" loading="lazy" decoding="async">`;
        } catch (e) {
          const row = el.closest("[data-ftype]") || el.closest(".file");
          const pdf = el.classList.contains("pdf") || isPdfType(row?.dataset.ftype, row?.dataset.fdl || row?.dataset.fname);
          el.classList.add(pdf ? "pdf" : "file");
          el.innerHTML = `<span class="tile-ph">${pdf ? "PDF" : "FILE"}</span>`;
        }
      });
    }
  });
}
async function maybeBumpIntake(clientId, category) {
  if (category !== "returned-intake" || !clientId) return;
  const c = client(clientId); if (!c) return;
  const cur = c.intake?.status || "not-sent";
  if ((INTAKE_RANK[cur] ?? 0) >= INTAKE_RANK.reviewed) return;
  if ((INTAKE_RANK[cur] ?? 0) >= INTAKE_RANK.returned) return;
  const today = todayISO();
  await save(clientId, { intake: { ...(c.intake || {}), status: "returned", returnedAt: today, sentAt: c.intake?.sentAt || "", reviewedAt: c.intake?.reviewedAt || "" } });
  toast("Intake marked returned.");
}
async function uploadOne(prefix, file, category) {
  if (file.size >= MAX_BYTES) { toast(`${file.name} is over 20 MB. Shrink it and try again.`); return; }
  const type = file.type || "";
  if (type !== "application/pdf" && !type.startsWith("image/")) { toast("PDF or images only."); return; }
  const id = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 7);
  const clean = safeFileName(file.name);
  const isAsset = prefix.startsWith("assets/");
  const path = isAsset ? `${prefix}/${clean}` : `${prefix}/${Date.now()}-${clean}`;
  if (!uploads[prefix]) uploads[prefix] = [];
  const u = { id, name: file.name, pct: 0 };
  uploads[prefix].push(u);
  refresh(true);
  const displayName = isAsset ? prettyAssetTitle(clean) : file.name;
  const thumbPath = isAsset && type === "application/pdf" ? `${prefix}/thumbs/${baseNameNoExt(clean)}.jpg` : "";
  const meta = {
    contentType: type,
    customMetadata: {
      category,
      originalName: file.name,
      downloadName: clean,
      displayName,
      uploadedBy: me?.email || "",
      ...(thumbPath ? { thumbPath } : {}),
    },
  };
  const task = uploadBytesResumable(sref(storage, path), file, meta);
  await new Promise((resolve) => {
    task.on("state_changed", (s) => {
      u.pct = s.totalBytes ? Math.round((s.bytesTransferred / s.totalBytes) * 100) : 0;
      const row = document.querySelector(`[data-up="${id}"]`);
      if (row) { const bar = $("i", row), sm = $("small", row); if (bar) bar.style.width = u.pct + "%"; if (sm) sm.textContent = `Uploading… ${u.pct}%`; }
    }, (err) => { toast("Upload failed: " + (err.code || err.message)); uploads[prefix] = (uploads[prefix] || []).filter((x) => x.id !== id); refresh(true); resolve(); },
    async () => {
      uploads[prefix] = (uploads[prefix] || []).filter((x) => x.id !== id);
      toast(`${file.name} is in.`);
      if (prefix.startsWith("clients/") && category === "returned-intake") await maybeBumpIntake(prefix.split("/")[1], category);
      loadFiles(prefix, true); resolve();
    });
  });
}
let assetCat = "all";
function viewAssets(v) {
  const chips = [{ id: "all", label: "All", blurb: "Everything in the box." }, ...ASSET_CATS];
  const isAll = assetCat === "all";
  const cat = isAll ? null : (ASSET_CATS.find((c) => c.id === assetCat) || ASSET_CATS[0]);
  const chipHtml = `<div style="display:flex;flex-wrap:wrap;gap:6px">${chips.map((c) => `<button type="button" class="chip ${c.id === assetCat ? "acc" : "dash"}" data-acat="${esc(c.id)}" style="cursor:pointer;border:0;height:30px;padding:0 12px">${esc(c.label)}</button>`).join("")}</div>`;
  const hello = `<section class="hello"><div><div class="date">Assets</div><h1>The box.</h1><p>Intake forms, one-pagers, and the rest of the kit. Grab them from any desk.</p></div></section>`;
  if (isAll) {
    const prefixes = ASSET_CATS.map((c) => `assets/${c.id}`);
    prefixes.forEach((p) => { if (!fileCache[p] && !fileLoading[p]) loadFiles(p); });
    const loading = prefixes.some((p) => !fileCache[p]);
    const errOnly = !loading && prefixes.every((p) => fileCache[p]?.err && !(fileCache[p].items || []).length);
    const items = prefixes.flatMap((p) => (fileCache[p]?.items || []).map((f) => ({ ...f, _prefix: p })));
    items.sort((a, b) => (b.timeCreated || "").localeCompare(a.timeCreated || ""));
    const ups = prefixes.flatMap((p) => (uploads[p] || []).map((u) => ({ ...u, _prefix: p })));
    let body;
    if (loading) body = `<div class="empty-note">Loading files…</div>`;
    else if (errOnly && !ups.length) body = `<div class="empty-note">Couldn't list files. Storage may still be off for this project.</div>`;
    else if (!items.length && !ups.length) body = `<div class="empty-note">Nothing in the box yet. Upload into a kit, or drop files while All is selected into Other.</div>`;
    else {
      const list = [
        ...ups.map((u) => `<div class="file tile" data-up="${esc(u.id)}"><div class="tile-thumb ph"><span class="tile-ph">Uploading</span></div><div class="tile-meta"><b>${esc(u.name)}</b><small>${u.pct}%</small></div><div class="upbar"><i style="width:${u.pct}%"></i></div></div>`),
        ...items.map((f) => {
          const img = isImageType(f.contentType);
          const pdf = !img && isPdfType(f.contentType, f.downloadName || f.name);
          const hasThumb = !!(f.thumbPath);
          const thumbCls = hasThumb ? "" : (pdf ? "pdf" : "file");
          const ph = hasThumb ? "…" : (pdf ? "PDF" : "FILE");
          const thumb = `<button type="button" class="tile-thumb ${thumbCls}" data-view="${esc(f.path)}" ${hasThumb ? `data-thumb="${esc(f.thumbPath)}"` : ""} aria-label="Open ${esc(f.name)}"><span class="tile-ph">${ph}</span></button>`;
          return `<div class="file tile" data-fpath="${esc(f.path)}" data-fname="${esc(f.name)}" data-fdl="${esc(f.downloadName || f.name)}" data-ftype="${esc(f.contentType || "")}" data-prefix="${esc(f._prefix)}">
      ${thumb}
      <div class="tile-meta"><b title="${esc(f.name)}">${esc(f.name)}</b><small>${esc(fmtSize(f.size))}${f.timeCreated ? " · " + esc(fmtDay(String(f.timeCreated).slice(0, 10))) : ""}</small></div>
      <div class="file-acts"><button type="button" class="btn sm" data-view="${esc(f.path)}">${ic("link")}Open</button><button type="button" class="btn sm ghost danger" data-rm="${esc(f.path)}" aria-label="Delete ${esc(f.name)}">${ic("trash")}</button></div>
    </div>`;
        }),
      ].join("");
      body = `<div class="files showcase">${list}</div>`;
    }
    // Upload while All → other (safe default)
    const uploadPrefix = "assets/other";
    v.innerHTML = `${hello}${chipHtml}
    <section class="panel files-card showcase-card" data-prefix="${esc(uploadPrefix)}" data-taggable="0" data-showcase="1" data-all="1">
      <div class="ph"><h2>All kits <small>${items.length || ""}</small></h2>
        <div class="file-head"><button type="button" class="btn sm p" data-uppick>${ic("plus")}Upload</button>
        <input type="file" accept="application/pdf,image/*" multiple hidden data-filepick></div></div>
      <div class="pb">${body}</div></section>`;
    $$("[data-acat]", v).forEach((b) => (b.onclick = () => { assetCat = b.dataset.acat; refresh(true); }));
    wireFilesPanel(v);
    // wire view/delete across all prefixes for All grid
    const card = $(".files-card[data-all]", v);
    if (card) {
      const fileFromBtn = (b) => {
        const row = b.closest("[data-fpath]") || b.closest(".file");
        const path = b.dataset.view || b.dataset.rm || row?.dataset.fpath;
        const pref = row?.dataset.prefix || uploadPrefix;
        const cached = (fileCache[pref]?.items || []).find((x) => x.path === path)
          || prefixes.flatMap((p) => fileCache[p]?.items || []).find((x) => x.path === path);
        if (cached) return cached;
        return { path, name: row?.dataset.fname || path?.split("/").pop() || "Asset", downloadName: row?.dataset.fdl || path?.split("/").pop() || "download", contentType: row?.dataset.ftype || "" };
      };
      $$("[data-view]", card).forEach((b) => (b.onclick = async () => {
        try { await openAssetViewer(fileFromBtn(b)); }
        catch (e) { toast("Couldn't open: " + (e.code || e.message)); }
      }));
      $$("[data-rm]", card).forEach((b) => (b.onclick = async (e) => {
        const btn = e.currentTarget;
        if (btn.dataset.armed !== "1") { btn.dataset.armed = "1"; btn.textContent = "Tap again"; setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ""; btn.innerHTML = ic("trash"); } }, 4000); return; }
        try {
          const path = btn.dataset.rm;
          const row = btn.closest("[data-fpath]");
          const pref = row?.dataset.prefix || uploadPrefix;
          const cached = (fileCache[pref]?.items || []).find((x) => x.path === path);
          await deleteObject(sref(storage, path));
          if (cached?.thumbPath && cached.thumbPath !== path) {
            try { await deleteObject(sref(storage, cached.thumbPath)); } catch (_) {}
          }
          toast("File removed.");
          await Promise.all(prefixes.map((p) => loadFiles(p, true)));
        } catch (err) { toast("Delete failed: " + (err.code || err.message)); }
      }));
      $$("[data-thumb]", card).forEach(async (el) => {
        try {
          const url = await getDownloadURL(sref(storage, el.dataset.thumb));
          el.classList.remove("pdf", "file");
          el.innerHTML = `<img src="${esc(url)}" alt="" loading="lazy" decoding="async">`;
        } catch (e) {
          const row = el.closest("[data-ftype]") || el.closest(".file");
          const pdf = el.classList.contains("pdf") || isPdfType(row?.dataset.ftype, row?.dataset.fdl || row?.dataset.fname);
          el.classList.add(pdf ? "pdf" : "file");
          el.innerHTML = `<span class="tile-ph">${pdf ? "PDF" : "FILE"}</span>`;
        }
      });
    }
    return;
  }
  const prefix = `assets/${cat.id}`;
  v.innerHTML = `
    ${hello}
    ${chipHtml}
    ${filesCardHtml(prefix, { title: cat.label, empty: `Nothing in ${esc(cat.label.toLowerCase())} yet. ${esc(cat.blurb)}`, taggable: false, showcase: true })}`;
  $$("[data-acat]", v).forEach((b) => (b.onclick = () => { assetCat = b.dataset.acat; refresh(true); }));
  wireFilesPanel(v);
}

// ------------------------------------------------------------------ client 360
let composeKind = "Note";
const presenceReader = { cid: "", id: "" };
const moreOpenFor = new Set();
function viewClient(v) {
  const c = client(R.args[0]);
  if (!c) { v.innerHTML = `<div class="crumb"><a href="#/clients">Clients</a></div><div class="empty-note">That client isn't here. <a class="btn link" href="#/clients">Back to clients</a></div>`; return; }
  const si = STAGES.indexOf(c.stage), d = dueInfo(c.next), reps = clientReports(c.id), quotes = clientQuotes(c.id), logs = S.logs[c.id] || [];
  const tech = c.tech || [], tc = { confirmed: 0, assumed: 0, unknown: 0 }; tech.forEach((t) => tc[t.status] = (tc[t.status] || 0) + 1);
  const pr = latestPresence(c.id);
  const openQ = quotes.filter((q) => q.kind === "quote" && ["draft", "sent"].includes(q.status));
  const short = c.name.replace(/ \(.*\)/, "");
  const site = siteUrl(c.website);
  const ints = c.interests || [];
  v.innerHTML = `
  <div class="crumb crumb-bar"><span><a href="#/clients">Clients</a> / ${esc(c.name)}</span><button type="button" class="btn sm p" data-viewdash>${ic("eye")}View Customer Dashboard</button></div>
  <section class="panel hero">
    <div class="hero-top">
      <div class="ident"><span class="avatar" style="background:${colorOf(c)}${c.brand?.color2 ? `;box-shadow:inset 0 0 0 3px ${esc(c.brand.color2)}` : ""}">${esc(initials(c.name))}</span>
        <div><h1>${esc(c.name)}</h1>
          <div class="facts">${c.trade ? `<span>${ic("wrench")}${esc(c.trade)}</span>` : ""}${c.town ? `<span>${ic("pin")}${esc(c.town)}</span>` : ""}${c.phone ? `<span>${ic("phone")}<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}">${esc(c.phone)}</a></span>` : ""}${c.email ? `<span>${ic("mail")}${mailLink(c.email)}</span>` : ""}${site ? `<span>${ic("globe")}<a href="${esc(site)}" target="_blank" rel="noopener">${esc(c.website.replace(/^https?:\/\//, ""))}</a></span>` : ""}</div>
          <div class="tags"><span class="chip data"><span class="d"></span>${esc(c.stage)}</span>${moduleChipsHtml(c)}${(c.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}<button class="chip dash" data-edit="details" style="cursor:pointer;border:0">${ic("pen")}Edit details</button></div></div></div>
      <div class="next ${d.cls === "over" ? "over" : ""}"><div class="k"><span class="lbl">${ic("flag")} Next step</span>${d.label ? `<span class="chip ${d.cls === "over" ? "bad" : d.cls ? "warn" : ""}">${esc(d.label)}${d.sub && d.cls !== "over" ? " · " + esc(d.sub) : ""}</span>` : ""}</div>
        <div class="w">${esc(c.next?.what || `Nothing set yet. What's the next move with ${short}?`)}</div>
        <div class="acts">${c.next?.what ? `<button class="btn sm p" data-do="done">${ic("check")}Done</button><button class="btn sm" data-do="next">${ic("cal")}${c.next.due ? "Change" : "Set date"}</button>` : `<button class="btn sm p" data-do="next">${ic("flag")}Set next step</button>`}<button class="btn sm" data-do="log">${ic("pen")}Log</button><a class="btn sm" href="#/assess?client=${esc(c.id)}">${ic("gauge")}Assess</a><button class="btn sm" data-newquote="${esc(c.id)}">${ic("file")}Quote</button></div></div>
    </div>
    <div class="stages" role="group" aria-label="Stage (tap to move)">${STAGES.map((s, i) => `${i === MAIN_COUNT ? `<span class="gap"></span>` : ""}<button class="stg ${i < si && si < MAIN_COUNT ? "past" : ""} ${i === si ? "cur" : ""} ${i >= MAIN_COUNT && i !== si ? "off" : ""}" data-stage="${esc(s)}" title="Move to ${esc(s)}"><i></i><small>${esc(STAGE_SHORT[s] || s)}</small></button>`).join("")}</div>
    <div class="strip">
      ${hasModule(c, "presence")
        ? `<div><span class="lbl">Presence score</span><b>${pr ? `${pr.score}<small class="chip ${bandCls(pr.score)}" style="height:20px">${band(pr.score)}</small>` : `<span style="font:600 14px var(--ff);color:var(--ink-3)">Not run yet</span>`}</b></div>`
        : `<div><span class="lbl">Path</span><b>${esc(pathLabel(clientPath(c)))}</b></div>`}
      <div><span class="lbl">Open quotes</span><b>${openQ.length ? money(openQ.reduce((a, q) => a + quoteTotal(q).total, 0)) : `<span style="font:600 14px var(--ff);color:var(--ink-3)">None yet</span>`}</b></div>
      ${hasModule(c, "tech_stack") ? `<div><span class="lbl">Tech confirmed</span><b>${tech.length ? `${tc.confirmed}/${tech.length}` : `<span style="font:600 14px var(--ff);color:var(--ink-3)">Discovering</span>`}</b></div>` : ""}
      <div><span class="lbl">Last touch</span><b style="font-size:16px">${esc(ago(c.lastTouch))}${c.lastTouchMeta?.channel ? ` · ${esc(c.lastTouchMeta.channel)}` : ""}</b></div>
    </div>
  </section>

  <details class="more-details" ${moreOpenFor.has(c.id + ":portal") ? "open" : ""} data-moredetails="portal"><summary>Portal access &amp; invites <small>invite links, access, follow-up grace</small></summary>
    ${portalAccessCard(c)}
    ${clientFlowCard(c)}
  </details>

  <section class="grid g3">
    <div class="panel"><div class="ph"><h2>Details</h2><button class="btn sm ghost" data-edit="details">${ic("pen")}Edit</button></div><div class="pb">
      <dl class="kv"><dt>${clientPath(c) === "personal" ? "Name" : "Business"}</dt><dd>${esc(c.name)}</dd>${c.trade ? `<dt>Trade</dt><dd>${esc(c.trade)}</dd>` : ""}${c.hq ? `<dt>HQ</dt><dd>${esc(c.hq)}</dd>` : c.town ? `<dt>Town</dt><dd>${esc(c.town)}</dd>` : ""}${c.phone ? `<dt>Phone</dt><dd class="mono">${esc(c.phone)}</dd>` : ""}${c.email ? `<dt>Email</dt><dd>${mailLink(c.email)}</dd>` : ""}${site ? `<dt>Website</dt><dd><a href="${esc(site)}" target="_blank" rel="noopener" style="color:var(--accent-ink);text-decoration:none">${esc(c.website)}</a></dd>` : ""}${(c.towns || []).length ? `<dt>Serves</dt><dd class="towns">${c.towns.map((t) => `<span>${esc(t)}</span>`).join("")}</dd>` : ""}<dt>Touched</dt><dd>Touched ${esc(ago(c.lastTouch))}${c.lastTouchMeta?.channel ? ` · ${esc(c.lastTouchMeta.channel)}` : ""}${c.lastTouchMeta?.note ? ` · ${esc(c.lastTouchMeta.note)}` : ""}</dd></dl>
      ${!c.hq && !c.phone && !site && !c.email ? `<div class="empty-note" style="margin-top:12px">Details fill in as you learn them. <button class="btn sm" data-edit="details">Add details</button></div>` : ""}</div></div>
    <div class="panel"><div class="ph"><h2>Interested in <small>${ints.length || ""}</small></h2><button class="btn sm ghost" data-int="new">${ic("plus")}Add</button></div><div class="pb">
      ${ints.length ? `<div class="ints">${ints.map((x, i) => `<button class="int" data-int="${i}" style="background:none;border:0;padding:0;text-align:left;cursor:pointer;color:inherit">${x.status === "active" ? `<span class="no">${ints.filter((y, j) => y.status === "active" && j <= i).length}</span>` : `<span class="no ghost ${x.status === "asked" ? "asked" : ""}"></span>`}<span><b>${esc(x.title)}${x.status !== "active" ? ` <span class="chip ${x.status === "asked" ? "data" : "dash"} mini">${x.status === "asked" ? "Asked about" : "Earlier idea"}</span>` : ""}</b>${x.note ? `<small>${esc(x.note)}</small>` : ""}</span><span></span></button>`).join("")}</div>`
        : `<div class="empty-note">What is ${esc(short)} hoping to fix? Add it after your first chat.<button class="btn sm" data-int="new">${ic("plus")}Add an interest</button></div>`}</div></div>
    <div class="panel"><div class="ph"><h2>Contacts <small>${(c.contacts || []).length || ""}</small></h2><button class="btn sm ghost" data-contact="new">${ic("plus")}Add</button></div><div class="pb">
      ${(c.contacts || []).length ? `<div class="people">${c.contacts.map((p, i) => `<div class="person"><span class="pa">${esc(initials(p.name))}</span><div><b>${esc(p.name)}</b>${p.channel ? ` <span class="chip ok" style="height:20px">Prefers ${esc(p.channel.toLowerCase())}</span>` : ""}<small>${esc(p.role || "")}</small>${p.phone ? `<small class="mono"><a href="tel:${esc(p.phone.replace(/[^\d+]/g, ""))}" style="text-decoration:none">${esc(p.phone)}</a></small>` : ""}${p.email ? `<small>${mailLink(p.email)}</small>` : ""}</div><button class="btn sm ghost" data-contact="${i}" aria-label="Edit ${esc(p.name)}">${ic("pen")}</button></div>`).join("")}</div>`
        : `<div class="empty-note">Who's the decision-maker?<button class="btn sm" data-contact="new">${ic("plus")}Add a contact</button></div>`}</div></div>
  </section>

  ${filesCardHtml(`clients/${c.id}`, { title: "Files", empty: `No files yet for ${esc(short)}. Drop a returned intake or a photo here — PDF or images, 20 MB each.`, taggable: true })}

  <section class="crm-cards">
    ${nextStepsCard(c)}
    ${moneyCard(c)}
  </section>

  ${onlinePresenceCardHtml(c.id, reps, presenceReader.cid === c.id ? presenceReader.id : "")}

  ${c.portal?.enabled ? tailoredPanelHtml(c) : ""}


  ${(() => {
    const vis = REPORTS.filter((t) => hasModule(c, reportModule(t.type)));
    const runType = hasModule(c, "team_bots") ? "agent-free" : (vis[0]?.type || "agent-free");
    const showQuotes = hasModule(c, "quotes") || quotes.length > 0;
    const reportsHtml = vis.length ? `<div class="panel"><div class="ph"><h2>Assessments</h2><a class="btn sm ghost" href="#/assess?client=${esc(c.id)}&type=${esc(runType)}">${ic("gauge")}Run one</a></div><div class="pb"><p style="margin:0 0 10px;font-size:12.5px;color:var(--ink-3)">Published results stay on this profile. Queue + Publish from Assess — never mixed into Assets.</p><div class="reps">${vis.map((t) => {
      const r = reps.find((x) => x.type === t.type);
      if (!r) return `<div class="rep none"><div class="rt"><span>${esc(t.name)}</span><span class="chip dash">Not run</span></div><small>${esc(t.cost)} · ${esc(t.time)}</small><a class="btn sm" href="#/assess?client=${esc(c.id)}&type=${t.type}" style="justify-self:start">${ic("play")}Run</a></div>`;
      const pub = r.status === "published";
      return `<div class="rep"><div class="rt"><span>${esc(t.name)}</span><span class="chip ${pub ? "ok" : r.status === "draft" ? "warn" : "dash"}">${esc(r.status)}</span></div>
        ${r.score != null ? `<div class="sc"><b>${r.score}</b><span class="chip ${bandCls(r.score)}">${band(r.score)}</span></div>` : ""}<small>${esc(fmtDay(r.date))}${r.cost ? " · $" + esc(r.cost) : ""}${r.pin ? " · PIN on file" : ""}</small>
        ${r.summary ? `<small style="display:block;margin-top:4px">${esc(String(r.summary).slice(0, 160))}${String(r.summary).length > 160 ? "…" : ""}</small>` : ""}
        ${r.pillars ? `<div class="pillars">${PILLARS.map(([k, n]) => r.pillars[k] != null ? `<div><span>${n}</span><b>${r.pillars[k]}</b><i><u style="width:${r.pillars[k]}%"></u></i></div>` : "").join("")}</div>` : ""}
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${r.link ? `<a class="btn sm" href="${esc(r.link)}" target="_blank" rel="noopener">${ic("link")}Open</a>` : ""}${!pub ? `<button type="button" class="btn sm p" data-publish="${esc(c.id)}/${esc(r.id)}">Publish</button>` : ""}${!pub ? `<a class="btn sm ghost" href="#/assess?client=${esc(c.id)}&type=${esc(t.type)}">Queue again</a>` : ""}</div></div>`;
    }).join("")}</div></div></div>` : "";
    const quotesHtml = showQuotes ? `<div class="panel"><div class="ph"><h2>Quotes &amp; invoices</h2><button class="btn sm ghost" data-newquote="${esc(c.id)}">${ic("plus")}New quote</button></div><div class="pb">
      ${quotes.length ? `<div class="rows">${quotes.map((q) => `<a class="rw" href="#/q/${esc(c.id)}/${esc(q.id)}" style="text-decoration:none"><span><b>${esc(q.title || "Untitled")}</b><small class="mono">${esc(q.number)} · ${esc(fmtDay(q.date))}</small></span><span class="chip ${qCls(q.status)}">${esc(q.kind === "invoice" ? "Invoice · " : "")}${esc(q.status)}</span><span class="amt">${money(quoteTotal(q).total)}</span></a>`).join("")}</div>`
        : `<div class="empty-note">No quotes yet. When ${esc(short)} is ready, draft one here in a minute.<button class="btn sm" data-newquote="${esc(c.id)}">${ic("file")}Draft a quote</button></div>`}</div></div>` : "";
    return reportsHtml || quotesHtml ? `<section class="grid g2">${reportsHtml}${quotesHtml}</section>` : "";
  })()}

  <section class="grid g2">
    <div class="panel"><div class="ph"><h2>Activity <small>${logs.length}</small></h2></div><div class="pb">
      <div class="composer"><div class="kinds" role="group" aria-label="Kind">${KINDS.map((k) => `<button type="button" data-kind="${k}" aria-pressed="${k === composeKind}">${k}</button>`).join("")}</div>
        <div class="kinds touch-chs" role="group" aria-label="Channel">${[["", "No channel"], ...TOUCH_CH].map(([k, lab]) => `<button type="button" data-ch="${esc(k)}" aria-pressed="${(window.__touchCh || "") === k}">${esc(lab)}</button>`).join("")}</div>
        <div class="row"><textarea id="compose" placeholder="What happened? e.g. Texted the owner about Thursday" rows="1"></textarea><button class="btn p" id="addLog">Add</button></div></div>
      <div class="log">${logs.map((l) => `<div class="le"><time>${esc(dayOf(l.at) || "…")}</time><div><span class="k">${esc(l.kind || "Note")}</span><p>${esc(l.text)}</p></div></div>`).join("") || `<div class="le"><time></time><div><p style="color:var(--ink-3)">Nothing logged yet.</p></div></div>`}</div></div></div>
  </section>
  <details class="more-details" ${moreOpenFor.has(c.id) ? "open" : ""} data-moredetails=""><summary>More details <small>scope, agreement, access, hours, deal terms, intake, lead source, AI setup, tech stack, contracts</small></summary>
    ${scopeLockCard(c)}
    <section class="crm-cards">
      ${agreementCard(c)}
      ${accessCard(c)}
      ${hoursCard(c)}
      ${(() => { const filled = !!(c.deal?.type || c.deal?.startDate || c.deal?.guarantee); return filled || clientPath(c) === "business" ? dealCard(c) : ""; })()}
      ${hasModule(c, "intake") ? intakeCard(c) : ""}
      ${leadCard(c)}
      ${hasModule(c, "team_bots") ? aiSetupCard(c) : ""}
    </section>
    ${hasModule(c, "tech_stack") ? `<section class="panel"><div class="ph"><h2>Tech stack <small>as discovered · ${tech.length} ${tech.length === 1 ? "system" : "systems"}</small></h2><button class="btn sm ghost" data-tech="new">${ic("plus")}Add system</button></div><div class="pb">
    ${tech.length ? `<div class="tech-bar"><i style="flex:${tc.confirmed || 0};background:var(--ok-fill)"></i><i style="flex:${tc.assumed || 0};background:repeating-linear-gradient(135deg,var(--warn-fill) 0 4px,transparent 4px 7px)"></i><i style="flex:${tc.unknown || 0};background:var(--line-strong)"></i></div>
      <div class="tech-legend"><span>Confirmed <b>${tc.confirmed}</b></span><span>Assumed <b>${tc.assumed}</b></span><span>Unknown <b>${tc.unknown}</b></span></div>
      <div class="techs">${tech.map((t, i) => `<button class="tech ${esc(t.status)}" data-tech="${i}"><span class="cat">${esc(t.category || "System")}</span><b>${esc(t.name)}</b>${t.source ? `<small>${esc(t.source)}</small>` : ""}<span class="st">${esc(TECH_ST[t.status] || t.status)}</span></button>`).join("")}</div>`
      : `<div class="empty-note">Nothing discovered yet. Add the systems you learn about (CRM, phones, payments).<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-tech="new">${ic("plus")}Add a system</button></div></div>`}</div></section>` : ""}
    <section class="grid g2">${hasModule(c, "vendors") ? `<div class="panel"><div class="ph"><h2>Contracts <small>vendors they're locked into</small></h2><button class="btn sm ghost" data-vendor="new">${ic("plus")}Add</button></div><div class="pb">
      ${(c.vendors || []).length ? c.vendors.map((x, i) => contractHtml(x, i)).join("") : `<div class="empty-note">No contracts on file. If they're tied to a vendor (a marketing agency, a website company), note the end date and notice window here.<button class="btn sm" data-vendor="new">${ic("plus")}Add a contract</button></div>`}</div></div>` : ""}</section>
  </details>
  <div style="display:flex;justify-content:center;padding-top:8px"><button class="btn sm ghost danger" id="delClient">${ic("trash")}Delete ${esc(short)}</button></div>`;

  // wiring
  $$("[data-viewdash]", v).forEach((b) => (b.onclick = () => openCustomerDashboard(c)));
  $$("[data-tl]", v).forEach((b) => (b.onclick = () => tailoredAction(c, b.dataset.tl)));
  $$("[data-tl-polish]", v).forEach((x) => (x.onchange = () => { tailoredSt[c.id] = { ...(tailoredSt[c.id] || {}), polish: x.checked }; }));
  $$("[data-moredetails]", v).forEach((d) => d.addEventListener("toggle", () => { const k = c.id + (d.dataset.moredetails ? ":" + d.dataset.moredetails : ""); d.open ? moreOpenFor.add(k) : moreOpenFor.delete(k); }));
  $$("[data-publish]", v).forEach((b) => (b.onclick = () => { const [cid, rid] = String(b.dataset.publish || "").split("/"); if (cid && rid) publishReport(cid, rid); }));
  $$("[data-presence-open]", v).forEach((b) => (b.onclick = () => {
    const next = b.dataset.presenceOpen || "";
    const same = presenceReader.cid === c.id && presenceReader.id === next;
    presenceReader.cid = c.id;
    presenceReader.id = same ? "" : next;
    refresh();
  }));
  const openRow = reps.find((r) => presenceReader.cid === c.id && r.id === presenceReader.id);
  if (openRow) fillPresenceFrame(v, openRow);
  $$("[data-stage]", v).forEach((b) => (b.onclick = async () => { const s = b.dataset.stage; if (s === c.stage) return; const from = c.stage; await save(c.id, { stage: s }); await logEntry(c.id, `Stage: ${from} → ${s}`, "Decision"); if (STAGES.indexOf(s) > STAGES.indexOf(from) && STAGES.indexOf(s) < MAIN_COUNT) confetti(); toast(`${short} → ${s}`); }));
  $$("[data-do]", v).forEach((b) => (b.onclick = () => { const a = b.dataset.do; if (a === "done") markDone(c.id); else if (a === "next") editNext(c.id); else { $("#compose").focus(); $("#compose").scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" }); } }));
  $$("[data-edit='details']", v).forEach((b) => (b.onclick = () => editDetails(c)));
  $$("[data-int]", v).forEach((b) => (b.onclick = () => editList(c, "interests", b.dataset.int)));
  $$("[data-contact]", v).forEach((b) => (b.onclick = () => editList(c, "contacts", b.dataset.contact)));
  $$("[data-tech]", v).forEach((b) => (b.onclick = () => editList(c, "tech", b.dataset.tech)));
  $$("[data-vendor]", v).forEach((b) => (b.onclick = () => editList(c, "vendors", b.dataset.vendor)));
  $$("[data-kind]", v).forEach((b) => (b.onclick = () => { composeKind = b.dataset.kind; $$("[data-kind]", v).forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
  $$("[data-ch]", v).forEach((b) => (b.onclick = () => { window.__touchCh = b.dataset.ch || ""; $$("[data-ch]", v).forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
  const addLog = async () => {
    const t = $("#compose").value.trim(); if (!t) return $("#compose").focus(); $("#compose").value = ""; $("#compose").blur();
    const ch = window.__touchCh || "";
    await logEntry(c.id, t, composeKind, ch ? { channel: ch } : null);
    toast("Logged");
  };
  $("#addLog").onclick = addLog;
  $("#compose").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addLog(); });
  // On a phone the stage track scrolls sideways; bring the current stage into view.
  const curStg = $(".stg.cur", v), track = $(".stages", v);
  if (curStg && track && track.scrollWidth > track.clientWidth + 2) { const over = curStg.offsetLeft + curStg.offsetWidth + 48 - track.clientWidth; if (over > 0) track.scrollLeft = over; }
  $("#delClient").onclick = async (e) => {
    const b = e.currentTarget;
    if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = `Tap again to delete ${short} and everything on it`; setTimeout(() => { if (b.isConnected) { b.dataset.armed = ""; b.innerHTML = `${ic("trash")}Delete ${esc(short)}`; } }, 4000); return; }
    const batch = writeBatch(db);
    for (const sub of ["log", "reports", "quotes"]) (await getDocs(collection(cref(c.id), sub))).forEach((d) => batch.delete(d.ref));
    batch.delete(cref(c.id)); await batch.commit(); toast(`${short} deleted`); location.hash = "#/clients";
  };
  wireFilesPanel(v);
  wireCrm(c, v);
  wireScopeAccessHours(c, v);
  wirePortal(c, v);
  wireClientFlow(c, v);
  wireCommon(v);
}
function portalAccessCard(c) {
  const st = portalStatusOf(c);
  const audits = (S.audit[c.id] || []).slice(0, 10);
  const canSuspend = st !== "SUSPENDED" && st !== "ARCHIVED";
  const canArchive = st !== "ARCHIVED";
  const canReact = st === "SUSPENDED" || st === "ARCHIVED";
  const blurb = st === "SUSPENDED"
    ? "SUSPENDED means an active SOW or Care Plan still exists (MSA v2.3, Privacy Notice v1.4, Starter Terms v3.3). Portal access is off. Data is kept under its existing category deadlines. Close is not triggered. Suspension does not extend a deletion deadline."
    : st === "ARCHIVED"
      ? "ARCHIVED means no active SOW or Clockworks subscription remains and Close is triggered (MSA v2.3, Privacy Notice v1.4, Starter Terms v3.3). The 90-day read-only window allows export and receipt downloads only."
      : "Suspend only while an active SOW or Care Plan exists. With no active engagement, suspend or archive becomes ARCHIVED and sets Close.";
  return `<section class="panel" id="portal-access" aria-labelledby="portal-h"><div class="ph"><h2 id="portal-h">Portal access</h2><span class="chip ${portalChip(st)}">${esc(st)}</span></div><div class="pb">
    <p style="margin:0 0 10px;color:var(--ink-2)">${blurb} CRM stage ${esc(c.stage || "—")}. ${c.lastTouch ? `Last activity ${esc(ago(c.lastTouch))}.` : "No activity yet."}</p>
    <div class="acts" style="display:flex;flex-wrap:wrap;gap:8px">
      ${canSuspend ? `<button type="button" class="btn sm" data-access="suspended">Suspend</button>` : ""}
      ${canArchive ? `<button type="button" class="btn sm" data-access="archived">Archive</button>` : ""}
      ${canReact ? `<button type="button" class="btn sm p" data-access="active">Reactivate</button>` : ""}
    </div>
    ${followUpGraceBlock(c)}
    <h3 class="audit-h">Admin audit</h3>
    ${audits.length ? `<ul class="audit-list" aria-label="Admin audit">${audits.map((row) => `<li><b>${esc(row.action || "action")}</b><span>${esc(row.atUtc || fmtUtc(row.at))} · ${esc(row.actor?.email || row.by || "—")}</span></li>`).join("")}</ul>` : `<p class="empty-note">No admin audit yet.</p>`}
  </div></section>`;
}
const graceNotes = {};
const GRACE_ERR = {
  bad_grace_days: "Grace days need to be a whole number from 1 to 3650.",
  bad_extend_days: "Extend days need to be a whole number from 1 to 3650.",
  bad_deploy_at: "That deploy date did not work.",
  bad_ends_at: "That end date did not work.",
  bad_exempt: "Exempt must be on or off.",
  bad_note: "That note did not work.",
  no_client: "That client isn't here.",
};
function graceErrText(e) {
  const msg = String(e?.message || "");
  for (const [k, v] of Object.entries(GRACE_ERR)) if (msg.includes(k)) return v;
  return msg || "That did not work.";
}
function followUpGraceBlock(c) {
  const now = new Date();
  const decision = followUpGraceDecision(c, now);
  const line = graceAdminLine(decision, now);
  const shop = shopPassKeepsPortalOpen(c);
  const deploy = decision.deployAt != null ? ymdChicago(decision.deployAt) : "";
  const endPick = decision.endsOverride != null ? ymdChicago(decision.endsOverride - 1) : "";
  const days = decision.graceDays || DEFAULT_FOLLOW_UP_GRACE_DAYS;
  const hint = shop
    ? "Shop Pass is active, so this portal stays open after grace. Iris follows portal access."
    : "Free portal stays open through the grace window, then access turns off and Iris with it. Shop Pass billing is not live, so Exempt is what keeps this portal open.";
  return `<div class="grace" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">
    <h3 style="margin:0 0 6px;font-size:15px">Follow-Up grace</h3>
    <p id="grace-status" style="margin:0 0 6px"><b>${esc(line)}</b></p>
    <p style="margin:0 0 10px;color:var(--ink-3);font-size:13px">${esc(hint)}</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end">
      <label style="display:grid;gap:4px;font-size:12px;color:var(--ink-3)">Deploy date
        <input id="grace-deploy" type="date" value="${esc(deploy)}" autocomplete="off">
      </label>
      <button type="button" class="btn sm" data-grace="today">Today</button>
      <button type="button" class="btn sm" data-grace="deploy">Save deploy date</button>
      <button type="button" class="btn sm ghost" data-grace="clear-deploy">Clear deploy date</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-top:8px">
      <label style="display:grid;gap:4px;font-size:12px;color:var(--ink-3)">Grace days
        <input id="grace-days" type="number" min="1" max="3650" step="1" value="${esc(String(days))}" inputmode="numeric" style="width:6rem">
      </label>
      <button type="button" class="btn sm" data-grace="days">Save days</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-top:8px">
      <label style="display:grid;gap:4px;font-size:12px;color:var(--ink-3)">Extend by days
        <input id="grace-extend" type="number" min="1" max="3650" step="1" value="7" inputmode="numeric" style="width:6rem">
      </label>
      <button type="button" class="btn sm" data-grace="extend">Extend</button>
      <label style="display:grid;gap:4px;font-size:12px;color:var(--ink-3)">End date
        <input id="grace-end" type="date" value="${esc(endPick)}" autocomplete="off">
      </label>
      <button type="button" class="btn sm" data-grace="end">Set end date</button>
      <button type="button" class="btn sm ghost" data-grace="clear-end">Clear end date</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-top:8px">
      <label style="display:grid;gap:4px;font-size:12px;color:var(--ink-3);flex:1;min-width:12rem">Note
        <input id="grace-note" type="text" maxlength="300" value="${esc(decision.note || "")}" autocomplete="off">
      </label>
      <button type="button" class="btn sm" data-grace="note">Save note</button>
      ${decision.exempt
        ? `<button type="button" class="btn sm" data-grace="clear-exempt">Clear exempt</button>`
        : `<button type="button" class="btn sm p" data-grace="exempt">Exempt</button>`}
    </div>
    <p id="grace-msg" role="status" style="margin:8px 0 0;color:var(--ink-2)">${esc(graceNotes[c.id] || "")}</p>
  </div>`;
}
const flowNotes = {};
function sayFlow(cid, t) {
  flowNotes[cid] = t;
  const live = document.getElementById("flow-status");
  if (live) live.textContent = t;
}
function clientFlowCard(c) {
  const email = c.email || (c.contacts || []).map((p) => p.email).find(Boolean) || "";
  const contact = (c.contacts || []).find((p) => p.name && (!email || p.email === email))?.name || "";
  const fx = c.fixture === true;
  const note = flowNotes[c.id] || "";
  return `<section class="panel" id="client-flow" aria-labelledby="flow-h"><div class="ph"><h2 id="flow-h">Client flow</h2></div><div class="pb">
    <p style="margin:0 0 10px;color:var(--ink-2)">Invite links expire after ${SWAP.inviteExpiryDays} days. Resend cancels the prior link. Scheduling and email-code marks stay on local fixtures.</p>
    <label for="flow-contact">Contact name (goes on their agreement)</label>
    <input id="flow-contact" type="text" value="${esc(contact)}" autocomplete="off" maxlength="120" placeholder="First and last name">
    <label for="flow-email" style="margin-top:8px;display:block">Invite email</label>
    <input id="flow-email" type="email" value="${esc(email)}" autocomplete="off">
    <p style="margin:6px 0 0;color:var(--ink-2);font-size:13px">Business name on the agreement: <b>${esc(c.name || "")}</b> (edit the client name to change it).</p>
    <div class="acts" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
      <button type="button" class="btn sm" data-flow="invite">Issue invite</button>
      <button type="button" class="btn sm" data-flow="resend">Resend invite</button>
      <button type="button" class="btn sm" data-flow="intake">Issue intake</button>
    </div>
    ${fx ? `<div class="acts" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
      <button type="button" class="btn sm" data-flow="msa">Mark MSA email-signed</button>
      <button type="button" class="btn sm" data-flow="sow">Mark SOW email-signed</button>
    </div>
    <label for="flow-when">Proposed time</label>
    <input id="flow-when" type="text" maxlength="160" autocomplete="off">
    <div class="acts" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
      <button type="button" class="btn sm" data-flow="set-time">Set time</button>
      <button type="button" class="btn sm" data-flow="confirm-time">Confirm time</button>
      <button type="button" class="btn sm" data-flow="declined">Decline</button>
      <button type="button" class="btn sm" data-flow="withdrawn">Record withdrawal</button>
    </div>` : `<p class="empty-note">Email-code signing and scheduling stay off unless this client is a local fixture.</p>`}
    <p role="status" id="flow-status">${esc(note)}</p>
  </div></section>`;
}
const issuedFlash = {};
function fmtChicago(ms) {
  if (ms == null || ms === "") return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(d) + " CT";
}
const INVITE_EVENT = {
  issued: "Issued", sent: "Sent", opened: "Opened", code_sent: "Code emailed",
  verified: "Email verified", credential_linked: "Signed in", failed_attempt: "Didn't finish", revoked: "Revoked",
};
function boundPhrase(row) {
  if (row?.boundMethod === "apple") return "Apple";
  return row?.boundMethod || "";
}
function inviteChip(status) {
  const label = status === "live" ? "Live" : status === "used" ? "Used" : status === "expired" ? "Expired" : status === "revoked" ? "Revoked" : status || "—";
  const color = status === "live" ? "var(--ok, #2f7d4a)" : status === "used" ? "var(--ink-2)" : status === "revoked" ? "var(--bad, #9a3412)" : "var(--warn, #9a6700)";
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid ${color};color:${color};font:600 12px/1.4 var(--fm, sans-serif)">${esc(label)}</span>`;
}
/** No email is sent from the portal: show the one-time link and the short code so Parker can text or email them himself. */
function showInviteLink(v, link, displayCode) {
  if (!link && !displayCode) return;
  let box = $("#flow-link", v);
  if (!box) { box = document.createElement("div"); box.id = "flow-link"; box.style.cssText = "margin-top:10px;display:grid;gap:8px"; $("#flow-status", v)?.after(box); }
  box.innerHTML = `${displayCode ? `<p style="margin:0;font:600 28px/1.2 ui-monospace,monospace;letter-spacing:.14em" aria-label="Invite code">${esc(displayCode)}</p>` : ""}
    <div style="display:flex;gap:8px;align-items:center">
      <input type="text" readonly value="${esc(link || "")}" aria-label="Invite link" style="flex:1;min-width:0;font-family:var(--fm, monospace);font-size:12px">
      ${displayCode ? `<button type="button" class="btn sm" data-copy-code>Copy code</button>` : ""}
      <button type="button" class="btn sm" data-copy-link>Copy link</button>
    </div>`;
  const copy = async (ev, text) => {
    try { await navigator.clipboard.writeText(text); ev.currentTarget.textContent = "Copied"; }
    catch { box.querySelector("input")?.select(); }
  };
  box.querySelector("[data-copy-link]")?.addEventListener("click", (ev) => copy(ev, link || ""));
  box.querySelector("[data-copy-code]")?.addEventListener("click", (ev) => copy(ev, displayCode || ""));
}
let ledgerGen = 0;
async function renderInviteLedger(c, v) {
  const gen = ++ledgerGen;
  let host = $("#invite-ledger", v);
  if (!host) {
    host = document.createElement("div");
    host.id = "invite-ledger";
    host.style.cssText = "margin-top:14px;display:grid;gap:10px";
    const pb = $("#client-flow .pb", v) || v;
    pb.appendChild(host);
  }
  host.innerHTML = `<p style="margin:0;color:var(--ink-3)">Loading invites…</p>`;
  let rows = [];
  try { rows = await callFn("adminListInvites", { cid: c.id }); }
  catch (e) {
    if (gen !== ledgerGen || !host.isConnected) return;
    host.innerHTML = `<p style="margin:0;color:var(--bad)">Couldn't load invites. ${esc(e.message || "")}</p>`;
    return;
  }
  if (gen !== ledgerGen || !host.isConnected) return;
  const rank = { live: 0, used: 1, expired: 2, revoked: 3 };
  rows = (Array.isArray(rows) ? rows : []).slice().sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || (b.createdAt || 0) - (a.createdAt || 0));
  if (!rows.length) { host.innerHTML = `<p class="empty-note">No invites yet.</p>`; return; }
  host.innerHTML = `<h3 style="margin:0;font-size:15px">Invites</h3>` + rows.map((row) => {
    const events = (row.events || []).map((ev) => {
      const label = INVITE_EVENT[ev.type] || ev.type;
      const extra = [ev.method, ev.reason].filter(Boolean).join(" · ");
      return `<li>${esc(label)} · ${esc(fmtChicago(ev.at))}${extra ? ` · ${esc(extra)}` : ""}</li>`;
    }).join("");
    const canRevoke = row.status === "live" || row.status === "expired";
    return `<article style="border:1px solid var(--line);border-radius:10px;padding:10px 12px" data-invite-id="${esc(row.id)}">
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${inviteChip(row.status)}
        <b style="font-family:ui-monospace,monospace;letter-spacing:.08em">${esc(row.displayCode || "—")}</b>
        <span style="color:var(--ink-2)">${esc(row.email || "")}</span></div>
      <p style="margin:6px 0 0;color:var(--ink-2);font-size:13px">Client ${esc(row.cid || c.id)} · expires ${esc(fmtChicago(row.expiresAt))}${row.usedAt ? ` · used ${esc(fmtChicago(row.usedAt))}${row.boundMethod ? ` with ${esc(boundPhrase(row))}` : ""}${row.usedBy ? ` · ${esc(row.usedBy)}` : ""}` : ""}${row.revokedAt ? ` · revoked ${esc(fmtChicago(row.revokedAt))}` : ""}</p>
      ${row.appleRelayEmail ? `<p style="margin:6px 0 0;color:var(--ink-2);font-size:13px">Signed in with Apple. Private relay ${esc(row.appleRelayEmail)}. The invite email above is still the portal address.</p>` : ""}
      ${events ? `<ol style="margin:8px 0 0;padding-left:18px;color:var(--ink-2);font-size:13px">${events}</ol>` : ""}
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
        ${canRevoke ? `<button type="button" class="btn sm" data-revoke="${esc(row.id)}">Revoke</button>` : ""}
        <button type="button" class="btn sm" data-reissue="${esc(row.id)}">Re-issue</button>
        ${row.status === "live" && !row.sentAt ? `<button type="button" class="btn sm" data-mark-sent="${esc(row.id)}">Mark sent</button>` : ""}
      </div>
    </article>`;
  }).join("");
  host.querySelectorAll("[data-revoke]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try {
      await callFn("adminRevokeInvite", { id: b.dataset.revoke });
      sayFlow(c.id, "Invite revoked. Used invites stay in the history.");
      renderInviteLedger(c, v);
    } catch (e) { b.disabled = false; sayFlow(c.id, e.message || "Revoke did not work."); }
  }));
  host.querySelectorAll("[data-reissue]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try {
      const contactName = ($("#flow-contact", v)?.value || "").trim();
      const r = await callFn("adminReissueInvite", { id: b.dataset.reissue, contactName });
      issuedFlash[c.id] = { link: r.link, displayCode: r.displayCode, expiresAt: r.expiresAt };
      sayFlow(c.id, `New code ${r.displayCode || ""}. The previous live invite is dead. Used rows stay.`);
      showInviteLink(v, r.link, r.displayCode);
      renderInviteLedger(c, v);
    } catch (e) { b.disabled = false; sayFlow(c.id, e.message || "Re-issue did not work."); }
  }));
  host.querySelectorAll("[data-mark-sent]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try {
      await callFn("adminMarkInviteSent", { id: b.dataset.markSent });
      sayFlow(c.id, "Marked sent. Nothing was emailed from here.");
      renderInviteLedger(c, v);
    } catch (e) { b.disabled = false; sayFlow(c.id, e.message || "Mark sent did not work."); }
  }));
}
function wireClientFlow(c, v) {
  const say = (t) => {
    flowNotes[c.id] = t;
    const live = document.getElementById("flow-status");
    if (live) live.textContent = t;
  };
  const emailOf = () => ($("#flow-email", v)?.value || "").trim();
  $$("[data-flow]", v).forEach((b) => (b.onclick = async () => {
    const k = b.dataset.flow;
    try {
      if (k === "invite" || k === "resend") {
        const contactName = ($("#flow-contact", v)?.value || "").trim();
        if (!contactName) { say("Add the contact's name first. It goes on their agreement."); $("#flow-contact", v)?.focus(); return; }
        const r = await callFn(k === "invite" ? "adminCreateInvite" : "adminResendInvite", { cid: c.id, email: emailOf(), contactName, role: "owner" });
        issuedFlash[c.id] = { link: r.link, displayCode: r.displayCode, expiresAt: r.expiresAt };
        say(k === "resend"
          ? `Resent ${r.displayCode || ""}. Prior open links cancelled (${r.invalidated || 0}).`
          : `Invite issued. Code ${r.displayCode || ""}. Copy it below and send it yourself.`);
        showInviteLink(v, r.link, r.displayCode);
        renderInviteLedger(c, v);
      } else if (k === "intake") {
        const r = await callFn("adminIssueIntake", { cid: c.id });
        say(r.already ? "An intake is already open." : "Intake issued.");
      } else if (k === "msa" || k === "sow") {
        await callFn("adminMarkEmailSigned", { cid: c.id, which: k });
        say(k === "msa" ? "MSA marked email-signed." : "SOW marked email-signed.");
      } else if (k === "set-time") {
        const whenLabel = ($("#flow-when", v)?.value || "").trim();
        await callFn("adminSetSchedule", { cid: c.id, whenLabel });
        say("Time set. The client can see it in the portal.");
      } else if (k === "confirm-time") {
        await callFn("adminConfirmSchedule", { cid: c.id });
        say("Time confirmed.");
      } else if (k === "declined" || k === "withdrawn") {
        await callFn("adminSetEngagementOutcome", { cid: c.id, outcome: k });
        say(k === "declined" ? "Marked declined." : "Marked withdrawn.");
      }
    } catch (e) { say(e.message || "That did not work."); }
  }));
  const flash = issuedFlash[c.id];
  if (flash) showInviteLink(v, flash.link, flash.displayCode);
  renderInviteLedger(c, v);
}
function wirePortal(c, v) {
  $$("[data-access]", v).forEach((b) => (b.onclick = () => {
    const state = b.dataset.access;
    const title = state === "active" ? "Reactivate portal" : state === "suspended" ? "Suspend portal" : "Archive portal";
    const intro = state === "suspended"
      ? "Suspend only while an active SOW or Care Plan exists (MSA v2.3, Privacy Notice v1.4, Starter Terms v3.3). Portal access turns off and every session ends. Data stays and Close is not triggered. With no active engagement this action becomes ARCHIVED and sets Close."
      : state === "archived"
        ? "ARCHIVED means no active SOW or Clockworks subscription remains and Close is triggered (MSA v2.3, Privacy Notice v1.4, Starter Terms v3.3). Access turns off, every session ends, and the 90-day read-only export window starts."
        : "Access turns back on. Previous sessions stay revoked.";
    formDialog({
      title, intro,
      fields: [{ k: "reason", label: "Reason", type: "textarea", full: true, required: true }],
      submit: "Confirm",
      onSave: async (d) => {
        if (!d.reason) throw new Error("A reason is required.");
        await callFn("adminSetPortalAccess", { cid: c.id, state, reason: d.reason });
        toast(title);
      },
    });
  }));
  const graceSay = (t) => {
    graceNotes[c.id] = t;
    const live = document.getElementById("grace-msg");
    if (live) live.textContent = t;
  };
  const graceVal = (id) => ($(id, v)?.value || "").trim();
  $$("[data-grace]", v).forEach((b) => (b.onclick = async () => {
    const k = b.dataset.grace;
    const payload = { cid: c.id };
    if (k === "today" || k === "deploy") {
      const deployAt = k === "today" ? ymdChicago(Date.now()) : graceVal("#grace-deploy");
      if (!deployAt) { graceSay("Pick a deploy date."); return; }
      if (k === "today") { const input = $("#grace-deploy", v); if (input) input.value = deployAt; }
      payload.deployAt = deployAt;
    } else if (k === "clear-deploy") payload.clearDeployAt = true;
    else if (k === "days") {
      const graceDays = Number(graceVal("#grace-days"));
      if (!Number.isInteger(graceDays) || graceDays < 1) { graceSay("Grace days need to be a whole number from 1 to 3650."); return; }
      payload.graceDays = graceDays;
    } else if (k === "extend") {
      const extendDays = Number(graceVal("#grace-extend"));
      if (!Number.isInteger(extendDays) || extendDays < 1) { graceSay("Extend days need to be a whole number from 1 to 3650."); return; }
      payload.extendDays = extendDays;
    } else if (k === "end") {
      const endsAt = graceVal("#grace-end");
      if (!endsAt) { graceSay("Pick an end date."); return; }
      payload.endsAt = endsAt;
    } else if (k === "clear-end") payload.clearEndsAt = true;
    else if (k === "note") payload.note = graceVal("#grace-note");
    else if (k === "exempt") payload.exempt = true;
    else if (k === "clear-exempt") payload.exempt = false;
    else return;
    b.disabled = true;
    try {
      const r = await callFn("adminSetFollowUpGrace", payload);
      graceSay(r?.graceBoot ? "Saved. Portal access is off." : "Saved.");
      toast("Follow-Up grace saved");
    } catch (e) {
      graceSay(graceErrText(e));
    } finally {
      if (b.isConnected) b.disabled = false;
    }
  }));
}

// ------------------------------------------------------------------ CRM cards (additive fields; missing = fine)

function scopeLockCard(c) {
  const path = clientPath(c);
  const eng = clientEngagement(c);
  const mods = c.modules || seedModules(path, eng);
  const onCount = SCOPE_ROWS.filter(([id]) => hasModule(c, id)).length;
  const rows = SCOPE_ROWS.map(([id, label]) => {
    const on = hasModule(c, id);
    return `<label class="scope-row"><input type="checkbox" data-scope="${esc(id)}" ${on ? "checked" : ""}><span class="scope-lab">${esc(label)}</span><span class="chip ${on ? "ok" : "dash"} mini">${on ? "On" : "Off"}</span></label>`;
  }).join("");
  return `<section class="panel scope-lock"><div class="ph"><h2>Scope lock <small>${onCount} of ${SCOPE_ROWS.length} on</small></h2><button class="btn sm ghost" data-crm="scope">${ic("pen")}Edit</button></div><div class="pb">
    <div class="scope-list">${rows}</div>
    ${c.scopeNote ? `<p class="scope-note">${esc(c.scopeNote)}</p>` : `<p class="scope-note muted">Optional note on what's in / out of scope.</p>`}
  </div></section>`;
}
function moneyCard(c) {
  const m = moneyTruth(c);
  const st = m?.status ? `<span class="chip ${m.status === "paid" || m.status === "comp" ? "ok" : m.status === "partial" ? "warn" : "dash"}">${esc(labelOf(MONEY_ST, m.status))}</span>` : "";
  const has = !!(m && (m.status || m.owed != null || m.paid != null || m.home || m.nextInvoice?.amount != null));
  return `<div class="panel crm-card"><div class="ph"><h2>Money</h2><button class="btn sm ghost" data-crm="money">${ic("pen")}Edit</button></div><div class="pb">
    ${has ? `<div class="stat-row"><div><span class="lbl">Owed</span><b class="mono">${m.owed != null ? money(m.owed) : "—"}</b></div><div><span class="lbl">Paid</span><b class="mono">${m.paid != null ? money(m.paid) : "—"}</b></div><div><span class="lbl">Status</span><b>${st || "—"}</b></div></div>
      <dl class="kv" style="margin-top:10px">${m.nextInvoice?.amount != null || m.nextInvoice?.due || m.nextInvoice?.label ? `<dt>Next invoice</dt><dd class="mono">${m.nextInvoice.amount != null ? money(m.nextInvoice.amount) : "—"}${m.nextInvoice.due ? ` · due ${esc(fmtDay(m.nextInvoice.due))}` : ""}${m.nextInvoice.label ? ` · ${esc(m.nextInvoice.label)}` : ""}</dd>` : ""}${m.home || m.homeNote ? `<dt>Lives</dt><dd>${esc(m.home || "—")}${m.homeNote ? ` · ${esc(m.homeNote)}` : ""}</dd>` : ""}${m._fromPayment ? `<dt></dt><dd><small style="color:var(--ink-3)">From legacy payment · edit to upgrade</small></dd>` : ""}</dl>`
      : `<div class="empty-note">Owed, paid, next invoice — operator truth, not QuickBooks.<button class="btn sm" data-crm="money">${ic("pen")}Set money</button></div>`}</div></div>`;
}
function agreementCard(c) {
  const a = c.agreement || {};
  const st = a.status || "none";
  const chip = `<span class="chip ${st === "signed" ? "ok" : st === "sent" || st === "draft" ? "data" : st === "expired" ? "warn" : "dash"}">${esc(labelOf(AGREE_ST, st))}</span>`;
  const filled = st !== "none" || a.sentAt || a.signedAt || a.expiresAt || a.note;
  return `<div class="panel crm-card"><div class="ph"><h2>Agreement</h2><button class="btn sm ghost" data-crm="agreement">${ic("pen")}Edit</button></div><div class="pb">
    ${filled ? `<dl class="kv"><dt>Status</dt><dd>${chip}</dd>${a.sentAt ? `<dt>Sent</dt><dd>${esc(fmtDay(a.sentAt))}</dd>` : ""}${a.signedAt ? `<dt>Signed</dt><dd>${esc(fmtDay(a.signedAt))}</dd>` : ""}${a.expiresAt ? `<dt>Expires</dt><dd>${esc(fmtDay(a.expiresAt))}</dd>` : ""}${a.note ? `<dt>Note</dt><dd>${esc(a.note)}</dd>` : ""}</dl>`
      : `<div class="empty-note">Draft / sent / signed — separate from Assets → Agreements files.<button class="btn sm" data-crm="agreement">${ic("pen")}Set status</button></div>`}</div></div>`;
}
function accessCard(c) {
  const rows = c.access || [];
  return `<div class="panel crm-card" style="grid-column:1/-1"><div class="ph"><h2>Access <small>${rows.length || ""}</small></h2><button class="btn sm ghost" data-access="new">${ic("plus")}Add</button></div><div class="pb">
    ${rows.length ? `<div class="access-grid">${rows.map((r) => {
      const stCls = r.status === "shared" ? "ok" : r.status === "requested" ? "data" : r.status === "revoked" ? "bad" : "dash";
      return `<button type="button" class="access-tile" data-access="${esc(r.id)}">${accessLogoHtml(r.logoKey, r.system)}<span class="access-meta"><b>${esc(r.system || "System")}</b><span class="chip ${stCls} mini">${esc(labelOf(ACCESS_ST, r.status || "na"))}</span>${r.revokeNote && r.status === "revoked" ? `<small class="rev">${esc(r.revokeNote)}</small>` : ""}${r.notes ? `<small>${esc(r.notes)}</small>` : ""}</span></button>`;
    }).join("")}</div>`
      : `<div class="empty-note">What systems have they shared? Gmail, Quo, calendar…<button class="btn sm" data-access="new">${ic("plus")}Add access</button></div>`}</div></div>`;
}
function hoursCard(c) {
  const h = c.hours || {};
  const rows = (S.timeLogs[c.id] || []).slice(0, 8);
  const has = h.total != null || rows.length;
  return `<div class="panel crm-card" style="grid-column:1/-1"><div class="ph"><h2>Hours <small>${h.total != null ? h.total + "h total" : ""}</small></h2><button class="btn sm ghost" data-time="new">${ic("plus")}Add time</button></div><div class="pb">
    ${has ? `<div class="stat-row"><div><span class="lbl">Face</span><b class="mono">${h.face != null ? h.face + "h" : "—"}</b></div><div><span class="lbl">Build</span><b class="mono">${h.build != null ? h.build + "h" : "—"}</b></div><div><span class="lbl">Total</span><b class="mono">${h.total != null ? h.total + "h" : "—"}</b></div></div>
      ${rows.length ? `<div class="time-list">${rows.map((r) => `<div class="time-row"><span class="chip dash mini">${esc(labelOf(TIME_KINDS, r.kind || "other"))}</span><b class="mono">${esc(String(r.hours))}h</b><span>${esc(r.who || "")}${r.note ? ` · ${esc(r.note)}` : ""}</span><small>${esc(fmtDay((toDate(r.at) || new Date()).toISOString().slice(0, 10)))}</small><span class="ns-acts"><button type="button" class="btn sm ghost" data-time="${esc(r.id)}" aria-label="Edit">${ic("pen")}</button><button type="button" class="btn sm ghost danger" data-time-del="${esc(r.id)}" aria-label="Delete">${ic("trash")}</button></span></div>`).join("")}</div>` : ""}`
      : `<div class="empty-note">Face time vs build time. Add a call, text, or fleet hours.<button class="btn sm" data-time="new">${ic("plus")}Add time</button></div>`}</div></div>`;
}

function dealCard(c) {
  const d = c.deal || {};
  return `<div class="panel crm-card"><div class="ph"><h2>Deal terms</h2><button class="btn sm ghost" data-crm="deal">${ic("pen")}Edit</button></div><div class="pb">
    ${d.type || d.startDate || d.guarantee ? `<dl class="kv">${d.type ? `<dt>Type</dt><dd><span class="chip acc">${esc(labelOf(DEAL_TYPES, d.type))}</span></dd>` : ""}${d.startDate ? `<dt>Start</dt><dd>${esc(fmtDay(d.startDate))}</dd>` : ""}${d.guarantee ? `<dt>Guarantee</dt><dd>${esc(d.guarantee)}</dd>` : ""}</dl>`
      : `<div class="empty-note">No deal on file yet.<button class="btn sm" data-crm="deal">${ic("pen")}Set deal terms</button></div>`}</div></div>`;
}
function paymentCard(c) {
  const p = c.payment || {};
  const st = p.status ? `<span class="chip ${p.status === "paid" ? "ok" : p.status === "refunded" ? "warn" : "dash"}">${esc(labelOf(PAY_ST, p.status))}</span>` : "";
  return `<div class="panel crm-card"><div class="ph"><h2>Payment</h2><button class="btn sm ghost" data-crm="payment">${ic("pen")}Edit</button></div><div class="pb">
    ${p.status || p.amount != null || p.date ? `<dl class="kv">${p.status ? `<dt>Status</dt><dd>${st}</dd>` : ""}${p.amount != null && p.amount !== "" ? `<dt>Amount</dt><dd class="mono">${money(p.amount)}</dd>` : ""}${p.date ? `<dt>Date</dt><dd>${esc(fmtDay(p.date))}</dd>` : ""}</dl>`
      : `<div class="empty-note">No payment logged.<button class="btn sm" data-crm="payment">${ic("pen")}Log payment</button></div>`}</div></div>`;
}
function intakeCard(c) {
  const i = c.intake || {};
  const st = i.status || "not-sent";
  const chip = `<span class="chip ${st === "reviewed" ? "ok" : st === "returned" ? "acc" : st === "sent" ? "data" : "dash"}">${esc(labelOf(INTAKE_ST, st))}</span>`;
  return `<div class="panel crm-card"><div class="ph"><h2>Intake</h2><button class="btn sm ghost" data-crm="intake">${ic("pen")}Edit</button></div><div class="pb">
    <dl class="kv"><dt>Status</dt><dd>${chip}</dd>${i.sentAt ? `<dt>Sent</dt><dd>${esc(fmtDay(i.sentAt))}</dd>` : ""}${i.returnedAt ? `<dt>Returned</dt><dd>${esc(fmtDay(i.returnedAt))}</dd>` : ""}${i.reviewedAt ? `<dt>Reviewed</dt><dd>${esc(fmtDay(i.reviewedAt))}</dd>` : ""}</dl>
  </div></div>`;
}
function leadCard(c) {
  const l = c.lead || {};
  const ref = l.referrer || {};
  const refBits = l.source === "referral" && (ref.name || ref.company || ref.phone || ref.email || ref.note);
  return `<div class="panel crm-card"><div class="ph"><h2>Lead source</h2><button class="btn sm ghost" data-crm="lead">${ic("pen")}Edit</button></div><div class="pb">
    ${l.source || l.note || refBits ? `<dl class="kv">${l.source ? `<dt>Source</dt><dd><span class="chip data">${esc(labelOf(LEAD_SRC, l.source))}</span></dd>` : ""}${l.note ? `<dt>Note</dt><dd>${esc(l.note)}</dd>` : ""}${refBits ? `${ref.name ? `<dt>Referrer</dt><dd>${esc(ref.name)}${ref.company ? ` · ${esc(ref.company)}` : ""}</dd>` : ""}${ref.phone ? `<dt>Ref phone</dt><dd class="mono">${esc(ref.phone)}</dd>` : ""}${ref.email ? `<dt>Ref email</dt><dd>${mailLink(ref.email)}</dd>` : ""}${ref.note ? `<dt>Ref note</dt><dd>${esc(ref.note)}</dd>` : ""}` : ""}</dl>`
      : `<div class="empty-note">Where did they come from?<button class="btn sm" data-crm="lead">${ic("pen")}Set source</button></div>`}</div></div>`;
}
function nextStepsCard(c) {
  const steps = (c.nextSteps || []).slice().sort((a, b) => Number(a.done) - Number(b.done) || String(a.due || "9999").localeCompare(String(b.due || "9999")));
  const open = steps.filter((x) => !x.done).length;
  return `<div class="panel crm-card"><div class="ph"><h2>Next steps <small>${open ? open + " open" : ""}</small></h2><button class="btn sm ghost" data-ns="new">${ic("plus")}Add</button></div><div class="pb">
    ${steps.length ? `<div class="ns-list">${steps.map((x) => {
      const di = x.due ? dueInfo({ what: x.text, due: x.due }) : { cls: "", label: "" };
      return `<div class="ns-row ${x.done ? "done" : ""}"><button type="button" class="btn sm ghost" data-ns-tog="${esc(x.id)}" aria-label="Toggle done">${ic(x.done ? "check" : "cal")}</button>
        <div><b>${esc(x.text)}</b>${x.due ? `<small class="${di.cls === "over" ? "chip bad" : ""}" style="display:inline-block;margin-top:3px">${esc(di.label || fmtDay(x.due))}${di.sub ? " · " + esc(di.sub) : ""}</small>` : ""}</div>
        <div class="ns-acts"><button type="button" class="btn sm ghost" data-ns-edit="${esc(x.id)}" aria-label="Edit">${ic("pen")}</button><button type="button" class="btn sm ghost danger" data-ns-del="${esc(x.id)}" aria-label="Delete">${ic("trash")}</button></div></div>`;
    }).join("")}</div>` : `<div class="empty-note">Track the little moves here. Big next-step still lives up top.<button class="btn sm" data-ns="new">${ic("plus")}Add a step</button></div>`}</div></div>`;
}
function aiSetupCard(c) {
  const a = c.aiSetup || {};
  return `<div class="panel crm-card" style="grid-column:1/-1"><div class="ph"><h2>AI setup checklist</h2><small style="color:var(--ink-3)">Teams module</small></div><div class="pb"><div class="ai-checks">
    ${AI_SETUP.map(([k, label]) => {
      const on = !!(a[k] && a[k].done);
      const when = a[k]?.date ? fmtDay(a[k].date) : "";
      return `<button type="button" class="ai-check ${on ? "on" : ""}" data-ai="${k}"><span class="box">${on ? ic("check") : ""}</span><span><b>${esc(label)}</b>${when ? `<small> · ${esc(when)}</small>` : ""}</span></button>`;
    }).join("")}
  </div></div></div>`;
}
function wireCrm(c, v) {
  $$("[data-crm]", v).forEach((b) => (b.onclick = () => editCrm(c, b.dataset.crm)));
  $$("[data-ns='new']", v).forEach((b) => (b.onclick = () => editNextStep(c, null)));
  $$("[data-ns-edit]", v).forEach((b) => (b.onclick = () => editNextStep(c, b.dataset.nsEdit)));
  $$("[data-ns-tog]", v).forEach((b) => (b.onclick = async () => {
    const arr = (c.nextSteps || []).map((x) => x.id === b.dataset.nsTog ? { ...x, done: !x.done } : x);
    await save(c.id, { nextSteps: arr }); toast(arr.find((x) => x.id === b.dataset.nsTog)?.done ? "Done." : "Reopened.");
  }));
  $$("[data-ns-del]", v).forEach((b) => (b.onclick = async (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.armed !== "1") { btn.dataset.armed = "1"; btn.textContent = "Again"; setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ""; btn.innerHTML = ic("trash"); } }, 4000); return; }
    await save(c.id, { nextSteps: (c.nextSteps || []).filter((x) => x.id !== btn.dataset.nsDel) }); toast("Step removed.");
  }));
  $$("[data-ai]", v).forEach((b) => (b.onclick = async () => {
    const k = b.dataset.ai; const cur = { ...(c.aiSetup || {}) }; const was = !!(cur[k] && cur[k].done);
    cur[k] = was ? { done: false, date: "" } : { done: true, date: todayISO() };
    await save(c.id, { aiSetup: cur }); toast(was ? "Unchecked." : "Checked.");
  }));
}
function editCrm(c, kind) {
  if (kind === "deal") {
    const d = c.deal || {};
    formDialog({ title: "Deal terms", values: { type: d.type || "", startDate: d.startDate || "", guarantee: d.guarantee || "" },
      fields: [{ k: "type", label: "Type", type: "select", options: [["", "—"], ...DEAL_TYPES] }, { k: "startDate", label: "Start date", type: "date" }, { k: "guarantee", label: "Guarantee", full: true, placeholder: "e.g. 30-day make-it-right" }],
      onSave: async (x) => { await save(c.id, { deal: { type: x.type || "", startDate: x.startDate || "", guarantee: x.guarantee || "" } }); toast("Deal saved."); } });
  } else if (kind === "payment") {
    const p = c.payment || {};
    formDialog({ title: "Payment", values: { status: p.status || "unpaid", amount: p.amount != null ? String(p.amount) : "", date: p.date || "" },
      fields: [{ k: "status", label: "Status", type: "select", options: PAY_ST }, { k: "amount", label: "Amount (USD)", placeholder: "1500" }, { k: "date", label: "Date", type: "date" }],
      onSave: async (x) => { const amount = x.amount === "" ? null : Number(String(x.amount).replace(/[^\d.]/g, "")); await save(c.id, { payment: { status: x.status || "unpaid", amount: Number.isFinite(amount) ? amount : null, date: x.date || "" } }); toast("Payment saved."); } });
  } else if (kind === "intake") {
    const i = c.intake || {};
    formDialog({ title: "Intake", values: { status: i.status || "not-sent", sentAt: i.sentAt || "", returnedAt: i.returnedAt || "", reviewedAt: i.reviewedAt || "" },
      fields: [{ k: "status", label: "Status", type: "select", options: INTAKE_ST }, { k: "sentAt", label: "Sent", type: "date" }, { k: "returnedAt", label: "Returned", type: "date" }, { k: "reviewedAt", label: "Reviewed", type: "date" }],
      onSave: async (x) => {
        const next = x.status || "not-sent";
        const cur = i.status || "not-sent";
        // Never silently downgrade from reviewed via this form either — warn and keep reviewed unless they pick reviewed or confirm... brief says never downgrade reviewed from file hook; form can set explicitly.
        const patch = { status: next, sentAt: x.sentAt || "", returnedAt: x.returnedAt || "", reviewedAt: x.reviewedAt || "" };
        if (next === "returned" && !patch.returnedAt) patch.returnedAt = todayISO();
        if (next === "sent" && !patch.sentAt) patch.sentAt = todayISO();
        if (next === "reviewed" && !patch.reviewedAt) patch.reviewedAt = todayISO();
        await save(c.id, { intake: patch }); toast("Intake saved.");
      } });
  } else if (kind === "lead") {
    const l = c.lead || {};
    const ref = l.referrer || {};
    formDialog({ title: "Lead source", values: { source: l.source || "", note: l.note || "", refName: ref.name || "", refCompany: ref.company || "", refPhone: ref.phone || "", refEmail: ref.email || "", refNote: ref.note || "" },
      fields: [
        { k: "source", label: "Source", type: "select", options: [["", "—"], ...LEAD_SRC] },
        { k: "note", label: "Note", full: true, placeholder: "Campaign, context…" },
        { k: "refName", label: "Referrer name", placeholder: "When source is referral" },
        { k: "refCompany", label: "Referrer company" },
        { k: "refPhone", label: "Referrer phone", type: "tel" },
        { k: "refEmail", label: "Referrer email", type: "email" },
        { k: "refNote", label: "Referrer note", full: true },
      ],
      onSave: async (x) => {
        const referrer = { name: x.refName || "", company: x.refCompany || "", phone: x.refPhone || "", email: x.refEmail || "", note: x.refNote || "" };
        const hasRef = Object.values(referrer).some(Boolean);
        await save(c.id, { lead: { source: x.source || "", note: x.note || "", ...(hasRef || x.source === "referral" ? { referrer } : {}) } });
        toast("Lead source saved.");
      } });
  } else if (kind === "money") {
    const m = moneyTruth(c) || {};
    const ni = m.nextInvoice || {};
    formDialog({ title: "Money", values: {
        status: m.status || "unpaid", owed: m.owed != null ? String(m.owed) : "", paid: m.paid != null ? String(m.paid) : "",
        nextAmount: ni.amount != null ? String(ni.amount) : "", nextDue: ni.due || "", nextLabel: ni.label || "",
        home: m.home || "", homeNote: m.homeNote || "",
      },
      fields: [
        { k: "status", label: "Status", type: "select", options: MONEY_ST },
        { k: "owed", label: "Owed (USD)", placeholder: "0" },
        { k: "paid", label: "Paid (USD)", placeholder: "0" },
        { k: "nextAmount", label: "Next invoice amount" },
        { k: "nextDue", label: "Next invoice due", type: "date" },
        { k: "nextLabel", label: "Next invoice label", full: true, placeholder: "e.g. Pilot month 1" },
        { k: "home", label: "Where money lives", placeholder: "Card · ACH · check…" },
        { k: "homeNote", label: "Home note", full: true, placeholder: "Autopay · invoice via email" },
      ],
      onSave: async (x) => {
        const num = (s) => { if (s === "" || s == null) return null; const n = Number(String(s).replace(/[^\d.]/g, "")); return Number.isFinite(n) ? n : null; };
        await save(c.id, { money: {
          owed: num(x.owed), paid: num(x.paid), currency: "USD",
          nextInvoice: { amount: num(x.nextAmount), due: x.nextDue || "", label: x.nextLabel || "" },
          home: x.home || "", homeNote: x.homeNote || "", status: x.status || "unpaid",
        }});
        toast("Money saved.");
      } });
  } else if (kind === "agreement") {
    const a = c.agreement || {};
    formDialog({ title: "Agreement", values: { status: a.status || "none", sentAt: a.sentAt || "", signedAt: a.signedAt || "", expiresAt: a.expiresAt || "", note: a.note || "" },
      fields: [
        { k: "status", label: "Status", type: "select", options: AGREE_ST },
        { k: "sentAt", label: "Sent", type: "date" },
        { k: "signedAt", label: "Signed", type: "date" },
        { k: "expiresAt", label: "Expires", type: "date" },
        { k: "note", label: "Note", full: true, type: "textarea", placeholder: "MSA, SOW, handshake…" },
      ],
      onSave: async (x) => {
        await save(c.id, { agreement: { status: x.status || "none", sentAt: x.sentAt || "", signedAt: x.signedAt || "", expiresAt: x.expiresAt || "", note: x.note || "" } });
        toast("Agreement saved.");
      } });
  } else if (kind === "scope") {
    editScope(c);
  } else if (kind === "touch") {
    const m = c.lastTouchMeta || {};
    formDialog({ title: "Last touch channel", values: { channel: m.channel || "", note: m.note || "" },
      fields: [{ k: "channel", label: "Channel", type: "select", options: [["", "—"], ...TOUCH_CH] }, { k: "note", label: "Note", full: true }],
      onSave: async (x) => { await save(c.id, { lastTouchMeta: { channel: x.channel || "", note: x.note || "" }, lastTouch: serverTimestamp() }); toast("Last touch updated."); } });
  }
}
function editNextStep(c, id) {
  const cur = id ? (c.nextSteps || []).find((x) => x.id === id) : { text: "", due: "", done: false };
  if (id && !cur) return;
  formDialog({ title: id ? "Edit step" : "Add step", values: { text: cur.text || "", due: cur.due || "" },
    fields: [{ k: "text", label: "Step", full: true, required: true, placeholder: "e.g. Send intake form" }, { k: "due", label: "Due", type: "date" }],
    onSave: async (x) => {
      const arr = (c.nextSteps || []).slice();
      if (id) { const i = arr.findIndex((z) => z.id === id); if (i >= 0) arr[i] = { ...arr[i], text: x.text, due: x.due || "" }; }
      else arr.push({ id: "ns-" + Date.now().toString(36), text: x.text, due: x.due || "", done: false });
      await save(c.id, { nextSteps: arr }); toast(id ? "Saved." : "Step added.");
    } });
}

function editScope(c) {
  const path = clientPath(c);
  const eng = clientEngagement(c);
  const mods = { ...(c.modules || seedModules(path, eng)) };
  const fieldsHtml = SCOPE_ROWS.map(([id, label]) => {
    const on = hasModule(c, id);
    return `<label class="scope-row edit"><input type="checkbox" name="mod_${id}" ${on ? "checked" : ""}><span>${esc(label)}</span></label>`;
  }).join("");
  openModal(`<form id="fd"><div style="display:grid;gap:14px"><h2>Scope lock</h2><p>Unchecked offerings hide on Client 360 via the same module gates.</p>
    <div class="scope-list">${fieldsHtml}</div>
    <label class="field" style="flex-basis:100%">Scope note<textarea class="input" name="scopeNote" rows="2" placeholder="e.g. Start with one location; expand later">${esc(c.scopeNote || "")}</textarea></label>
    <div class="foot"><button type="button" class="btn ghost" id="fdX">Cancel</button><button class="btn p">Save scope</button></div></div></form>`, (d) => {
    $("#fdX", d).onclick = closeModal;
    $("#fd", d).onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const next = { ...mods };
      const hidden = [];
      for (const [id, label] of SCOPE_ROWS) {
        const was = hasModule(c, id);
        const on = fd.get("mod_" + id) === "on";
        const cur = next[id] || { status: "off" };
        if (on) next[id] = { ...cur, status: cur.status && cur.status !== "off" ? cur.status : "active" };
        else { next[id] = { ...cur, status: "off" }; if (was) hidden.push(label); }
      }
      await save(c.id, { modules: next, scopeNote: String(fd.get("scopeNote") || "").trim() });
      closeModal();
      if (hidden.length) toast(hidden.length === 1 ? `${hidden[0]} hidden` : `${hidden.join(", ")} hidden`);
      else toast("Scope saved.");
    };
  });
}
function editAccess(c, id) {
  const rows = (c.access || []).slice();
  const cur = id ? rows.find((x) => x.id === id) : null;
  const isNew = !cur;
  formDialog({
    title: isNew ? "Add access" : "Edit access",
    values: {
      system: cur?.system || "", logoKey: cur?.logoKey || "generic", status: cur?.status || "shared",
      sharedAt: cur?.sharedAt || "", revokeNote: cur?.revokeNote || "", notes: cur?.notes || "",
    },
    fields: [
      { k: "logoKey", label: "System", type: "select", options: ACCESS_LOGOS },
      { k: "system", label: "Label (optional)", placeholder: "Overrides logo name" },
      { k: "status", label: "Status", type: "select", options: ACCESS_ST },
      { k: "sharedAt", label: "Shared on", type: "date" },
      { k: "revokeNote", label: "Revoke note", full: true, placeholder: "Required when revoked" },
      { k: "notes", label: "Notes", full: true },
    ],
    onDelete: isNew ? null : async () => {
      await save(c.id, { access: rows.filter((x) => x.id !== id) });
      toast("Access removed.");
    },
    onSave: async (x) => {
      if (x.status === "revoked" && !x.revokeNote) { toast("Add a revoke note."); throw new Error("revokeNote"); }
      const logoKey = x.logoKey || "generic";
      const system = x.system || labelOf(ACCESS_LOGOS, logoKey, logoKey);
      const row = { id: cur?.id || uid(), system, logoKey, status: x.status || "na", sharedAt: x.sharedAt || "", revokeNote: x.revokeNote || "", notes: x.notes || "" };
      if (isNew) rows.push(row); else { const i = rows.findIndex((z) => z.id === id); if (i >= 0) rows[i] = row; }
      const patch = { access: rows };
      if (rows.some((r) => r.status === "shared")) {
        const ai = { ...(c.aiSetup || {}) };
        if (!(ai.accessShared && ai.accessShared.done)) {
          ai.accessShared = { done: true, date: todayISO() };
          patch.aiSetup = ai;
        }
      }
      await save(c.id, patch);
      toast(isNew ? "Access added." : "Access saved.");
    },
  });
}
function editTime(c, id) {
  const rows = S.timeLogs[c.id] || [];
  const cur = id ? rows.find((x) => x.id === id) : null;
  const isNew = !cur;
  const atISO = cur?.at ? (toDate(cur.at) || new Date()).toISOString().slice(0, 10) : todayISO();
  formDialog({
    title: isNew ? "Add time" : "Edit time",
    values: { hours: cur?.hours != null ? String(cur.hours) : "", kind: cur?.kind || "call", who: cur?.who || "Parker", note: cur?.note || "", billable: cur?.billable ? "yes" : "no", at: atISO },
    fields: [
      { k: "hours", label: "Hours", required: true, placeholder: "0.5" },
      { k: "kind", label: "Kind", type: "select", options: TIME_KINDS },
      { k: "who", label: "Who", placeholder: "Parker · Theo · fleet" },
      { k: "at", label: "Date", type: "date" },
      { k: "billable", label: "Billable", type: "select", options: [["no", "No"], ["yes", "Yes"]] },
      { k: "note", label: "Note", full: true, placeholder: "estimate · editable" },
    ],
    onDelete: isNew ? null : async () => {
      await deleteDoc(doc(db, "clients", c.id, "timeLogs", id));
      // refresh listener will update; rollup after short wait via local filter
      const left = rows.filter((x) => x.id !== id);
      S.timeLogs[c.id] = left;
      await save(c.id, { hours: recomputeHours(left) });
      toast("Time removed.");
    },
    onSave: async (x) => {
      const hours = Number(String(x.hours).replace(/[^\d.]/g, ""));
      if (!Number.isFinite(hours) || hours <= 0) { toast("Enter hours (e.g. 0.5)."); throw new Error("hours"); }
      const payload = {
        at: x.at ? Timestamp.fromDate(new Date(x.at + "T12:00:00")) : serverTimestamp(),
        hours, kind: x.kind || "other", who: x.who || "Parker", note: x.note || "", billable: x.billable === "yes",
      };
      if (isNew) {
        const ref = await addDoc(collection(cref(c.id), "timeLogs"), payload);
        const next = [{ id: ref.id, ...payload }, ...rows];
        S.timeLogs[c.id] = next;
        await save(c.id, { hours: recomputeHours(next) });
        toast("Time added.");
      } else {
        await updateDoc(doc(db, "clients", c.id, "timeLogs", id), payload);
        const next = rows.map((r) => r.id === id ? { ...r, ...payload } : r);
        S.timeLogs[c.id] = next;
        await save(c.id, { hours: recomputeHours(next) });
        toast("Time saved.");
      }
    },
  });
}
function wireScopeAccessHours(c, v) {
  $$("[data-crm='scope']", v).forEach((b) => (b.onclick = () => editScope(c)));
  $$("[data-scope]", v).forEach((box) => {
    box.onchange = async () => {
      const id = box.dataset.scope;
      const path = clientPath(c);
      const eng = clientEngagement(c);
      const mods = { ...(c.modules || seedModules(path, eng)) };
      const label = labelOf(SCOPE_ROWS, id, id);
      const cur = mods[id] || { status: "off" };
      if (box.checked) mods[id] = { ...cur, status: cur.status && cur.status !== "off" ? cur.status : "active" };
      else mods[id] = { ...cur, status: "off" };
      await save(c.id, { modules: mods });
      toast(box.checked ? `${label} on` : `${label} hidden`);
    };
  });
  $$("[data-access]", v).forEach((b) => (b.onclick = () => editAccess(c, b.dataset.access === "new" ? null : b.dataset.access)));
  $$("[data-time]", v).forEach((b) => (b.onclick = () => editTime(c, b.dataset.time === "new" ? null : b.dataset.time)));
  $$("[data-time-del]", v).forEach((b) => (b.onclick = async (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.armed !== "1") { btn.dataset.armed = "1"; btn.textContent = "Again"; setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ""; btn.innerHTML = ic("trash"); } }, 4000); return; }
    const id = btn.dataset.timeDel;
    await deleteDoc(doc(db, "clients", c.id, "timeLogs", id));
    const left = (S.timeLogs[c.id] || []).filter((x) => x.id !== id);
    S.timeLogs[c.id] = left;
    await save(c.id, { hours: recomputeHours(left) });
    toast("Time removed.");
  }));
}


function openDueDigest() {
  const rows = [];
  const today = todayISO();
  for (const c of S.clients) {
    for (const s of (c.nextSteps || [])) {
      if (s.done || !s.due) continue;
      if (s.due <= today) rows.push({ client: c.name, slug: c.id, text: s.text, due: s.due });
    }
  }
  rows.sort((a, b) => a.due.localeCompare(b.due) || a.client.localeCompare(b.client));
  return rows;
}
function viewDue(v) {
  const rows = openDueDigest();
  v.innerHTML = `<section class="hello"><div><div class="date">Due</div><h1>What's due.</h1><p>Open next steps due today or overdue, across every client. Read-only digest.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn p" id="dueExport">${ic("file")}Export JSON</button></div></section>
    ${rows.length ? `<div class="due-list">${rows.map((r) => {
      const over = r.due < todayISO();
      return `<a class="due-row ${over ? "over" : ""}" href="#/c/${esc(r.slug)}"><div class="when">${over ? (daysUntil(r.due) === 0 ? "Today" : `${-daysUntil(r.due)}d overdue`) : "Today"}</div><div><b>${esc(r.text)}</b><br><small>${esc(r.client)}</small></div><div class="chip ${over ? "bad" : "warn"}">${esc(fmtDay(r.due))}</div></a>`;
    }).join("")}</div>` : `<div class="empty-note">Nothing due today or overdue. Nice.</div>`}`;
  $("#dueExport").onclick = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `due-steps-${todayISO()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast("Exported.");
  };
}


function contractHtml(x, i) {
  let tl = `<span class="t-now" style="left:4%" title="Today"></span>`, note = "";
  if (x.end) {
    const endD = new Date(x.end + "T12:00:00"), nb = new Date(endD); nb.setDate(nb.getDate() - (Number(x.notice_days) || 0));
    const span = Math.max(30, daysUntil(x.end)) + 10, pos = (iso) => Math.min(96, Math.max(4, 4 + (daysUntil(iso) / span) * 92));
    const nbIso = nb.toISOString().slice(0, 10);
    tl += x.notice_days ? `<span class="t-notice" style="left:${pos(nbIso)}%" title="Give notice by ${fmtDay(nbIso)}"></span>` : "";
    tl += `<span class="t-end" style="left:${pos(x.end)}%" title="Ends ${fmtDay(x.end)}"></span>`;
    note = x.notice_days ? `Give notice by <b>${fmtDay(nbIso)}</b> · ends ${fmtDay(x.end)}` : `Ends <b>${fmtDay(x.end)}</b> · notice window unknown`;
  } else { tl += `<span class="t-unk" style="left:70%" title="End date unknown"></span>`; note = `<span style="color:var(--warn);font-weight:600">End date unknown</span>${x.notice_days ? "" : " · notice window unknown"}`; }
  return `<div class="contract"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><div><b>${esc(x.name)}</b> <small style="color:var(--ink-3)">${esc(x.what || "")}</small></div><button class="btn sm ghost" data-vendor="${i}" aria-label="Edit ${esc(x.name)}">${ic("pen")}</button></div>
    <div class="tl">${tl}</div><div style="font-size:12.5px;color:var(--ink-2)">${note}</div>${x.notes ? `<div style="font-size:12.5px;color:var(--ink-3)">${esc(x.notes)}</div>` : ""}</div>`;
}
function editDetails(c) {
  const path0 = clientPath(c);
  const eng0 = c.engagement || (path0 === "personal" ? "household" : "teams");
  openModal(`<form id="fd"><div style="display:grid;gap:14px"><h2>Details</h2>
    <div class="row">
      ${pathSegHtml(path0, "pathHint")}
      ${engSegHtml(eng0 === "household" ? "teams" : eng0)}
      <label class="field" style="flex-basis:100%">Name<input class="input" name="name" required value="${esc(c.name || "")}" autocomplete="off"></label>
      <label class="field">Trade<input class="input" name="trade" value="${esc(c.trade || "")}" autocomplete="off"></label>
      <label class="field">Town<input class="input" name="town" value="${esc(c.town || "")}" autocomplete="off"></label>
      <label class="field" style="flex-basis:100%">HQ address<input class="input" name="hq" value="${esc(c.hq || "")}" autocomplete="off"></label>
      <label class="field">Main phone<input class="input" name="phone" type="tel" inputmode="tel" value="${esc(c.phone || "")}" autocomplete="off"></label>
      <label class="field">Email<input class="input" name="email" type="email" placeholder="hello@example.com" value="${esc(c.email || "")}" autocomplete="off"></label>
      <label class="field" style="flex-basis:100%">Website<input class="input" name="website" value="${esc(c.website || "")}" autocomplete="off"></label>
      <label class="field" style="flex-basis:100%">Service towns (comma-separated)<input class="input" name="towns" value="${esc((c.towns || []).join(", "))}" autocomplete="off"></label>
      <label class="field" style="flex-basis:100%">Tags (comma-separated)<input class="input" name="tags" placeholder="Family client, Referral…" value="${esc((c.tags || []).join(", "))}" autocomplete="off"></label>
      <label class="field">Brand color (hex)<input class="input" name="color1" placeholder="#173A5E" value="${esc(c.brand?.color1 || "")}" autocomplete="off"></label>
    </div>
    <div class="foot"><button type="button" class="btn ghost" id="fdX">Cancel</button><button class="btn p">Save</button></div></div></form>`, (d) => {
    $("#fdX", d).onclick = closeModal;
    wirePathEng(d);
    $("#fd", d).onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      Object.keys(data).forEach((k) => (data[k] = String(data[k]).trim()));
      const path = data.path === "personal" ? "personal" : "business";
      const engagement = path === "personal" ? "household" : (data.engagement || "teams");
      const pathChanged = path !== clientPath(c) || engagement !== (c.engagement || clientEngagement(c));
      const brand = { ...(c.brand || {}), color1: /^#[0-9a-f]{3,8}$/i.test(data.color1) ? data.color1 : c.brand?.color1 || "" };
      const towns = data.towns.split(",").map((s) => s.trim()).filter(Boolean);
      const tags = data.tags.split(",").map((s) => s.trim()).filter(Boolean);
      try {
        if (EMU) {
          // COUNSEL-DRAFT-2026-10-19. Allowlisted profile fields go through the callable.
          await callFn("adminUpdateClientProfile", {
            cid: c.id,
            fields: { name: data.name, trade: data.trade, town: data.town, hq: data.hq, phone: data.phone, email: data.email || "", website: data.website, tags },
            expectedUpdatedAt: updatedAtMs(c),
          });
          const patch = { towns, brand, path, engagement };
          if (pathChanged) patch.modules = mergeModules(c.modules, path, engagement);
          await save(c.id, patch);
        } else {
          const patch = {
            name: data.name, trade: data.trade, town: data.town, hq: data.hq, phone: data.phone, email: data.email || "", website: data.website,
            towns, tags, brand, path, engagement,
          };
          if (pathChanged) patch.modules = mergeModules(c.modules, path, engagement);
          await save(c.id, patch);
        }
        toast("Saved");
        closeModal();
      } catch (err) {
        console.error(err);
        showFormError(d, err?.message || "Save failed.");
      }
    };
  });
}
const LISTS = {
  interests: { title: "What they're interested in", fields: [{ k: "title", label: "Interest", full: true, required: true, placeholder: "e.g. More Google reviews" }, { k: "note", label: "Note", full: true }, { k: "status", label: "Where it stands", type: "select", options: Object.entries(INT_ST) }], blank: { status: "active" }, log: (x) => `Interested in: ${x.title}` },
  contacts: { title: "Contact", fields: [{ k: "name", label: "Name", required: true }, { k: "role", label: "Role" }, { k: "phone", label: "Phone", type: "tel" }, { k: "email", label: "Email", type: "email" }, { k: "channel", label: "Prefers", type: "select", options: ["", "Text", "Call", "Email", "In person"] }], blank: { channel: "Text" } },
  tech: { title: "System in their stack", fields: [{ k: "name", label: "System", required: true, placeholder: "e.g. Scheduling app" }, { k: "category", label: "Category", placeholder: "Field ops, Website, Phones…" }, { k: "status", label: "Status", type: "select", options: Object.entries(TECH_ST) }, { k: "source", label: "Where we learned it", full: true, placeholder: "e.g. Owner told us · DNS lookup" }], blank: { status: "assumed" }, log: (x) => `Tech stack: ${x.name} (${TECH_ST[x.status] || x.status})` },
  vendors: { title: "Contract", fields: [{ k: "name", label: "Vendor", required: true, placeholder: "e.g. Website host" }, { k: "what", label: "What it does" }, { k: "end", label: "Contract ends", type: "date" }, { k: "notice_days", label: "Notice window (days)", type: "number" }, { k: "notes", label: "Notes", full: true }], blank: {} },
};
function editList(c, field, idx) {
  const L = LISTS[field], arr = (c[field] || []).slice(), isNew = idx === "new", cur = isNew ? { ...L.blank } : arr[+idx];
  formDialog({ title: (isNew ? "Add · " : "Edit · ") + L.title, values: cur, fields: L.fields, submit: isNew ? "Add" : "Save",
    onSave: async (d) => { if (field === "vendors") d.notice_days = Number(d.notice_days) || 0; if (isNew) arr.push(d); else arr[+idx] = d; await save(c.id, { [field]: arr }); if (isNew && L.log) await logEntry(c.id, L.log(d), "Note"); toast(isNew ? "Added" : "Saved"); },
    onDelete: isNew ? null : async () => { arr.splice(+idx, 1); await save(c.id, { [field]: arr }); toast("Removed"); } });
}

// ------------------------------------------------------------------ assessments
let pickType = "agent-free";
let pickClient = "";
function reportEnabled(c, type) { return !c || hasModule(c, reportModule(type)); }
function firstEnabledReport(c) {
  if (!c) return REPORTS[0].type;
  const t = REPORTS.find((r) => hasModule(c, reportModule(r.type)));
  return t ? t.type : "";
}
function activeModuleIds(c, fallbackPath = "business", fallbackEng = "teams") {
  if (!c) return defaultModuleIds(fallbackPath, fallbackEng);
  const ids = new Set([...ALWAYS_MODULES, ...Object.keys(c.modules || {})]);
  return [...ids].filter((id) => hasModule(c, id));
}
function assessPrefillFrom(c, extra = {}) {
  return {
    name: (c?.name || extra.name || "").trim(),
    website: (c?.website || extra.website || "").trim(),
    town: (c?.town || extra.town || "").trim(),
    trade: (c?.trade || extra.trade || "").trim(),
    path: c ? clientPath(c) : (extra.path === "personal" ? "personal" : "business"),
    engagement: c ? clientEngagement(c) : (extra.engagement || (extra.path === "personal" ? "household" : "teams")),
    modules: activeModuleIds(c, extra.path || "business", extra.engagement || "teams"),
  };
}
function assessSnapshotHtml(c) {
  if (!c) return `<div class="assess-snap" style="margin-top:12px;padding:12px 14px;border:1px dashed var(--line-strong);border-radius:12px;color:var(--ink-3);font-size:13px">Pick a client to prefill — or choose <b>+ A new business…</b> to create one first. Assessments never run as orphans.</div>`;
  const site = siteUrl(c.website);
  const contacts = (c.contacts || []).slice(0, 3);
  const mods = activeModuleIds(c).filter((id) => !ALWAYS_MODULES.includes(id));
  const bits = [
    c.trade ? `<span>${ic("wrench")}${esc(c.trade)}</span>` : "",
    c.town ? `<span>${ic("pin")}${esc(c.town)}</span>` : "",
    site ? `<span>${ic("globe")}<a href="${esc(site)}" target="_blank" rel="noopener">${esc(String(c.website || "").replace(/^https?:\/\//, ""))}</a></span>` : "",
    `<span class="chip ${clientPath(c) === "personal" ? "acc" : "dash"}">${esc(pathLabel(clientPath(c)))}</span>`,
    `<span class="chip dash">${esc(clientPath(c) === "personal" ? "Household" : labelOf(ENGAGE_BUSINESS, clientEngagement(c), "Agent crew"))}</span>`,
  ].filter(Boolean).join("");
  const people = contacts.length
    ? `<div style="margin-top:8px;font-size:12.5px;color:var(--ink-2)">Contacts: ${contacts.map((p) => esc(p.name) + (p.role ? ` <span class="mono">(${esc(p.role)})</span>` : "")).join(" · ")}</div>`
    : "";
  const modHtml = mods.length
    ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">${mods.map((id) => `<span class="chip dash" style="height:20px">${esc(MODULE_LABELS[id] || id)}</span>`).join("")}</div>`
    : "";
  return `<div class="assess-snap" style="margin-top:12px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--bg-2)">
    <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:start">
      <div style="min-width:0;flex:1"><b style="font:600 14px var(--ff)">${esc(c.name)}</b>
        <div class="facts" style="margin-top:4px">${bits}</div>${people}${modHtml}</div>
      <a class="btn sm ghost" href="#/c/${esc(c.id)}">${ic("link")}Profile</a>
    </div>
  </div>`;
}
function reportRowHtml(r) {
  const c = client(r.client);
  const pub = r.status === "published";
  const chip = pub ? "ok" : r.status === "draft" ? "warn" : "dash";
  const acts = [
    r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">Open ↗</a>` : "",
    !pub ? `<button type="button" class="btn sm" data-publish="${esc(r.client)}/${esc(r.id)}">Publish</button>` : "",
  ].filter(Boolean).join(" ");
  return `<tr><td><a href="#/c/${esc(r.client)}">${esc(c?.name || r.client)}</a></td><td>${esc(RTYPE[r.type]?.name || r.type)}</td><td><span class="chip ${chip}">${esc(r.status)}</span></td><td class="mono">${esc(fmtDay(r.date))}</td><td class="n">${r.score ?? "–"}</td><td style="white-space:nowrap">${acts}</td></tr>`;
}
function publishReport(clientId, reportId) {
  const r = S.reports.find((x) => x.client === clientId && x.id === reportId);
  if (!r) return toast("Report not found");
  const T = RTYPE[r.type] || { name: r.type, type: r.type };
  const isPresence = String(r.type || "").startsWith("presence");
  const cname = client(clientId)?.name || "this client";
  formDialog({
    title: `Publish · ${T.name}`,
    intro: `Results go on <b>${esc(cname)}</b>'s profile and Completed assessments — never into Assets.`,
    submit: "Publish",
    values: { score: r.score != null ? String(r.score) : "", link: r.link || "", summary: r.summary || "" },
    fields: [
      { k: "score", label: isPresence ? "Score (0–100)" : "Score (optional)", type: "number", placeholder: "0–100" },
      { k: "link", label: "Report link", type: "url", full: true, placeholder: "https://…" },
      { k: "summary", label: "Summary", type: "textarea", full: true, placeholder: "What stood out for them…" },
    ],
    onSave: async (d) => {
      const patch = {
        status: "published",
        link: d.link || "",
        summary: d.summary || "",
        publishedAt: serverTimestamp(),
        updated: serverTimestamp(),
      };
      let scoreNum = null;
      if (d.score !== "" && d.score != null) {
        scoreNum = Number(d.score);
        if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100) {
          toast("Score must be 0–100");
          throw new Error("bad score");
        }
        patch.score = scoreNum;
      }
      await updateDoc(doc(db, "clients", clientId, "reports", reportId), patch);
      if (isPresence && scoreNum != null) {
        const cur = client(clientId);
        const scores = { ...(cur?.scores && typeof cur.scores === "object" ? cur.scores : {}) };
        scores.presence = { score: scoreNum, type: r.type, date: todayISO() };
        await save(clientId, { scores });
      }
      await logEntry(clientId, `${T.name} published`, "Note");
      confetti();
      toast("Published");
    },
  });
}
function viewAssess(v) {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  if (params.get("type")) pickType = params.get("type");
  // Old bookmarks may still request the retired free type; route them to the sole offered assessment.
  if (pickType === "presence-free") pickType = "presence-full";
  if (params.get("client")) pickClient = params.get("client");
  if (!pickClient && S.clients[0]) pickClient = S.clients[0].id;
  const selC = pickClient && pickClient !== "__new" ? client(pickClient) : null;
  if (selC && pickType && !reportEnabled(selC, pickType)) pickType = firstEnabledReport(selC) || pickType;
  const sorted = S.reports.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || String(b.id).localeCompare(String(a.id)));
  const queue = sorted.filter((r) => r.status === "requested" || r.status === "draft");
  const done = sorted.filter((r) => r.status === "published");
  const T = RTYPE[pickType] || REPORTS[0];
  const pickOn = reportEnabled(selC, pickType);
  const table = (rows, empty) => rows.length
    ? `<div class="tablewrap" style="margin-top:8px"><table class="t"><thead><tr><th>Client</th><th>Report</th><th>Status</th><th>Date</th><th style="text-align:right">Score</th><th></th></tr></thead><tbody>${rows.map(reportRowHtml).join("")}</tbody></table></div>`
    : `<div class="pb"><div class="empty-note">${empty}</div></div>`;
  v.innerHTML = `<section class="hello"><div><div class="date">Assessments</div><h1>Show them what you see.</h1><p>Pick a report, pick a client, and queue it. Prefill comes from their profile. When a run finishes, <b>Publish</b> puts results on that client — never in Assets.</p></div></section>
    <section class="tools">${REPORTS.map((t) => {
      const on = reportEnabled(selC, t.type);
      const tip = on ? "" : `${MODULE_LABELS[reportModule(t.type)] || "This module"} is off for this client`;
      return `<button class="panel tool ${on ? "" : "is-off"}" data-type="${t.type}" aria-pressed="${t.type === pickType && on}" ${on ? "" : `disabled title="${esc(tip)}"`}><span class="ico ${t.type.endsWith("full") ? "full" : ""}">${ic(t.fam === "presence" ? "globe" : "spark")}</span><b>${esc(t.name)}</b><p>${esc(t.desc)}</p><span class="cost"><span>${esc(t.cost)}</span><span>${esc(t.time)}</span></span></button>`;
    }).join("")}</section>
    <section class="panel run"><div class="ph" style="padding:0"><h2>Run ${esc(T.name)}</h2></div>
      <form id="runf" class="row">
        <label class="field">For<select class="input" name="client" id="runClient">${S.clients.map((c) => `<option value="${esc(c.id)}" ${c.id === pickClient ? "selected" : ""}>${esc(c.name)}</option>`).join("")}<option value="__new" ${pickClient === "__new" ? "selected" : ""}>+ A new business…</option></select></label>
        <label class="field newbiz" hidden>Business name<input class="input" name="nname" placeholder="Business name"></label>
        <label class="field newbiz" hidden>Website<input class="input" name="nweb" placeholder="example.com"></label>
        <label class="field newbiz" hidden>Town<input class="input" name="ntown" placeholder="Dayton, MN"></label>
        <button class="btn p" ${pickOn || pickClient === "__new" ? "" : "disabled"}>${ic("play")}Queue ${esc(T.name)}</button>
      </form>
      <div id="assessSnap">${assessSnapshotHtml(selC)}</div>
      <div class="howto">${howTo(pickType, selC)}</div>
    </section>
    <section class="panel"><div class="ph"><h2>Queue <small>${queue.length}</small></h2></div>${table(queue, "Nothing queued. Pick a client and queue a report — runners aren't automated yet, so Publish is how completed results land today.")}</section>
    <section class="panel"><div class="ph"><h2>Completed assessments <small>${done.length}</small></h2></div>${table(done, "No published assessments yet. After you finish a run offline, hit Publish on the Queue row.")}</section>`;
  $$("[data-type]", v).forEach((b) => (b.onclick = () => {
    if (b.disabled) return toast(b.title || "That report is off for this client");
    pickType = b.dataset.type; refresh(true);
  }));
  $$("[data-publish]", v).forEach((b) => (b.onclick = () => {
    const [cid, rid] = String(b.dataset.publish || "").split("/");
    if (cid && rid) publishReport(cid, rid);
  }));
  const sel = $("#runClient");
  const sync = () => {
    const nw = sel.value === "__new";
    $$(".newbiz", v).forEach((x) => (x.hidden = !nw));
    const c = nw ? null : client(sel.value);
    const snap = $("#assessSnap", v);
    if (snap) snap.innerHTML = assessSnapshotHtml(c);
    $(".howto", v).innerHTML = howTo(pickType, c);
  };
  sel.onchange = () => {
    pickClient = sel.value;
    const c = pickClient === "__new" ? null : client(pickClient);
    if (c && !reportEnabled(c, pickType)) pickType = firstEnabledReport(c) || pickType;
    refresh(true);
  };
  sync();
  $("#runf").onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    let id = f.client;
    let prefill;
    if (!id) return toast("Pick a client first");
    if (id === "__new") {
      if (!f.nname.trim()) return toast("Add the business name first");
      id = slugify(f.nname); while (client(id)) id += "-2";
      await setDoc(cref(id), blankClientDoc({ name: f.nname.trim(), website: f.nweb.trim(), town: f.ntown.trim(), path: "business", engagement: "teams" }));
      await addDoc(collection(cref(id), "log"), { at: serverTimestamp(), kind: "Note", text: "Added as a prospect from the assessment launcher." });
      prefill = assessPrefillFrom(null, { name: f.nname.trim(), website: f.nweb.trim(), town: f.ntown.trim(), path: "business", engagement: "teams" });
    } else {
      const c = client(id);
      if (!c) return toast("Pick a client first");
      if (!reportEnabled(c, pickType)) return toast("That report is off for this client");
      prefill = assessPrefillFrom(c);
    }
    if (!RTYPE[pickType]) return toast("Pick a report first");
    await addDoc(collection(cref(id), "reports"), {
      type: pickType,
      status: "requested",
      date: todayISO(),
      prefill,
      created: serverTimestamp(),
      updated: serverTimestamp(),
    });
    await logEntry(id, `${T.name} queued`, "Note");
    toast(`${T.name} queued for ${client(id)?.name || f.nname}`);
  };
}
function howTo(type, c) {
  const nm = c ? c.name : "the business";
  const mod = reportModule(type);
  if (c && type && !reportEnabled(c, type)) {
    return `<b>This tool is off for ${esc(nm)}:</b> turn on <b>${esc(MODULE_LABELS[mod] || mod)}</b> on their profile (or switch engagement), then come back. <a href="#/c/${esc(c.id)}">Open profile →</a>`;
  }
  const pub = ` Runners aren't automated yet — when you finish offline, hit <b>Publish</b> on the Queue row so results land on the client profile and Completed assessments (never Assets).`;
  if (type === "presence-full") return `<b>How it runs today:</b> queueing logs it on the client. Then, in Claude Code, run <code>/clockworks-assessment ${esc(nm)}</code> <button class="btn sm" data-copy="/clockworks-assessment ${esc(nm)}">${ic("copy")}Copy</button>${pub}`;
  return `<b>Coming soon:</b> Agent Team assessments arrive in later steps. Queueing now records interest on the client.${pub}`;
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-copy]"); if (!b) return; navigator.clipboard?.writeText(b.dataset.copy).then(() => toast("Copied"), () => toast(b.dataset.copy)); });

// ------------------------------------------------------------------ quotes & invoices
const qCls = (s) => ({ draft: "dash", sent: "data", accepted: "ok", declined: "bad", unpaid: "warn", paid: "ok", void: "dash" }[s] || "");
function nextNumber(kind) { const pre = kind === "invoice" ? "INV-" : "Q-"; const n = S.quotes.filter((q) => q.kind === kind).map((q) => parseInt(String(q.number || "").replace(/\D/g, ""), 10) || 0); return pre + String((n.length ? Math.max(...n) : 0) + 1).padStart(4, "0"); }
function newQuote(cid) {
  const go = async (id) => {
    const ref = await addDoc(collection(cref(id), "quotes"), { kind: "quote", number: nextNumber("quote"), title: "", status: "draft", date: todayISO(), items: [{ desc: "", qty: 1, price: 0 }], discountPct: 0, notes: "", created: serverTimestamp(), updated: serverTimestamp() });
    location.hash = `#/q/${id}/${ref.id}`;
  };
  if (cid) return go(cid);
  if (!S.clients.length) return addProspect();
  formDialog({ title: "Draft a quote", intro: "Who's it for?", submit: "Start drafting", values: { client: S.clients[0].id }, fields: [{ k: "client", label: "Client", type: "select", full: true, options: S.clients.map((c) => [c.id, c.name]) }], onSave: (d) => go(d.client) });
}
function viewQuotes(v) {
  const all = S.quotes.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const open = all.filter((q) => q.kind === "quote" && ["draft", "sent"].includes(q.status)), unpaid = all.filter((q) => q.kind === "invoice" && q.status === "unpaid"), paid = all.filter((q) => q.kind === "invoice" && q.status === "paid");
  v.innerHTML = `<section class="hello"><div><div class="date">Quotes &amp; invoices</div><h1>${paid.length ? "Money in the door." : "Where the work gets priced."}</h1><p>${all.length ? `${open.length} open ${open.length === 1 ? "quote" : "quotes"}${unpaid.length ? ` · ${money(unpaid.reduce((a, q) => a + quoteTotal(q).total, 0))} to collect` : ""}${paid.length ? ` · ${money(paid.reduce((a, q) => a + quoteTotal(q).total, 0))} collected` : ""}.` : "Nothing here yet, and that's fine. Your first quote will come right after a good sit-down."}</p></div><div class="acts"><button class="btn p" data-newquote>${ic("plus")}New quote</button></div></section>
    <section class="panel">${all.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Number</th><th>Client</th><th>For</th><th>Status</th><th>Date</th><th style="text-align:right">Total</th></tr></thead><tbody>${all.map((q) => `<tr><td class="mono"><a href="#/q/${esc(q.client)}/${esc(q.id)}">${esc(q.number)}</a></td><td>${esc(client(q.client)?.name || "")}</td><td>${esc(q.title || "Untitled")}</td><td><span class="chip ${qCls(q.status)}">${esc(q.kind === "invoice" ? "Invoice · " : "")}${esc(q.status)}</span></td><td class="mono">${esc(fmtDay(q.date))}</td><td class="n">${money(quoteTotal(q).total)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div class="pb"><div class="empty-note"><b>No quotes yet.</b> Draft one for a prospect when they're ready: line items, a discount if you like, and a total. You send it yourself; the portal keeps track.<button class="btn sm p" data-newquote>${ic("file")}Draft your first quote</button></div></div>`}</section>`;
  wireCommon(v);
}
let qDraft = null;
function viewQuote(v) {
  const [cid, qid] = R.args, c = client(cid), q0 = S.quotes.find((x) => x.client === cid && x.id === qid);
  if (!c || !q0) { v.innerHTML = `<div class="crumb"><a href="#/quotes">Quotes</a></div><div class="empty-note">Loading the quote… <a class="btn link" href="#/quotes">Back to quotes</a></div>`; return; }
  if (!qDraft || qDraft.id !== qid) qDraft = JSON.parse(JSON.stringify(q0));
  const q = qDraft, t = quoteTotal(q), isInv = q.kind === "invoice";
  const life = isInv ? ["unpaid", "paid"] : ["draft", "sent", "accepted"];
  const li = life.indexOf(q.status);
  v.innerHTML = `<div class="crumb"><a href="#/quotes">Quotes &amp; invoices</a> / ${esc(q.number)}</div>
    <section class="panel qdoc">
      <div class="qhead-row">
        <div class="qtitle"><div class="lbl">${isInv ? "Invoice" : "Quote"} · <span class="mono">${esc(q.number)}</span> · <a href="#/c/${esc(cid)}" style="color:var(--accent-ink);text-decoration:none">${esc(c.name)}</a></div>
          <input class="input" id="qt" value="${esc(q.title)}" placeholder="What's this for? e.g. $499 package + Shop Pass"></div>
        <div class="life">${life.map((s, i) => `<span class="${i < li ? "done" : i === li ? "cur" : ""}"><i></i>${esc(s)}</span>`).join("")}</div>
      </div>
      <div class="items"><div class="qline qhead lbl"><span>Item</span><span>Qty</span><span>Price</span><span style="text-align:right" class="qtot-h">Total</span><span></span></div>
        ${q.items.map((it, i) => `<div class="qline"><input class="input" data-it="${i}" data-f="desc" value="${esc(it.desc)}" placeholder="Describe the work" aria-label="Item"><input class="input mono" data-it="${i}" data-f="qty" value="${esc(it.qty)}" inputmode="decimal" placeholder="Qty" aria-label="Quantity"><input class="input mono" data-it="${i}" data-f="price" value="${esc(it.price)}" inputmode="decimal" placeholder="$" aria-label="Price"><span class="tot">${money((Number(it.qty) || 0) * (Number(it.price) || 0))}</span><button class="btn sm ghost" data-rmi="${i}" aria-label="Remove line">${ic("trash")}</button></div>`).join("")}
        <button class="btn sm ghost" id="addLine" style="justify-self:start">${ic("plus")}Add a line</button></div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:end">
        <div style="display:grid;gap:10px;flex:1;min-width:240px"><label class="field" style="max-width:200px">Discount %<input class="input mono" id="qd" value="${esc(q.discountPct || 0)}" inputmode="decimal"></label><label class="field">Notes for the client<textarea class="input" id="qn" placeholder="Terms, timing, what's included…">${esc(q.notes || "")}</textarea></label></div>
        <div class="qtot"><div><span>Subtotal</span><span class="mono">${money(t.sub)}</span></div>${t.disc ? `<div><span>Discount (${q.discountPct}%)</span><span class="mono">−${money(t.disc)}</span></div>` : ""}<div class="grand"><span class="gl">Total</span><span>${money(t.total)}</span></div></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end">
        <button class="btn ghost danger" id="qdel" style="margin-right:auto">${ic("trash")}Delete</button>
        <button class="btn" id="qsave">Save</button>
        ${!isInv && q.status === "draft" ? `<button class="btn p" data-st="sent">Mark as sent</button>` : ""}
        ${!isInv && q.status === "sent" ? `<button class="btn" data-st="declined">Declined</button><button class="btn p" data-st="accepted">${ic("check")}Accepted</button>` : ""}
        ${!isInv && q.status === "accepted" ? `<button class="btn p" id="toInv">${ic("file")}Create invoice</button>` : ""}
        ${isInv && q.status === "unpaid" ? `<button class="btn p" data-st="paid">${ic("check")}Mark paid</button>` : ""}
      </div>
      <p style="margin:0;font-size:12.5px;color:var(--ink-3)">You send quotes and invoices yourself (email, text, or your invoicing tool). The portal keeps the record and the status.</p>
    </section>`;
  const sync = () => { q.title = $("#qt").value; q.discountPct = Number($("#qd").value) || 0; q.notes = $("#qn").value; $$("[data-it]", v).forEach((el) => { q.items[+el.dataset.it][el.dataset.f] = el.dataset.f === "desc" ? el.value : el.value.replace(/[^\d.]/g, ""); }); };
  const persist = async (extra = {}) => { sync(); const { id, client: _c, ...rest } = q; await updateDoc(doc(db, "clients", cid, "quotes", qid), { ...rest, ...extra, items: q.items.map((it) => ({ desc: it.desc, qty: Number(it.qty) || 0, price: Number(it.price) || 0 })), updated: serverTimestamp() }); Object.assign(q, extra); };
  $$("[data-it], #qd", v).forEach((el) => el.addEventListener("change", () => { sync(); paintQuoteTotals(v, q); }));
  $$("[data-it], #qd", v).forEach((el) => el.addEventListener("input", () => { sync(); paintQuoteTotals(v, q); }));
  $("#addLine").onclick = () => { sync(); q.items.push({ desc: "", qty: 1, price: 0 }); viewQuote(v); $$("[data-f=desc]", v).pop().focus(); };
  $$("[data-rmi]", v).forEach((b) => (b.onclick = () => { sync(); q.items.splice(+b.dataset.rmi, 1); if (!q.items.length) q.items.push({ desc: "", qty: 1, price: 0 }); viewQuote(v); }));
  $("#qsave").onclick = async () => { await persist(); toast("Saved"); };
  $$("[data-st]", v).forEach((b) => (b.onclick = async () => { const s = b.dataset.st; await persist({ status: s, ...(s === "paid" ? { paidDate: todayISO() } : {}) }); await logEntry(cid, `${isInv ? "Invoice" : "Quote"} ${q.number} ${s}${q.title ? ": " + q.title : ""} (${money(quoteTotal(q).total)})`, "Decision"); if (["accepted", "paid", "sent"].includes(s)) confetti(); toast(s === "paid" ? "Paid. That's the good stuff." : `Marked ${s}`); qDraft = null; refresh(true); }));
  const toInv = $("#toInv"); if (toInv) toInv.onclick = async () => { await persist(); const { id, client: _c, ...rest } = q; const ref = await addDoc(collection(cref(cid), "quotes"), { ...rest, kind: "invoice", number: nextNumber("invoice"), status: "unpaid", date: todayISO(), fromQuote: q.number, created: serverTimestamp(), updated: serverTimestamp() }); await logEntry(cid, `Invoice created from ${q.number}`, "Note"); toast("Invoice created"); qDraft = null; location.hash = `#/q/${cid}/${ref.id}`; };
  $("#qdel").onclick = async (e) => { const b = e.currentTarget; if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Tap again to delete"; return; } await deleteDoc(doc(db, "clients", cid, "quotes", qid)); qDraft = null; toast("Deleted"); location.hash = "#/quotes"; };
}
function paintQuoteTotals(v, q) {
  const t = quoteTotal(q);
  $$(".qline", v).slice(1).forEach((row, i) => { const it = q.items[i]; const el = $(".tot", row); if (it && el) el.textContent = money((Number(it.qty) || 0) * (Number(it.price) || 0)); });
  $(".qtot", v).innerHTML = `<div><span>Subtotal</span><span class="mono">${money(t.sub)}</span></div>${t.disc ? `<div><span>Discount (${q.discountPct}%)</span><span class="mono">−${money(t.disc)}</span></div>` : ""}<div class="grand"><span class="gl">Total</span><span>${money(t.total)}</span></div>`;
}
