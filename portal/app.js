// Clockworks Portal · CRM. Admin-only; access and data shape are enforced by firebase/firestore.rules.
// On localhost it talks to the Firebase emulators unless the URL has ?prod.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, connectAuthEmulator, signInWithCredential } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator, terminate, clearIndexedDbPersistence,
  collection, collectionGroup, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, limit, serverTimestamp, Timestamp, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, connectStorageEmulator, ref as sref, listAll, getMetadata, getDownloadURL, uploadBytesResumable, deleteObject, updateMetadata } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { firebaseConfig } from "./config.js";

const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const EMU = LOCAL && !new URLSearchParams(location.search).has("prod");
const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const db = EMU ? initializeFirestore(fb, {}) : initializeFirestore(fb, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const storage = getStorage(fb);
if (EMU) { connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); connectFirestoreEmulator(db, "127.0.0.1", 8080); connectStorageEmulator(storage, "127.0.0.1", 9199); }

// ------------------------------------------------------------------ constants
const STAGES = ["Lead", "Free scan sent", "Meeting", "Full assessment", "Proposal", "Pilot", "Active", "Paused", "Closed"];
const MAIN = STAGES.slice(0, 7);
const STAGE_SHORT = { "Free scan sent": "Free scan", "Full assessment": "Full" };
const REPORTS = [
  { type: "agent-free", name: "Agent Team · Free", fam: "agent", cost: "~$0.50", time: "~2 min", desc: "From public signals: likely systems, likely tasks and hours, a compliance heads-up, a starter team sketch." },
  { type: "agent-full", name: "Agent Team · Full", fam: "agent", cost: "intake + call", time: "1–2 sessions", desc: "Intake + discovery: integration gap matrix, real-number ROI, full compliance review, roster proposal." },
  { type: "presence-free", name: "Presence · Free", fam: "presence", cost: "~$0.50", time: "~60 s", desc: "Home-town Maps rank, a 3×3 grid, one AI question to two assistants, reviews vs the top 3 nearby, speed + schema." },
  { type: "presence-full", name: "Presence · Full", fam: "presence", cost: "~$10", time: "30–60 min", desc: "The Eicher-level report: 16 towns, 4 AI assistants, listings, website, domain, top fixes, receipts." },
];
const RTYPE = Object.fromEntries(REPORTS.map((r) => [r.type, r]));
const PILLARS = [["maps", "Maps"], ["reviews", "Reviews"], ["ai", "AI"], ["search", "Search"], ["listings", "Listings"], ["website", "Website"]];
const KINDS = ["Note", "Call", "Text", "Decision"];
const TECH_ST = { confirmed: "Confirmed", assumed: "Assumed", unknown: "Unknown" };
const INT_ST = { active: "On the path", asked: "Asked about", earlier: "Earlier idea" };
const band = (s) => (s >= 80 ? "Strong" : s >= 60 ? "Good" : s >= 40 ? "Fair" : "Needs work");
const bandCls = (s) => (s >= 60 ? "ok" : s >= 40 ? "warn" : "bad");
const PALETTE = ["#2D62CF", "#1B9464", "#BF4D1C", "#7A4FD0", "#C68A1E", "#157F8A", "#B23A6B"];
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
  team_bots: "Agent crew", presence: "Presence", tech_stack: "Tech", vendors: "Vendors",
  intake: "Intake", seo_track: "SEO", quotes: "Quotes", household: "Household",
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
  out: '<path d="M15 4h4v16h-4M10 16l4-4-4-4M14 12H4"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  play: '<path d="M8 5v14l11-7z"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5S14.5 17.9 12 20.5C9.5 17.9 8.5 15.1 8.5 12S9.5 6.1 12 3.5z"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>', wrench: '<path d="M14.5 5.5a4 4 0 0 0 5 5L12 18l-3 3-3-3 3-3 7.5-7.5a4 4 0 0 1-2-2z"/>', spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  msg: '<path d="M4 5h16v11H9l-5 4z"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>', trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8 20h8"/>',
  box: '<path d="M3 8l9-4 9 4-9 4z"/><path d="M3 8v9l9 4 9-4V8"/><path d="M12 12v9M3 8l9 4 9-4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/>',
  more: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>',
};
const ic = (n, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ""}</svg>`;
const mark = (cls = "mark") => `<svg class="${cls}" viewBox="0 0 364 361" aria-hidden="true">${$("#cw-mark").innerHTML}</svg>`;

let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }
function confetti() {
  if (reduced) return;
  const c = document.createElement("canvas"); c.className = "confetti"; c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; document.body.appendChild(c);
  const x = c.getContext("2d"); x.scale(devicePixelRatio, devicePixelRatio);
  const cols = ["#BF4D1C", "#EC7440", "#2D62CF", "#1B9464", "#D69A1E", "#C9793F"];
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
const S = { clients: [], logs: {}, reports: [], quotes: [], ready: false };
let unsubs = [], logUnsubs = {};
function listen() {
  unsubs.push(onSnapshot(collection(db, "clients"), (snap) => {
    S.clients = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    S.clients.forEach((c) => {
      if (logUnsubs[c.id]) return;
      logUnsubs[c.id] = onSnapshot(query(collection(db, "clients", c.id, "log"), orderBy("at", "desc"), limit(60)), (s) => { S.logs[c.id] = s.docs.map((d) => ({ id: d.id, client: c.id, ...d.data() })); refresh(); });
    });
    Object.keys(logUnsubs).forEach((id) => { if (!S.clients.find((c) => c.id === id)) { logUnsubs[id](); delete logUnsubs[id]; delete S.logs[id]; } });
    S.ready = true; refresh();
  }, (e) => toast("Couldn't load clients: " + e.code)));
  unsubs.push(onSnapshot(collectionGroup(db, "reports"), (s) => { S.reports = s.docs.map((d) => ({ id: d.id, client: d.ref.parent.parent.id, ...d.data() })); refresh(); }));
  unsubs.push(onSnapshot(collectionGroup(db, "quotes"), (s) => { S.quotes = s.docs.map((d) => ({ id: d.id, client: d.ref.parent.parent.id, ...d.data() })); refresh(); }));
}
function stopAll() { unsubs.forEach((f) => f()); unsubs = []; Object.values(logUnsubs).forEach((f) => f()); logUnsubs = {}; }
const client = (id) => S.clients.find((c) => c.id === id);
const allLogs = () => Object.values(S.logs).flat().sort((a, b) => (toDate(b.at) || 0) - (toDate(a.at) || 0));
const clientReports = (id) => S.reports.filter((r) => r.client === id).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
const clientQuotes = (id) => S.quotes.filter((q) => q.client === id).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
const latestPresence = (id) => clientReports(id).find((r) => r.type.startsWith("presence") && r.status === "published" && r.score != null);
const cref = (id) => doc(db, "clients", id);
const save = (id, patch) => updateDoc(cref(id), { ...patch, updated: serverTimestamp() }).catch((e) => { toast("Save failed: " + e.code); throw e; });
const logEntry = (id, text, kind = "Note") => Promise.all([addDoc(collection(cref(id), "log"), { at: serverTimestamp(), kind, text }), updateDoc(cref(id), { lastTouch: serverTimestamp() })]);

// ------------------------------------------------------------------ auth
let me = null;
function renderGate(kind) {
  $("#app").innerHTML = `<div class="gate"><div class="card">${mark("mark sweep")}<h1>${kind === "denied" ? "Not on the list" : "Clockworks"}</h1>
    <p>${kind === "denied" ? `${esc(me.email)} is signed in, but this account doesn't have portal access.` : "Your clients, assessments and quotes. Sign in to get to work."}</p>
    ${kind === "denied" ? `<button class="btn" id="out">Sign out</button>` : `<button class="btn p" id="signin" style="width:100%">Sign in with Google</button>`}
    ${EMU && kind !== "denied" ? `<button class="btn link" id="devin">Emulator: sign in as Parker</button>` : ""}</div></div>`;
  if (kind === "denied") { $("#out").onclick = doSignOut; return; }
  $("#signin").onclick = async () => {
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    try { await signInWithPopup(auth, p); } catch (e) { if (/popup/.test(e.code || "")) return signInWithRedirect(auth, p); toast("Sign-in failed: " + (e.code || e.message)); }
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
      <a class="brand" href="#/">${mark("mark sweep")}<span><b>CLOCKWORKS</b><small>Portal · CRM</small></span></a>
      <div class="nav-lbl">Workspace</div>
      <nav class="nav" id="nav">
        <a href="#/" data-r="dash">${ic("home")}Dashboard</a>
        <a href="#/clients" data-r="clients">${ic("users")}Clients<span class="n" id="navClients"></span></a>
        <a href="#/assess" data-r="assess">${ic("gauge")}Assessments</a>
        <a href="#/quotes" data-r="quotes">${ic("file")}Quotes &amp; invoices</a>
        <a href="#/assets" data-r="assets">${ic("box")}Assets</a>
        <a href="#/due" data-r="due">${ic("cal")}Due</a>
      </nav>
      <div class="nav-lbl">Clients</div>
      <nav class="nav" id="navPins"></nav>
      <div class="grow"></div>
      <div class="clock"><b id="clk">--:--</b><small id="clkd"></small></div>
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
    : ["clients", "assess", "quotes", "assets", "due"].includes(parts[0]) ? { name: parts[0], args: [] } : { name: "dash", args: [] };
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
  const moreR = ["assets", "quotes", "quote", "due", "settings", "more"];
  const tabR = R.name === "client" ? "clients" : moreR.includes(R.name) ? "more" : R.name;
  $$("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.r === railR));
  $$("#tabs [data-r]").forEach((a) => a.classList.toggle("on", a.dataset.r === tabR));
  $("#navClients").textContent = S.clients.length || "";
  $("#navPins").innerHTML = S.clients.slice().sort((a, b) => (toDate(b.lastTouch) || 0) - (toDate(a.lastTouch) || 0)).slice(0, 5)
    .map((c) => `<a href="#/c/${esc(c.id)}" class="${R.name === "client" && R.args[0] === c.id ? "on" : ""}"><span class="dot" style="background:${colorOf(c)}"></span>${esc(c.name.replace(/ \(.*\)/, ""))}</a>`).join("");
  if (!S.ready) { $("#view").innerHTML = `<div class="empty-note">Loading your clients…</div>`; return; }
  const v = $("#view");
  const scroll = window.scrollY;
  // Entrance motion only when the page itself changes, not on every live-data repaint.
  const key = R.name + "/" + R.args.join("/");
  const fresh = key !== lastPainted; lastPainted = key;
  // the first data snapshots land within a few hundred ms of opening; let those repaints keep the entrance too
  entering = fresh || performance.now() - enterAt < 450;
  if (fresh) { enterAt = performance.now(); v.classList.remove("enter"); void v.offsetWidth; v.classList.add("enter"); clearTimeout(enterT); enterT = setTimeout(() => v.classList.remove("enter"), 1200); }
  ({ dash: viewDash, clients: viewClients, client: viewClient, assess: viewAssess, quotes: viewQuotes, quote: viewQuote, assets: viewAssets, due: viewDue }[R.name])(v);
  if (!first) window.scrollTo(0, scroll);
  if (first) countUp(v); else $$("[data-count]", v).forEach((el) => (el.textContent = (el.dataset.pre || "") + Number(el.dataset.count).toLocaleString("en-US")));
}

// ------------------------------------------------------------------ dashboard
function milestones() {
  const pub = S.reports.filter((r) => r.status === "published").sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const created = S.clients.map((c) => toDate(c.created)).filter(Boolean).sort((a, b) => a - b);
  const pastMeeting = S.clients.filter((c) => STAGES.indexOf(c.stage) > 2 && STAGES.indexOf(c.stage) < 7);
  const sent = S.quotes.filter((q) => q.kind === "quote" && ["sent", "accepted"].includes(q.status));
  const paid = S.quotes.filter((q) => q.kind === "invoice" && q.status === "paid");
  const meeting = S.clients.find((c) => c.stage === "Meeting");
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
  const active = S.clients.filter((c) => ["Pilot", "Active"].includes(c.stage));
  const leads = S.clients.filter((c) => STAGES.indexOf(c.stage) < 5);
  const lines = ["Every client starts as a conversation.", "Small, steady moves add up.", "One good sit-down can change the month.", "You're building something real here.", "The best time to follow up is today."];
  const line = lines[(d.getDate() + d.getMonth()) % lines.length];
  const summary = S.clients.length === 0 ? "A clean slate. Add your first prospect and let's get moving."
    : `${S.clients.length} ${S.clients.length === 1 ? "prospect" : "prospects"} in motion${pub.length ? `, ${pub.length === 1 ? "your first assessment is live" : pub.length + " assessments published"}` : ""}${over.length ? `, and ${over.length} follow-up${over.length > 1 ? "s" : ""} waiting on you` : ""}. ${line}`;
  const ms = milestones(), done = ms.filter((m) => m.done).length, nowI = ms.findIndex((m) => !m.done);
  const C = 2 * Math.PI * 31, off = C * (1 - done / ms.length);
  const meeting = S.clients.find((c) => c.stage === "Meeting");
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
  if (noScan) ideas.push({ t: `Run a Presence scan for ${noScan.name}`, sub: "Opt-in Presence module. About fifty cents, a conversation opener.", act: `<a class="btn sm" href="#/assess?client=${esc(noScan.id)}&type=presence-free">Open</a>` });
  if (S.clients.length < 5) ideas.push({ t: `Add prospect #${S.clients.length + 1}`, sub: "A plumber, electrician or HVAC shop you already know. Warm intros win.", act: `<button class="btn sm" data-add>Add</button>` });
  const noInt = S.clients.find((c) => !(c.interests || []).length);
  if (noInt && ideas.length < 2) ideas.push({ t: `Note what ${noInt.name.replace(/ \(.*\)/, "")} cares about`, sub: "Even one line helps you walk in prepared.", act: `<a class="btn sm" href="#/c/${esc(noInt.id)}">Open</a>` });

  const feed = allLogs().slice(0, 7);
  const kindIcon = (k, t) => (/published|report/i.test(t) ? ["ok", "check"] : k === "Call" ? ["acc", "phone"] : k === "Text" ? ["acc", "msg"] : k === "Decision" ? ["data", "flag"] : /^Stage/.test(t) ? ["data", "flag"] : ["", "pen"]);

  v.innerHTML = `
  <section class="hello dash-hello">
    <div><div class="date">${DAYS[d.getDay()]} · ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}</div><h1>${greet}, ${esc(first)}.</h1><p>${esc(summary)}</p></div>
    <div class="acts"><a class="btn p" href="#/assess">${ic("spark")}Start an agent crew</a><button class="btn" data-add>${ic("plus")}Add a prospect</button>${S.clients.some((c) => hasModule(c, "presence")) ? `<a class="btn ghost" href="#/assess?type=presence-free">${ic("globe")}Presence scan</a>` : ""}</div>
  </section>

  <section class="tiles">
    <a class="panel tile" href="#/clients" style="text-decoration:none"><span class="lbl">${ic("users")}Prospects &amp; clients</span><span class="row1"><span class="big" data-count="${S.clients.length}">${S.clients.length}</span><span class="stack">${S.clients.slice(0, 4).map((c) => `<span style="background:${colorOf(c)}">${esc(initials(c.name))}</span>`).join("")}</span></span><span class="sub">${active.length ? `<b>${active.length} active</b> · ` : ""}${leads.length} in the pipeline</span></a>
    <a class="panel tile" href="#/assess" style="text-decoration:none"><span class="lbl">${ic("gauge")}Assessments published</span><span class="row1"><span class="big" data-count="${pub.length}">${pub.length}</span>${latestPub && latestPub.score != null ? gauge(latestPub.score) : ""}</span><span class="sub">${latestPub ? `Latest: ${esc(client(latestPub.client)?.name || "")}` : "Your first one is a click away"}</span></a>
    <div class="panel tile"><span class="lbl">${ic("bolt")}Moves this week</span><span class="row1"><span class="big" data-count="${week.length}">${week.length}</span>${spark()}</span><span class="sub">${week.length ? (week.length >= 5 ? "<b>Nice momentum.</b> Keep it rolling." : "Every note and call counts.") : "Log a call or a note to start the streak."}</span></div>
    ${openQ.length || unpaid.length
      ? `<a class="panel tile" href="#/quotes" style="text-decoration:none"><span class="lbl">${ic("file")}Quotes out</span><span class="big" data-count="${Math.round(openQ.reduce((a, x) => a + quoteTotal(x).total, 0))}" data-pre="$">${money(openQ.reduce((a, x) => a + quoteTotal(x).total, 0))}</span><span class="sub">${openQ.length} open${unpaid.length ? ` · ${money(unpaid.reduce((a, x) => a + quoteTotal(x).total, 0))} to collect` : ""}</span></a>`
      : `<button class="panel tile cta" data-newquote><span class="lbl">${ic("file")}Quotes</span><span class="big">Draft your first quote <span class="arr">→</span></span><span class="sub">When Eicher's sit-down lands, the pilot quote goes here.</span></button>`}
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
      <div class="panel journey p-journey">
        <div class="jhead"><span class="ringwrap"><svg class="ring" viewBox="0 0 72 72" aria-hidden="true"><circle class="bg" cx="36" cy="36" r="31" fill="none" stroke-width="6"/><circle class="fg" cx="36" cy="36" r="31" fill="none" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${reduced || !entering ? off.toFixed(1) : C.toFixed(1)}" data-off="${off.toFixed(1)}" transform="rotate(-90 36 36)"/><svg class="mark${entering ? " sweep" : ""}" x="18" y="18" width="36" height="36" viewBox="0 0 364 361">${$("#cw-mark").innerHTML}</svg></svg><span class="ring-n">${done}/${ms.length}</span></span>
          <div><b>${done === 0 ? "Let's get started." : done < 3 ? "You're off the starting line." : done < ms.length ? "The flywheel is turning." : "Clockworks is up and running."}</b><small>${done} of ${ms.length} early milestones reached. Next: ${esc(nowI >= 0 ? ms[nowI].t.toLowerCase() : "keep going")}.</small></div></div>
        <ol class="steps">${ms.map((m, i) => `<li class="${m.done ? "done" : i === nowI ? "now" : ""}"><span class="st">${m.done ? ic("check") : i + 1}</span><div><b>${esc(m.t)}</b><small>${esc(m.done ? (m.sub || "Done") : m.hint)}</small>${i === nowI ? `<div class="go">${stepAct[i] || ""}</div>` : ""}</div><span class="when">${m.done ? esc(m.when || "✓") : i === nowI ? `<span class="chip acc">Up next</span>` : ""}</span></li>`).join("")}</ol>
      </div>
      <div class="panel lane p-lane">
        <div class="ph" style="padding:0"><h2>Pipeline <small>${S.clients.length} ${S.clients.length === 1 ? "client" : "clients"}</small></h2></div>
        <div class="lane-track">${MAIN.map((s) => { const here = S.clients.filter((c) => c.stage === s); return `<div class="lane-col ${here.length ? "has" : ""}"><span class="bar"></span><small>${esc(STAGE_SHORT[s] || s)}</small><div class="pucks">${here.map((c) => `<a class="puck" href="#/c/${esc(c.id)}" title="${esc(c.name)}" style="background:${colorOf(c)}">${esc(initials(c.name))}</a>`).join("")}</div></div>`; }).join("")}</div>
      </div>
      ${(() => { const rows = S.clients.map((c) => ({ c, r: latestPresence(c.id) })).filter((x) => x.r && hasModule(x.c, "presence")); return rows.length ? `<div class="panel p-scores"><div class="ph"><h2>Presence scores <small>latest per client</small></h2></div><div class="pb scores">${rows.map(({ c, r }) => `<div class="score-row"><a href="#/c/${esc(c.id)}" style="text-decoration:none"><b style="font:600 13.5px var(--ff)">${esc(c.name)}</b><br><small class="chip ${bandCls(r.score)}" style="height:20px;margin-top:3px">${esc(band(r.score))}</small></a><span class="track"><span class="fill ${bandCls(r.score)}" style="width:${r.score}%"></span></span><b>${r.score}</b></div>`).join("")}</div></div>` : ""; })()}
    </div>
  </section>`;
  requestAnimationFrame(() => { const fg = $(".ring .fg", v); if (fg) fg.setAttribute("stroke-dashoffset", fg.dataset.off); });
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
function openModal(html, onMount) {
  $("#modal").innerHTML = `<div class="scrim" id="scrim"><div class="dialog" role="dialog" aria-modal="true">${html}</div></div>`;
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
      inp = `<textarea class="input" name="${x.k}" placeholder="${esc(x.placeholder || "")}">${esc(val)}</textarea>`;
    } else {
      inp = `<input class="input" name="${x.k}" type="${x.type || "text"}" value="${esc(val)}" placeholder="${esc(x.placeholder || "")}" ${x.required ? "required" : ""} ${x.type === "tel" ? 'inputmode="tel"' : ""} autocomplete="off">`;
    }
    return `<label class="field" ${x.hide ? "hidden" : ""} data-fk="${esc(x.k)}" style="${x.full ? "flex-basis:100%" : ""}">${esc(x.label)}${inp}</label>`;
  };
  openModal(`<form id="fd"><div style="display:grid;gap:14px"><h2>${esc(title)}</h2>${intro ? `<p>${intro}</p>` : ""}<div class="row">${fields.map(f).join("")}</div>
    <div class="foot">${onDelete ? `<button type="button" class="btn danger ghost" id="fdDel" style="margin-right:auto">${ic("trash")}Remove</button>` : ""}<button type="button" class="btn ghost" id="fdX">Cancel</button><button class="btn p">${esc(submit)}</button></div></div></form>`, (d) => {
    $("#fdX", d).onclick = closeModal;
    if (onDelete) $("#fdDel", d).onclick = async (e) => { const b = e.currentTarget; if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Tap again to remove"; return; } await onDelete(); closeModal(); };
    $("#fd", d).onsubmit = async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); Object.keys(data).forEach((k) => (data[k] = String(data[k]).trim())); try { await onSave(data); closeModal(); } catch (err) { console.error(err); } };
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
      <label class="field" style="flex-basis:100%">Name<input class="input" name="name" required placeholder="e.g. Northside HVAC" value="${esc(pre.name || "")}" autocomplete="off"></label>
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
    fields: [{ k: "what", label: "Next step", full: true, required: true, placeholder: "e.g. Text Shanna to pick a date" }, { k: "due", label: "By when", type: "date" }],
    onSave: async (d) => { await save(id, { next: { what: d.what, due: d.due } }); await logEntry(id, `Next step: ${d.what}${d.due ? " (by " + fmtDay(d.due) + ")" : ""}`, "Note"); toast("Next step set"); } });
}

// ------------------------------------------------------------------ clients
let clientFilter = "All";
function viewClients(v) {
  const stages = ["All", ...STAGES.filter((s) => S.clients.some((c) => c.stage === s))];
  const list = S.clients.filter((c) => clientFilter === "All" || c.stage === clientFilter).sort((a, b) => dueInfo(a.next).rank - dueInfo(b.next).rank || (toDate(b.lastTouch) || 0) - (toDate(a.lastTouch) || 0));
  v.innerHTML = `<section class="hello"><div><div class="date">Clients &amp; prospects</div><h1>Your people.</h1><p>${S.clients.length ? `${S.clients.length} so far. Every one of them started as a conversation.` : "No one yet. Your first prospect is the hardest and the best."}</p></div></section>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${stages.map((s) => `<button class="chip ${s === clientFilter ? "acc" : "dash"}" data-f="${esc(s)}" style="cursor:pointer;border:0;height:30px;padding:0 12px">${esc(s)} <span class="mono">${s === "All" ? S.clients.length : S.clients.filter((c) => c.stage === s).length}</span></button>`).join("")}</div>
    <div class="clist">${list.map((c) => { const d = dueInfo(c.next), r = latestPresence(c.id); return `<a class="panel ccard" href="#/c/${esc(c.id)}"><div class="top"><span class="avatar" style="background:${colorOf(c)}">${esc(initials(c.name))}</span><div><div class="nm">${esc(c.name)}</div><div class="sub">${esc([c.trade, c.town].filter(Boolean).join(" · ") || "Details to come")}</div></div></div>
      <div class="nx">${ic("flag")}<span>${esc(c.next?.what || "No next step yet")}</span></div>
      <div class="meta"><span class="chip data">${esc(c.stage)}</span><span class="chip ${clientPath(c) === "personal" ? "acc" : "dash"}">${esc(pathLabel(clientPath(c)))}</span>${d.cls ? `<span class="chip ${d.cls === "over" ? "bad" : "warn"}">${esc(d.label)}</span>` : ""}${r && hasModule(c, "presence") ? `<span class="chip ${bandCls(r.score)}">Presence ${r.score}</span>` : ""}<span class="chip dash">Touched ${esc(ago(c.lastTouch))}</span></div></a>`; }).join("")}
      <button class="panel addcard" data-add><span class="plus">${ic("plus")}</span><b>Add a prospect</b><small>A shop you already know is the best place to start. <kbd>N</kbd> works anywhere.</small></button></div>`;
  $$("[data-f]", v).forEach((b) => (b.onclick = () => { clientFilter = b.dataset.f; refresh(true); }));
  wireCommon(v);
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
        const original = cm.originalName || stored.replace(/^\d{10,}-/, "") || stored;
        return {
          path: item.fullPath, name: original, size: meta.size, timeCreated: meta.timeCreated,
          uploadedBy: cm.uploadedBy || "", category: cm.category === "returned-intake" ? "returned-intake" : "general",
          contentType: meta.contentType || "",
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
function filesCardHtml(prefix, { title, empty, taggable }) {
  if (!fileCache[prefix] && !fileLoading[prefix]) loadFiles(prefix);
  const rec = fileCache[prefix];
  const items = fileItems(prefix);
  const ups = uploads[prefix] || [];
  const filt = fileFilter[prefix] || "all";
  const cat = uploadCat[prefix] || "general";
  const n = rec ? (rec.items || []).length : 0;
  const filterBar = taggable ? `<div class="file-filters">${[{ id: "all", label: "All" }, ...FILE_TAGS].map((t) => `<button type="button" class="chip ${t.id === filt ? "acc" : "dash"}" data-ff="${esc(t.id)}" style="cursor:pointer;border:0;height:26px">${esc(t.label)}</button>`).join("")}</div>` : "";
  const tagSelect = taggable ? `<label class="field file-tag" style="min-width:150px;flex:0;margin:0">Tag<select class="input" data-upcat>${FILE_TAGS.map((t) => `<option value="${t.id}" ${t.id === cat ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></label>` : "";
  const list = [
    ...ups.map((u) => `<div class="file" data-up="${esc(u.id)}"><div><b>${esc(u.name)}</b><small>Uploading… ${u.pct}%</small></div><div class="upbar"><i style="width:${u.pct}%"></i></div></div>`),
    ...items.map((f) => `<div class="file">
      <div><b>${esc(f.name)}</b><small>${esc(fmtSize(f.size))}${f.timeCreated ? " · " + esc(fmtDay(String(f.timeCreated).slice(0, 10))) : ""}${f.uploadedBy ? " · " + esc(f.uploadedBy) : ""}</small></div>
      ${taggable ? `<button type="button" class="chip ${f.category === "returned-intake" ? "acc" : "dash"}" data-retag="${esc(f.path)}" data-cat="${esc(f.category)}" title="Tap to retag" style="cursor:pointer;border:0">${esc(tagLabel(f.category))}</button>` : ""}
      <div class="file-acts"><button type="button" class="btn sm" data-dl="${esc(f.path)}">${ic("link")}Open</button><button type="button" class="btn sm ghost danger" data-rm="${esc(f.path)}" aria-label="Delete ${esc(f.name)}">${ic("trash")}</button></div>
    </div>`),
  ].join("");
  let body;
  if (!rec) body = `<div class="empty-note">Loading files…</div>`;
  else if (rec.err && !n && !ups.length) body = `<div class="empty-note">Couldn't list files (${esc(rec.err)}). Storage may still be off for this project.</div>`;
  else if (!items.length && !ups.length) body = `<div class="empty-note">${empty}</div>`;
  else body = `<div class="files">${list}</div>`;
  return `<section class="panel files-card" data-prefix="${esc(prefix)}" data-taggable="${taggable ? "1" : "0"}">
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
    $$("[data-dl]", card).forEach((b) => (b.onclick = async () => {
      try { window.open(await getDownloadURL(sref(storage, b.dataset.dl)), "_blank", "noopener"); }
      catch (e) { toast("Couldn't open: " + (e.code || e.message)); }
    }));
    $$("[data-rm]", card).forEach((b) => (b.onclick = async (e) => {
      const btn = e.currentTarget;
      if (btn.dataset.armed !== "1") { btn.dataset.armed = "1"; btn.textContent = "Tap again"; setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ""; btn.innerHTML = ic("trash"); } }, 4000); return; }
      try { await deleteObject(sref(storage, btn.dataset.rm)); toast("File removed."); await loadFiles(prefix, true); }
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
  const path = `${prefix}/${Date.now()}-${safeFileName(file.name)}`;
  if (!uploads[prefix]) uploads[prefix] = [];
  const u = { id, name: file.name, pct: 0 };
  uploads[prefix].push(u);
  refresh(true);
  const meta = { contentType: type, customMetadata: { category, originalName: file.name, uploadedBy: me?.email || "" } };
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
let assetCat = "client-intake";
function viewAssets(v) {
  const cat = ASSET_CATS.find((c) => c.id === assetCat) || ASSET_CATS[0];
  const prefix = `assets/${cat.id}`;
  v.innerHTML = `
    <section class="hello"><div><div class="date">Assets</div><h1>The box.</h1><p>Intake forms, one-pagers, and the rest of the kit. Grab them from any desk.</p></div></section>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${ASSET_CATS.map((c) => `<button type="button" class="chip ${c.id === cat.id ? "acc" : "dash"}" data-acat="${esc(c.id)}" style="cursor:pointer;border:0;height:30px;padding:0 12px">${esc(c.label)}</button>`).join("")}</div>
    ${filesCardHtml(prefix, { title: cat.label, empty: `Nothing in ${esc(cat.label.toLowerCase())} yet. ${esc(cat.blurb)}`, taggable: false })}`;
  $$("[data-acat]", v).forEach((b) => (b.onclick = () => { assetCat = b.dataset.acat; refresh(true); }));
  wireFilesPanel(v);
}

// ------------------------------------------------------------------ client 360
let composeKind = "Note";
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
  <div class="crumb"><a href="#/clients">Clients</a> / ${esc(c.name)}</div>
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
    <div class="stages" role="group" aria-label="Stage (tap to move)">${STAGES.map((s, i) => `${i === 7 ? `<span class="gap"></span>` : ""}<button class="stg ${i < si && si < 7 ? "past" : ""} ${i === si ? "cur" : ""} ${i >= 7 && i !== si ? "off" : ""}" data-stage="${esc(s)}" title="Move to ${esc(s)}"><i></i><small>${esc(STAGE_SHORT[s] || s)}</small></button>`).join("")}</div>
    <div class="strip">
      ${hasModule(c, "presence")
        ? `<div><span class="lbl">Presence score</span><b>${pr ? `${pr.score}<small class="chip ${bandCls(pr.score)}" style="height:20px">${band(pr.score)}</small>` : `<span style="font:600 14px var(--ff);color:var(--ink-3)">Not run yet</span>`}</b></div>`
        : `<div><span class="lbl">Path</span><b>${esc(pathLabel(clientPath(c)))}</b></div>`}
      <div><span class="lbl">Open quotes</span><b>${openQ.length ? money(openQ.reduce((a, q) => a + quoteTotal(q).total, 0)) : `<span style="font:600 14px var(--ff);color:var(--ink-3)">None yet</span>`}</b></div>
      ${hasModule(c, "tech_stack") ? `<div><span class="lbl">Tech confirmed</span><b>${tech.length ? `${tc.confirmed}/${tech.length}` : `<span style="font:600 14px var(--ff);color:var(--ink-3)">Discovering</span>`}</b></div>` : ""}
      <div><span class="lbl">Last touch</span><b style="font-size:16px">${esc(ago(c.lastTouch))}</b></div>
    </div>
  </section>

  <section class="grid g3">
    <div class="panel"><div class="ph"><h2>Details</h2><button class="btn sm ghost" data-edit="details">${ic("pen")}Edit</button></div><div class="pb">
      <dl class="kv"><dt>${clientPath(c) === "personal" ? "Name" : "Business"}</dt><dd>${esc(c.name)}</dd>${c.trade ? `<dt>Trade</dt><dd>${esc(c.trade)}</dd>` : ""}${c.hq ? `<dt>HQ</dt><dd>${esc(c.hq)}</dd>` : c.town ? `<dt>Town</dt><dd>${esc(c.town)}</dd>` : ""}${c.phone ? `<dt>Phone</dt><dd class="mono">${esc(c.phone)}</dd>` : ""}${c.email ? `<dt>Email</dt><dd>${mailLink(c.email)}</dd>` : ""}${site ? `<dt>Website</dt><dd><a href="${esc(site)}" target="_blank" rel="noopener" style="color:var(--accent-ink);text-decoration:none">${esc(c.website)}</a></dd>` : ""}${(c.towns || []).length ? `<dt>Serves</dt><dd class="towns">${c.towns.map((t) => `<span>${esc(t)}</span>`).join("")}</dd>` : ""}</dl>
      ${!c.hq && !c.phone && !site && !c.email ? `<div class="empty-note" style="margin-top:12px">Details fill in as you learn them. <button class="btn sm" data-edit="details">Add details</button></div>` : ""}</div></div>
    <div class="panel"><div class="ph"><h2>Interested in <small>${ints.length || ""}</small></h2><button class="btn sm ghost" data-int="new">${ic("plus")}Add</button></div><div class="pb">
      ${ints.length ? `<div class="ints">${ints.map((x, i) => `<button class="int" data-int="${i}" style="background:none;border:0;padding:0;text-align:left;cursor:pointer;color:inherit">${x.status === "active" ? `<span class="no">${ints.filter((y, j) => y.status === "active" && j <= i).length}</span>` : `<span class="no ghost ${x.status === "asked" ? "asked" : ""}"></span>`}<span><b>${esc(x.title)}${x.status !== "active" ? ` <span class="chip ${x.status === "asked" ? "data" : "dash"} mini">${x.status === "asked" ? "Asked about" : "Earlier idea"}</span>` : ""}</b>${x.note ? `<small>${esc(x.note)}</small>` : ""}</span><span></span></button>`).join("")}</div>`
        : `<div class="empty-note">What is ${esc(short)} hoping to fix? Add it after your first chat.<button class="btn sm" data-int="new">${ic("plus")}Add an interest</button></div>`}</div></div>
    <div class="panel"><div class="ph"><h2>Contacts <small>${(c.contacts || []).length || ""}</small></h2><button class="btn sm ghost" data-contact="new">${ic("plus")}Add</button></div><div class="pb">
      ${(c.contacts || []).length ? `<div class="people">${c.contacts.map((p, i) => `<div class="person"><span class="pa">${esc(initials(p.name))}</span><div><b>${esc(p.name)}</b>${p.channel ? ` <span class="chip ok" style="height:20px">Prefers ${esc(p.channel.toLowerCase())}</span>` : ""}<small>${esc(p.role || "")}</small>${p.phone ? `<small class="mono"><a href="tel:${esc(p.phone.replace(/[^\d+]/g, ""))}" style="text-decoration:none">${esc(p.phone)}</a></small>` : ""}${p.email ? `<small>${mailLink(p.email)}</small>` : ""}</div><button class="btn sm ghost" data-contact="${i}" aria-label="Edit ${esc(p.name)}">${ic("pen")}</button></div>`).join("")}</div>`
        : `<div class="empty-note">Who's the decision-maker?<button class="btn sm" data-contact="new">${ic("plus")}Add a contact</button></div>`}</div></div>
  </section>

  ${filesCardHtml(`clients/${c.id}`, { title: "Files", empty: `No files yet for ${esc(short)}. Drop a returned intake or a photo here — PDF or images, 20 MB each.`, taggable: true })}

  ${hasModule(c, "household") ? `<section class="panel"><div class="ph"><h2>Household</h2></div><div class="pb"><div class="empty-note"><b>Coming soon — household.</b> Life stays on the always-on cards for now.</div></div></section>` : ""}

  <section class="crm-cards">
    ${(() => { const filled = !!(c.deal?.type || c.deal?.startDate || c.deal?.guarantee); return filled || clientPath(c) === "business" ? dealCard(c) : ""; })()}
    ${(() => { const filled = !!(c.payment?.status || c.payment?.amount != null || c.payment?.date); return filled || clientPath(c) === "business" ? paymentCard(c) : ""; })()}
    ${intakeCard(c)}
    ${leadCard(c)}
    ${nextStepsCard(c)}
    ${hasModule(c, "team_bots") ? aiSetupCard(c) : ""}
  </section>

  ${hasModule(c, "tech_stack") ? `<section class="panel"><div class="ph"><h2>Tech stack <small>as discovered · ${tech.length} ${tech.length === 1 ? "system" : "systems"}</small></h2><button class="btn sm ghost" data-tech="new">${ic("plus")}Add system</button></div><div class="pb">
    ${tech.length ? `<div class="tech-bar"><i style="flex:${tc.confirmed || 0};background:var(--ok-fill)"></i><i style="flex:${tc.assumed || 0};background:repeating-linear-gradient(135deg,var(--warn-fill) 0 4px,transparent 4px 7px)"></i><i style="flex:${tc.unknown || 0};background:var(--line-strong)"></i></div>
      <div class="tech-legend"><span>Confirmed <b>${tc.confirmed}</b></span><span>Assumed <b>${tc.assumed}</b></span><span>Unknown <b>${tc.unknown}</b></span></div>
      <div class="techs">${tech.map((t, i) => `<button class="tech ${esc(t.status)}" data-tech="${i}"><span class="cat">${esc(t.category || "System")}</span><b>${esc(t.name)}</b>${t.source ? `<small>${esc(t.source)}</small>` : ""}<span class="st">${esc(TECH_ST[t.status] || t.status)}</span></button>`).join("")}</div>`
      : `<div class="empty-note">Nothing discovered yet. Add the systems you learn about (CRM, phones, payments).<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-tech="new">${ic("plus")}Add a system</button></div></div>`}</div></section>` : ""}

  ${(() => {
    const vis = REPORTS.filter((t) => hasModule(c, reportModule(t.type)));
    const runType = hasModule(c, "team_bots") ? "agent-free" : (vis[0]?.type || "agent-free");
    const showQuotes = quotes.length > 0 || clientPath(c) === "business";
    const reportsHtml = vis.length ? `<div class="panel"><div class="ph"><h2>Reports</h2><a class="btn sm ghost" href="#/assess?client=${esc(c.id)}&type=${esc(runType)}">${ic("gauge")}Run one</a></div><div class="pb"><div class="reps">${vis.map((t) => {
      const r = reps.find((x) => x.type === t.type);
      if (!r) return `<div class="rep none"><div class="rt"><span>${esc(t.name)}</span><span class="chip dash">Not run</span></div><small>${esc(t.cost)} · ${esc(t.time)}</small><a class="btn sm" href="#/assess?client=${esc(c.id)}&type=${t.type}" style="justify-self:start">${ic("play")}Run</a></div>`;
      return `<div class="rep"><div class="rt"><span>${esc(t.name)}</span><span class="chip ${r.status === "published" ? "ok" : r.status === "draft" ? "warn" : "dash"}">${esc(r.status)}</span></div>
        ${r.score != null ? `<div class="sc"><b>${r.score}</b><span class="chip ${bandCls(r.score)}">${band(r.score)}</span></div>` : ""}<small>${esc(fmtDay(r.date))}${r.cost ? " · $" + esc(r.cost) : ""}${r.pin ? " · PIN on file" : ""}</small>
        ${r.pillars ? `<div class="pillars">${PILLARS.map(([k, n]) => r.pillars[k] != null ? `<div><span>${n}</span><b>${r.pillars[k]}</b><i><u style="width:${r.pillars[k]}%"></u></i></div>` : "").join("")}</div>` : ""}
        ${r.link ? `<a class="btn sm" href="${esc(r.link)}" target="_blank" rel="noopener" style="justify-self:start">${ic("link")}Open report</a>` : ""}</div>`;
    }).join("")}</div></div></div>` : "";
    const quotesHtml = showQuotes ? `<div class="panel"><div class="ph"><h2>Quotes &amp; invoices</h2><button class="btn sm ghost" data-newquote="${esc(c.id)}">${ic("plus")}New quote</button></div><div class="pb">
      ${quotes.length ? `<div class="rows">${quotes.map((q) => `<a class="rw" href="#/q/${esc(c.id)}/${esc(q.id)}" style="text-decoration:none"><span><b>${esc(q.title || "Untitled")}</b><small class="mono">${esc(q.number)} · ${esc(fmtDay(q.date))}</small></span><span class="chip ${qCls(q.status)}">${esc(q.kind === "invoice" ? "Invoice · " : "")}${esc(q.status)}</span><span class="amt">${money(quoteTotal(q).total)}</span></a>`).join("")}</div>`
        : `<div class="empty-note">No quotes yet. When ${esc(short)} is ready, draft one here in a minute.<button class="btn sm" data-newquote="${esc(c.id)}">${ic("file")}Draft a quote</button></div>`}</div></div>` : "";
    return reportsHtml || quotesHtml ? `<section class="grid g2">${reportsHtml}${quotesHtml}</section>` : "";
  })()}

  <section class="grid g2">
    ${hasModule(c, "vendors") ? `<div class="panel"><div class="ph"><h2>Contracts <small>vendors they're locked into</small></h2><button class="btn sm ghost" data-vendor="new">${ic("plus")}Add</button></div><div class="pb">
      ${(c.vendors || []).length ? c.vendors.map((x, i) => contractHtml(x, i)).join("") : `<div class="empty-note">No contracts on file. If they're tied to a vendor (a Thryv, a website company), note the end date and notice window here.<button class="btn sm" data-vendor="new">${ic("plus")}Add a contract</button></div>`}</div></div>` : ""}
    <div class="panel"><div class="ph"><h2>Activity <small>${logs.length}</small></h2></div><div class="pb">
      <div class="composer"><div class="kinds" role="group" aria-label="Kind">${KINDS.map((k) => `<button type="button" data-kind="${k}" aria-pressed="${k === composeKind}">${k}</button>`).join("")}</div>
        <div class="row"><textarea id="compose" placeholder="What happened? e.g. Texted Shanna about Thursday" rows="1"></textarea><button class="btn p" id="addLog">Add</button></div></div>
      <div class="log">${logs.map((l) => `<div class="le"><time>${esc(dayOf(l.at) || "…")}</time><div><span class="k">${esc(l.kind || "Note")}</span><p>${esc(l.text)}</p></div></div>`).join("") || `<div class="le"><time></time><div><p style="color:var(--ink-3)">Nothing logged yet.</p></div></div>`}</div></div></div>
  </section>
  <div style="display:flex;justify-content:center;padding-top:8px"><button class="btn sm ghost danger" id="delClient">${ic("trash")}Delete ${esc(short)}</button></div>`;

  // wiring
  $$("[data-stage]", v).forEach((b) => (b.onclick = async () => { const s = b.dataset.stage; if (s === c.stage) return; const from = c.stage; await save(c.id, { stage: s }); await logEntry(c.id, `Stage: ${from} → ${s}`, "Decision"); if (STAGES.indexOf(s) > STAGES.indexOf(from) && STAGES.indexOf(s) < 7) confetti(); toast(`${short} → ${s}`); }));
  $$("[data-do]", v).forEach((b) => (b.onclick = () => { const a = b.dataset.do; if (a === "done") markDone(c.id); else if (a === "next") editNext(c.id); else { $("#compose").focus(); $("#compose").scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" }); } }));
  $$("[data-edit='details']", v).forEach((b) => (b.onclick = () => editDetails(c)));
  $$("[data-int]", v).forEach((b) => (b.onclick = () => editList(c, "interests", b.dataset.int)));
  $$("[data-contact]", v).forEach((b) => (b.onclick = () => editList(c, "contacts", b.dataset.contact)));
  $$("[data-tech]", v).forEach((b) => (b.onclick = () => editList(c, "tech", b.dataset.tech)));
  $$("[data-vendor]", v).forEach((b) => (b.onclick = () => editList(c, "vendors", b.dataset.vendor)));
  $$("[data-kind]", v).forEach((b) => (b.onclick = () => { composeKind = b.dataset.kind; $$("[data-kind]", v).forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
  const addLog = async () => { const t = $("#compose").value.trim(); if (!t) return $("#compose").focus(); $("#compose").value = ""; $("#compose").blur(); await logEntry(c.id, t, composeKind); toast("Logged"); };
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
  wireCommon(v);
}

// ------------------------------------------------------------------ CRM cards (additive fields; missing = fine)
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
  return `<div class="panel crm-card"><div class="ph"><h2>Lead source</h2><button class="btn sm ghost" data-crm="lead">${ic("pen")}Edit</button></div><div class="pb">
    ${l.source || l.note ? `<dl class="kv">${l.source ? `<dt>Source</dt><dd><span class="chip data">${esc(labelOf(LEAD_SRC, l.source))}</span></dd>` : ""}${l.note ? `<dt>Note</dt><dd>${esc(l.note)}</dd>` : ""}</dl>`
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
    formDialog({ title: "Lead source", values: { source: l.source || "", note: l.note || "" },
      fields: [{ k: "source", label: "Source", type: "select", options: [["", "—"], ...LEAD_SRC] }, { k: "note", label: "Note", full: true, placeholder: "Who referred them, which campaign…" }],
      onSave: async (x) => { await save(c.id, { lead: { source: x.source || "", note: x.note || "" } }); toast("Lead source saved."); } });
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
      const patch = {
        name: data.name, trade: data.trade, town: data.town, hq: data.hq, phone: data.phone, email: data.email || "", website: data.website,
        towns: data.towns.split(",").map((s) => s.trim()).filter(Boolean),
        tags: data.tags.split(",").map((s) => s.trim()).filter(Boolean),
        brand: { ...(c.brand || {}), color1: /^#[0-9a-f]{3,8}$/i.test(data.color1) ? data.color1 : c.brand?.color1 || "" },
        path, engagement,
      };
      if (pathChanged) patch.modules = mergeModules(c.modules, path, engagement);
      await save(c.id, patch);
      toast("Saved");
      closeModal();
    };
  });
}
const LISTS = {
  interests: { title: "What they're interested in", fields: [{ k: "title", label: "Interest", full: true, required: true, placeholder: "e.g. More Google reviews" }, { k: "note", label: "Note", full: true }, { k: "status", label: "Where it stands", type: "select", options: Object.entries(INT_ST) }], blank: { status: "active" }, log: (x) => `Interested in: ${x.title}` },
  contacts: { title: "Contact", fields: [{ k: "name", label: "Name", required: true }, { k: "role", label: "Role" }, { k: "phone", label: "Phone", type: "tel" }, { k: "email", label: "Email", type: "email" }, { k: "channel", label: "Prefers", type: "select", options: ["", "Text", "Call", "Email", "In person"] }], blank: { channel: "Text" } },
  tech: { title: "System in their stack", fields: [{ k: "name", label: "System", required: true, placeholder: "e.g. Housecall Pro" }, { k: "category", label: "Category", placeholder: "Field ops, Website, Phones…" }, { k: "status", label: "Status", type: "select", options: Object.entries(TECH_ST) }, { k: "source", label: "Where we learned it", full: true, placeholder: "e.g. Shanna told us · DNS lookup" }], blank: { status: "assumed" }, log: (x) => `Tech stack: ${x.name} (${TECH_ST[x.status] || x.status})` },
  vendors: { title: "Contract", fields: [{ k: "name", label: "Vendor", required: true, placeholder: "e.g. Thryv" }, { k: "what", label: "What it does" }, { k: "end", label: "Contract ends", type: "date" }, { k: "notice_days", label: "Notice window (days)", type: "number" }, { k: "notes", label: "Notes", full: true }], blank: {} },
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
function viewAssess(v) {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  if (params.get("type")) pickType = params.get("type");
  if (params.get("client")) pickClient = params.get("client");
  if (!pickClient && S.clients[0]) pickClient = S.clients[0].id;
  const selC = pickClient && pickClient !== "__new" ? client(pickClient) : null;
  if (selC && pickType && !reportEnabled(selC, pickType)) pickType = firstEnabledReport(selC) || pickType;
  const all = S.reports.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const T = RTYPE[pickType] || REPORTS[0];
  const pickOn = reportEnabled(selC, pickType);
  v.innerHTML = `<section class="hello"><div><div class="date">Assessments</div><h1>Show them what you see.</h1><p>Pick a report, pick a business, and queue it. Every report uses the same design, so a free scan grows into the full one.</p></div></section>
    <section class="tools">${REPORTS.map((t) => {
      const on = reportEnabled(selC, t.type);
      const tip = on ? "" : `${MODULE_LABELS[reportModule(t.type)] || "This module"} is off for this client`;
      return `<button class="panel tool ${on ? "" : "is-off"}" data-type="${t.type}" aria-pressed="${t.type === pickType && on}" ${on ? "" : `disabled title="${esc(tip)}"`}><span class="ico ${t.type.endsWith("full") ? "full" : ""}">${ic(t.fam === "presence" ? "globe" : "spark")}</span><b>${esc(t.name)}</b><p>${esc(t.desc)}</p><span class="cost"><span>${esc(t.cost)}</span><span>${esc(t.time)}</span></span></button>`;
    }).join("")}</section>
    <section class="panel run"><div class="ph" style="padding:0"><h2>Run ${esc(T.name)}</h2></div>
      <form id="runf" class="row">
        <label class="field">For<select class="input" name="client" id="runClient">${S.clients.map((c) => `<option value="${esc(c.id)}" ${c.id === pickClient ? "selected" : ""}>${esc(c.name)}</option>`).join("")}<option value="__new" ${pickClient === "__new" ? "selected" : ""}>+ A new business…</option></select></label>
        <label class="field newbiz" hidden>Business name<input class="input" name="nname" placeholder="e.g. Crow River Landscaping"></label>
        <label class="field newbiz" hidden>Website<input class="input" name="nweb" placeholder="example.com"></label>
        <label class="field newbiz" hidden>Town<input class="input" name="ntown" placeholder="Dayton, MN"></label>
        <button class="btn p" ${pickOn ? "" : "disabled"}>${ic("play")}Queue ${esc(T.name)}</button>
      </form>
      <div class="howto">${howTo(pickType, selC)}</div>
    </section>
    <section class="panel"><div class="ph"><h2>All reports <small>${all.length}</small></h2></div><div class="tablewrap" style="margin-top:8px">
      ${all.length ? `<table class="t"><thead><tr><th>Client</th><th>Report</th><th>Status</th><th>Date</th><th style="text-align:right">Score</th><th></th></tr></thead><tbody>${all.map((r) => { const c = client(r.client); return `<tr><td><a href="#/c/${esc(r.client)}">${esc(c?.name || r.client)}</a></td><td>${esc(RTYPE[r.type]?.name || r.type)}</td><td><span class="chip ${r.status === "published" ? "ok" : r.status === "draft" ? "warn" : "dash"}">${esc(r.status)}</span></td><td class="mono">${esc(fmtDay(r.date))}</td><td class="n">${r.score ?? "–"}</td><td>${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">Open ↗</a>` : ""}</td></tr>`; }).join("")}</tbody></table>`
        : `<div class="pb"><div class="empty-note">No reports yet. Queue an Agent Team report to start the conversation.</div></div>`}</div></section>`;
  $$("[data-type]", v).forEach((b) => (b.onclick = () => {
    if (b.disabled) return toast(b.title || "That report is off for this client");
    pickType = b.dataset.type; refresh(true);
  }));
  const sel = $("#runClient");
  const sync = () => { const nw = sel.value === "__new"; $$(".newbiz", v).forEach((x) => (x.hidden = !nw)); $(".howto", v).innerHTML = howTo(pickType, nw ? null : client(sel.value)); };
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
    if (id === "__new") {
      if (!f.nname.trim()) return toast("Add the business name first");
      id = slugify(f.nname); while (client(id)) id += "-2";
      await setDoc(cref(id), blankClientDoc({ name: f.nname.trim(), website: f.nweb.trim(), town: f.ntown.trim(), path: "business", engagement: "teams" }));
      await addDoc(collection(cref(id), "log"), { at: serverTimestamp(), kind: "Note", text: "Added as a prospect from the assessment launcher." });
    } else {
      const c = client(id);
      if (c && !reportEnabled(c, pickType)) return toast("That report is off for this client");
    }
    if (!RTYPE[pickType]) return toast("Pick a report first");
    await addDoc(collection(cref(id), "reports"), { type: pickType, status: "requested", date: todayISO(), created: serverTimestamp(), updated: serverTimestamp() });
    await logEntry(id, `${T.name} queued`, "Note");
    toast(`${T.name} queued for ${client(id)?.name || f.nname}`);
  };
}
function howTo(type, c) {
  const nm = c ? c.name : "the business";
  if (type === "presence-full") return `<b>How it runs today:</b> queueing logs it on the client. Then, in Claude Code, run <code>/clockworks-assessment ${esc(nm)}</code> <button class="btn sm" data-copy="/clockworks-assessment ${esc(nm)}">${ic("copy")}Copy</button><br>The one-click runner (GitHub Actions) is step 4 on the build list.`;
  if (type === "presence-free") return `<b>How it runs today:</b> queueing logs the request on the client so nothing slips. The 60-second automated free scan is the next thing being built (step 3), and it will fill this in by itself.`;
  return `<b>Coming soon:</b> Agent Team assessments arrive in steps 5 and 6. Queueing now records the interest on the client, so you'll know who to run first.`;
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
          <input class="input" id="qt" value="${esc(q.title)}" placeholder="What's this for? e.g. AI Time & Lead Audit + 3-month pilot"></div>
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
