// Clockworks Portal · CRM (SPEC §2). Admin-only; every read/write is enforced by firestore.rules.
// On localhost it talks to the Firebase emulators unless the URL has ?prod.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, connectAuthEmulator, signInWithCredential } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator, terminate, clearIndexedDbPersistence,
  collection, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, limit, serverTimestamp, Timestamp, writeBatch, getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const EMU = LOCAL && !new URLSearchParams(location.search).has("prod");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = EMU ? initializeFirestore(app, {}) : initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
if (EMU) { connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); connectFirestoreEmulator(db, "127.0.0.1", 8080); }

export const STAGES = ["Lead", "Free scan sent", "Meeting", "Full assessment", "Proposal", "Pilot", "Active", "Paused", "Closed"];
const REPORT_TYPES = [["presence-free", "Presence · Free"], ["presence-full", "Presence · Full"], ["agent-free", "Agent Team · Free"], ["agent-full", "Agent Team · Full"]];
const KINDS = ["Note", "Call", "Decision", "Check-in"];
const CHANNELS = ["Text", "Call", "Email", "In person"];

// ------------------------------------------------------------------ helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const view = $("#view");
let toastT;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2400); }
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const daysUntil = (iso) => Math.round((new Date(iso + "T12:00:00") - new Date(todayISO() + "T12:00:00")) / 86400000);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
const fmtDay = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); return `${MON[m - 1]} ${d}${y !== new Date().getFullYear() ? ", " + y : ""}`; };
const toDate = (ts) => (ts instanceof Timestamp ? ts.toDate() : ts ? new Date(ts) : null);
function ago(ts) {
  const d = toDate(ts); if (!d) return "never";
  const s = (Date.now() - d) / 1000;
  if (s < 90) return "just now"; if (s < 3600) return `${Math.round(s / 60)}m ago`; if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const days = Math.round(s / 86400); return days < 45 ? `${days}d ago` : `${Math.round(days / 30)}mo ago`;
}
const whenShort = (ts) => { const d = toDate(ts); if (!d) return "…"; return `${MON[d.getMonth()]} ${d.getDate()}${d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : ""}<br>${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`; };
function dueInfo(next) {
  if (!next || !next.what) return { cls: "", label: "No next step", over: false };
  if (!next.due) return { cls: "", label: "no date", over: false };
  const n = daysUntil(next.due);
  if (n < 0) return { cls: "over", label: `Overdue · ${fmtDay(next.due)}`, over: true };
  if (n === 0) return { cls: "soon", label: "Today", over: false };
  if (n <= 3) return { cls: "soon", label: `${n === 1 ? "Tomorrow" : "in " + n + " days"} · ${fmtDay(next.due)}`, over: false };
  return { cls: "", label: fmtDay(next.due), over: false };
}
function noticeInfo(v) {
  if (!v.end) return { cls: "warn", label: "End date unknown" };
  const noticeBy = new Date(v.end + "T12:00:00"); noticeBy.setDate(noticeBy.getDate() - (Number(v.notice_days) || 0));
  const iso = noticeBy.toISOString().slice(0, 10), n = daysUntil(iso), e = daysUntil(v.end);
  if (e < 0) return { cls: "ok", label: `Ended ${fmtDay(v.end)}` };
  if (n < 0) return { cls: "", label: `Notice window passed ${fmtDay(iso)}` };
  if (n <= 45) return { cls: "", label: `Give notice by ${fmtDay(iso)} (${n}d)` };
  return { cls: "ok", label: `Notice by ${fmtDay(iso)} · ends ${fmtDay(v.end)}` };
}
const icon = { search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' };

// ------------------------------------------------------------------ auth
let me = null, isAdmin = false, unsub = [];
const stop = () => { unsub.forEach((f) => f()); unsub = []; };
function renderGate(kind) {
  $("#who").innerHTML = "";
  if (kind === "denied") {
    view.innerHTML = `<div class="gate"><div class="card"><div class="kicker">Admin only</div><h1>Not <em>on the list.</em></h1>
      <p>${esc(me.email)} is signed in, but this account doesn't have portal access.</p><button class="btn" id="out">Sign out</button></div></div>`;
    $("#out").onclick = doSignOut; return;
  }
  view.innerHTML = `<div class="gate"><div class="card"><div class="kicker">MN Clockworks</div><h1>The <em>Portal.</em></h1>
    <p>Clients, reports and next steps. Admin sign-in only.</p>
    <button class="btn primary" id="signin" style="width:100%">Sign in with Google</button>
    ${EMU ? `<p class="small muted" style="margin-top:14px">Emulator mode: <button class="btn link" id="devin">sign in as a test admin</button></p>` : ""}</div></div>`;
  $("#signin").onclick = async () => {
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    try { await signInWithPopup(auth, p); } catch (e) { if (/popup/.test(e.code || "")) return signInWithRedirect(auth, p); toast("Sign-in failed: " + (e.code || e.message)); }
  };
  if (EMU) $("#devin").onclick = () => signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: "test-admin", email: "parks.phone@gmail.com", email_verified: true })));
}
async function doSignOut() {
  stop(); await signOut(auth);
  if (!EMU) { try { await terminate(db); await clearIndexedDbPersistence(db); } catch (e) {} location.reload(); }
}
window.__portalDevSignIn = EMU ? (email = "parks.phone@gmail.com") => signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: "test-" + email.replace(/\W/g, "-"), email, email_verified: true }))) : undefined;

onAuthStateChanged(auth, async (u) => {
  stop(); me = u;
  if (!u) { isAdmin = false; return renderGate("in"); }
  const tok = await u.getIdTokenResult(true);
  // The rules decide who's an admin (claim or the allowlist kept in firestore.rules), so just try a read.
  isAdmin = tok.claims.admin === true || (await getDocs(query(collection(db, "clients"), limit(1))).then(() => true, () => false));
  if (!isAdmin) return renderGate("denied");
  $("#who").innerHTML = `<span class="small">${esc(u.email.split("@")[0])}</span><button class="btn sm ghost" id="out">Sign out</button>`;
  $("#out").onclick = doSignOut;
  route();
});

// ------------------------------------------------------------------ router
window.addEventListener("hashchange", () => isAdmin && route());
function route() {
  stop();
  const h = location.hash.replace(/^#\/?/, "");
  window.scrollTo(0, 0);
  if (h.startsWith("c/")) return renderClient(decodeURIComponent(h.slice(2)));
  if (h === "new") return renderNew();
  return renderList();
}

// ------------------------------------------------------------------ list
let listFilter = "All", listSearch = "";
function renderList() {
  view.innerHTML = `<div class="kicker">Clients</div><h1>Who's <em>next.</em></h1>
    <div class="search">${icon.search}<input class="i" id="q" type="search" placeholder="Search by name" autocomplete="off" value="${esc(listSearch)}" aria-label="Search clients"></div>
    <div class="chips" id="stages" role="group" aria-label="Filter by stage"></div>
    <div class="clients" id="list"><div class="empty">Loading…</div></div>
    <a class="btn primary fab" href="#/new">+ New client</a>`;
  let rows = [];
  const paint = () => {
    const counts = Object.fromEntries(STAGES.map((s) => [s, rows.filter((c) => c.stage === s).length]));
    $("#stages").innerHTML = ["All", ...STAGES].filter((s) => s === "All" || counts[s] || s === listFilter)
      .map((s) => `<button class="chip" data-s="${esc(s)}" aria-pressed="${s === listFilter}">${esc(s)}<span class="n">${s === "All" ? rows.length : counts[s]}</span></button>`).join("");
    const q = listSearch.trim().toLowerCase();
    const shown = rows.filter((c) => (listFilter === "All" || c.stage === listFilter) && (!q || (c.name || "").toLowerCase().includes(q) || (c.trade || "").toLowerCase().includes(q)))
      .sort((a, b) => {
        const da = dueInfo(a.next), dbb = dueInfo(b.next);
        if (da.over !== dbb.over) return da.over ? -1 : 1;
        const ka = a.next?.due || "9999", kb = b.next?.due || "9999";
        return ka.localeCompare(kb) || (toDate(b.lastTouch) || 0) - (toDate(a.lastTouch) || 0);
      });
    $("#list").innerHTML = shown.length ? shown.map((c) => {
      const d = dueInfo(c.next), sc = c.scores || {};
      return `<a class="client ${d.over ? "overdue" : ""}" href="#/c/${encodeURIComponent(c.id)}">
        <div class="spread"><span class="nm">${esc(c.name)}</span><span class="stage s-${esc(c.stage.split(" ")[0])}">${esc(c.stage)}</span></div>
        <div class="sub">${esc([c.trade, c.town].filter(Boolean).join(" · "))}</div>
        <div class="next"><span aria-hidden="true">→</span><span>${esc(c.next?.what || "No next step set")}</span> <span class="due ${d.cls}">${c.next?.what ? esc(d.label) : ""}</span></div>
        <div class="meta"><span>Touched ${esc(ago(c.lastTouch))}</span><span>Presence ${sc.presence?.score ?? "–"}</span><span>Agent ${sc.agent?.score ?? "–"}</span></div></a>`;
    }).join("") : `<div class="empty">${rows.length ? "No clients match." : "No clients yet. Add the first one."}</div>`;
  };
  unsub.push(onSnapshot(collection(db, "clients"), (snap) => { rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })); paint(); }, (e) => toast("Couldn't load: " + e.code)));
  $("#q").addEventListener("input", (e) => { listSearch = e.target.value; paint(); });
  $("#stages").addEventListener("click", (e) => { const b = e.target.closest("[data-s]"); if (b) { listFilter = b.dataset.s; paint(); } });
}

// ------------------------------------------------------------------ new
function slugify(s) { return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "client"; }
function renderNew() {
  view.innerHTML = `<a class="back" href="#/">← Clients</a><div class="kicker">New client</div><h1>Add a <em>client.</em></h1>
    <form class="card" id="f">
      <div class="formrow"><label class="f">Business name<input class="i" name="name" required autocomplete="off"></label></div>
      <div class="grid2"><label class="f">Trade<input class="i" name="trade" placeholder="Plumbing"></label><label class="f">HQ town<input class="i" name="town" placeholder="Rogers, MN"></label></div>
      <div class="grid2" style="margin-top:10px"><label class="f">Website<input class="i" name="website" placeholder="example.com" inputmode="url" autocapitalize="off"></label>
        <label class="f">Stage<select class="i" name="stage">${STAGES.map((s) => `<option>${s}</option>`).join("")}</select></label></div>
      <div class="row" style="margin-top:14px"><button class="btn primary">Create</button><a class="btn ghost" href="#/">Cancel</a></div>
    </form>`;
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    let id = slugify(f.name);
    const existing = (await getDocs(collection(db, "clients"))).docs.map((d) => d.id);
    while (existing.includes(id)) id += "-2";
    await setDoc(doc(db, "clients", id), { name: f.name.trim(), trade: f.trade.trim(), town: f.town.trim(), website: f.website.trim(), stage: f.stage,
      contacts: [], vendors: [], towns: [], brand: {}, next: { what: "", due: "" }, created: serverTimestamp(), updated: serverTimestamp(), lastTouch: serverTimestamp() });
    await addDoc(collection(db, "clients", id, "log"), { at: serverTimestamp(), kind: "Note", text: `Added to the portal (stage: ${f.stage}).` });
    location.hash = "#/c/" + id;
  };
  $("[name=name]").focus();
}

// ------------------------------------------------------------------ profile
let C = null, LOG = [], REPORTS = [], editing = null;
function renderClient(id) {
  C = null; LOG = []; REPORTS = []; editing = null;
  view.innerHTML = `<a class="back" href="#/">← Clients</a><div class="empty">Loading…</div>`;
  const ref = doc(db, "clients", id);
  unsub.push(onSnapshot(ref, (d) => { if (!d.exists()) { view.innerHTML = `<a class="back" href="#/">← Clients</a><div class="empty">Client not found.</div>`; return; } C = { id: d.id, ...d.data() }; paintClient(); }, (e) => toast("Couldn't load: " + e.code)));
  unsub.push(onSnapshot(query(collection(ref, "log"), orderBy("at", "desc"), limit(200)), (s) => { LOG = s.docs.map((d) => ({ id: d.id, ...d.data() })); paintLog(); }));
  unsub.push(onSnapshot(collection(ref, "reports"), (s) => { REPORTS = s.docs.map((d) => ({ id: d.id, ...d.data() })); paintReports(); }));
}
const cref = () => doc(db, "clients", C.id);
const save = (patch) => updateDoc(cref(), { ...patch, updated: serverTimestamp() }).catch((e) => toast("Save failed: " + e.code));
const logEntry = (text, kind = "Note") => Promise.all([addDoc(collection(cref(), "log"), { at: serverTimestamp(), kind, text }), updateDoc(cref(), { lastTouch: serverTimestamp() })]);

function paintClient() {
  if (!C) return;
  const keepLog = $("#logText")?.value || "", keepKind = $("#kinds [aria-pressed=true]")?.dataset.k || "Note";
  if (editing && $("#view form[data-edit]")) { paintHeadOnly(); return; } // don't clobber an open form
  const d = dueInfo(C.next), si = STAGES.indexOf(C.stage);
  const site = C.website ? (C.website.startsWith("http") ? C.website : "https://" + C.website) : "";
  view.innerHTML = `<a class="back" href="#/">← Clients</a>
    <section class="head" id="head">${headHtml()}</section>
    <div class="pipeline" role="group" aria-label="Stage">${STAGES.map((s, i) => `<button data-stage="${esc(s)}" class="${i < si ? "past" : ""}" aria-pressed="${s === C.stage}">${esc(s)}</button>`).join("")}</div>

    <section class="card nextcard ${d.over ? "over" : ""}" id="next" style="margin-top:14px">${nextHtml()}</section>

    <section class="card"><h2>Log</h2>
      <textarea class="i" id="logText" placeholder="Call notes, decisions, check-ins…" aria-label="New log entry">${esc(keepLog)}</textarea>
      <div class="spread" style="margin-top:8px"><div class="kinds" id="kinds" role="group" aria-label="Entry type">${KINDS.map((k) => `<button class="chip" data-k="${k}" aria-pressed="${k === keepKind}">${k}</button>`).join("")}</div>
        <button class="btn primary sm" id="addLog">Add</button></div>
      <ul class="log" id="log"></ul></section>

    <section class="card"><h2>Reports</h2><div class="items" id="reports"></div></section>
    <section class="card" id="contacts"></section>
    <section class="card" id="vendors"></section>
    <section class="card" id="basics"></section>
    <section class="card" id="brand"></section>
    <div class="row" style="justify-content:center;margin-top:24px"><button class="btn danger sm" id="del">Delete client</button></div>`;
  wireClient(); paintLog(); paintReports(); paintContacts(); paintVendors(); paintBasics(); paintBrand();
  if (site) $("#site")?.setAttribute("href", site);
}
function headHtml() {
  const site = C.website ? (C.website.startsWith("http") ? C.website : "https://" + C.website) : "";
  return `<div class="kicker">${esc(C.trade || "Client")}${C.town ? " · " + esc(C.town) : ""}</div><h1>${esc(C.name)}</h1>
    <div class="facts">${site ? `<a id="site" href="${esc(site)}" target="_blank" rel="noopener">${esc(C.website.replace(/^https?:\/\//, ""))} ↗</a>` : ""}
    ${C.phone ? `<a href="tel:${esc(C.phone.replace(/[^\d+]/g, ""))}">${esc(C.phone)}</a>` : ""}<span class="muted">Touched ${esc(ago(C.lastTouch))}</span></div>`;
}
function paintHeadOnly() { const h = $("#head"); if (h) h.innerHTML = headHtml(); }
function nextHtml() {
  const d = dueInfo(C.next);
  if (editing === "next") return `<form data-edit="next"><div class="spread"><span class="kicker">Next step</span></div>
    <div class="formrow"><label class="f">What<input class="i" name="what" value="${esc(C.next?.what)}" placeholder="Send the Thryv checklist"></label>
    <label class="f">By<input class="i" type="date" name="due" value="${esc(C.next?.due)}"></label></div>
    <div class="row"><button class="btn primary sm">Save</button><button type="button" class="btn ghost sm" data-cancel>Cancel</button></div></form>`;
  return `<div class="spread"><span class="kicker">Next step</span>${d.over ? `<span class="flag">Overdue</span>` : ""}</div>
    <div class="what" style="margin:6px 0 4px">${esc(C.next?.what || "Nothing set")}</div>
    <div class="due ${d.cls}">${C.next?.what ? esc(d.label) : ""}</div>
    <div class="row" style="margin-top:10px"><button class="btn sm" data-edit-btn="next">${C.next?.what ? "Change" : "Set next step"}</button>${C.next?.what ? `<button class="btn sm" id="done">✓ Done</button>` : ""}</div>`;
}
function wireClient() {
  $(".pipeline").onclick = async (e) => {
    const b = e.target.closest("[data-stage]"); if (!b || b.dataset.stage === C.stage) return;
    const from = C.stage; await save({ stage: b.dataset.stage }); await logEntry(`Stage: ${from} → ${b.dataset.stage}`, "Decision"); toast("Stage → " + b.dataset.stage);
  };
  $("#kinds").onclick = (e) => { const b = e.target.closest("[data-k]"); if (b) $$("#kinds .chip").forEach((x) => x.setAttribute("aria-pressed", x === b)); };
  $("#addLog").onclick = async () => {
    const t = $("#logText").value.trim(); if (!t) return $("#logText").focus();
    const k = $("#kinds [aria-pressed=true]")?.dataset.k || "Note";
    $("#logText").value = ""; await logEntry(t, k); toast("Logged");
  };
  $("#del").onclick = async (e) => {
    const b = e.currentTarget;
    if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Tap again to delete everything for this client"; setTimeout(() => { b.dataset.armed = ""; b.textContent = "Delete client"; }, 4000); return; }
    const batch = writeBatch(db);
    LOG.forEach((l) => batch.delete(doc(cref(), "log", l.id))); REPORTS.forEach((r) => batch.delete(doc(cref(), "reports", r.id))); batch.delete(cref());
    stop(); await batch.commit(); toast("Deleted"); location.hash = "#/";
  };
  view.onclick = async (e) => {
    const eb = e.target.closest("[data-edit-btn]"); if (eb) { editing = eb.dataset.editBtn; repaintSection(editing); return; }
    if (e.target.closest("[data-cancel]")) { const was = editing; editing = null; repaintSection(was); return; }
    if (e.target.closest("#done")) { const w = C.next.what; await save({ next: { what: "", due: "" } }); await logEntry("Done: " + w, "Note"); toast("Nice. What's next?"); editing = "next"; repaintSection("next"); return; }
    const rm = e.target.closest("[data-rm]"); if (rm) { const [field, i] = rm.dataset.rm.split(":"); const arr = (C[field] || []).slice(); if (rm.dataset.armed !== "1") { rm.dataset.armed = "1"; rm.textContent = "Sure?"; return; } arr.splice(+i, 1); await save({ [field]: arr }); return; }
    const ed = e.target.closest("[data-edit-item]"); if (ed) { editing = ed.dataset.editItem; repaintSection(editing.split(":")[0]); return; }
  };
  view.onsubmit = async (e) => {
    const f = e.target.closest("form[data-edit]"); if (!f) return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f)), key = f.dataset.edit, [sec, idx] = key.split(":");
    if (sec === "next") { await save({ next: { what: data.what.trim(), due: data.due } }); if (data.what.trim()) await logEntry(`Next step: ${data.what.trim()}${data.due ? " (by " + fmtDay(data.due) + ")" : ""}`, "Note"); }
    else if (sec === "contacts" || sec === "vendors") { const arr = (C[sec] || []).slice(); const item = sec === "vendors" ? { ...data, notice_days: Number(data.notice_days) || 0 } : data; if (idx === "new") arr.push(item); else arr[+idx] = item; await save({ [sec]: arr }); }
    else if (sec === "basics") await save({ name: data.name.trim(), trade: data.trade.trim(), town: data.town.trim(), website: data.website.trim(), phone: data.phone.trim(), hq: data.hq.trim(), towns: data.towns.split(",").map((s) => s.trim()).filter(Boolean) });
    else if (sec === "brand") await save({ brand: { logo: data.logo.trim(), color1: data.color1, color2: data.color2, mascot: data.mascot.trim() } });
    else if (sec === "report") await saveReport(idx, data);
    editing = null; paintClient(); toast("Saved");
  };
}
function repaintSection(sec) {
  if (sec === "next") $("#next").innerHTML = nextHtml();
  else if (sec === "contacts") paintContacts(); else if (sec === "vendors") paintVendors();
  else if (sec === "basics") paintBasics(); else if (sec === "brand") paintBrand(); else if (sec === "report") paintReports();
  const inp = $("form[data-edit] input, form[data-edit] select"); if (inp) inp.focus();
}
function paintLog() {
  const el = $("#log"); if (!el) return;
  el.innerHTML = LOG.length ? LOG.map((l) => `<li><span class="when">${whenShort(l.at)}</span><span><span class="k">${esc(l.kind || "Note")}</span><span class="txt">${esc(l.text)}</span></span><span></span></li>`).join("") : `<li><span></span><span class="muted">Nothing logged yet.</span><span></span></li>`;
}

// reports: the four types, in a fixed order, newest of each (older ones listed under it)
function paintReports() {
  const el = $("#reports"); if (!el || !C) return;
  el.innerHTML = REPORT_TYPES.map(([type, label]) => {
    const all = REPORTS.filter((r) => r.type === type).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (editing === "report:" + type || (editing || "").startsWith("report:" + type + ":")) return reportForm(type, label, editing.split(":")[2] ? all.find((r) => r.id === editing.split(":")[2]) : null);
    if (!all.length) return `<div class="rep none"><div><div class="t">${label}</div><div class="small muted">Not yet</div></div><button class="btn sm" data-edit-item="report:${type}">+ Add</button></div>`;
    const r = all[0];
    return `<div class="rep"><div><div class="t">${label} <span class="pill ${esc(r.status)}">${esc(r.status)}</span></div>
      <div class="small muted">${esc(fmtDay(r.date))}${r.cost ? " · $" + esc(r.cost) : ""}${r.pin ? " · PIN " + esc(r.pin) : ""}</div>
      <div class="row" style="margin-top:6px">${r.link ? `<a class="btn sm" href="${esc(r.link)}" target="_blank" rel="noopener">Open ↗</a>` : ""}<button class="btn sm ghost" data-edit-item="report:${type}:${r.id}">Edit</button><button class="btn sm ghost" data-edit-item="report:${type}">+ New</button></div>
      ${all.length > 1 ? `<div class="small muted" style="margin-top:6px">Earlier: ${all.slice(1).map((o) => esc(fmtDay(o.date)) + (o.score != null ? " (" + o.score + ")" : "")).join(" · ")}</div>` : ""}</div>
      <div class="score">${r.score ?? "–"}</div></div>`;
  }).join("");
}
function reportForm(type, label, r) {
  r = r || { date: todayISO(), status: "draft" };
  return `<form class="item" data-edit="report:${type}${r.id ? ":" + r.id : ""}"><div class="t">${label}${r.id ? "" : " · new"}</div>
    <div class="grid2"><label class="f">Date<input class="i" type="date" name="date" value="${esc(r.date)}" required></label>
    <label class="f">Status<select class="i" name="status"><option ${r.status === "draft" ? "selected" : ""}>draft</option><option ${r.status === "published" ? "selected" : ""}>published</option></select></label></div>
    <label class="f">Share link<input class="i" name="link" value="${esc(r.link)}" inputmode="url" autocapitalize="off" placeholder="https://mnclockworks.com/…"></label>
    <div class="grid2"><label class="f">PIN<input class="i" name="pin" value="${esc(r.pin)}" inputmode="numeric"></label><label class="f">Score (0–100)<input class="i" name="score" value="${esc(r.score)}" inputmode="numeric"></label></div>
    <label class="f">Cost (USD)<input class="i" name="cost" value="${esc(r.cost)}" inputmode="decimal"></label>
    <div class="row"><button class="btn primary sm">Save</button><button type="button" class="btn ghost sm" data-cancel>Cancel</button>${r.id ? `<button type="button" class="btn danger sm" data-rm-report="${r.id}">Delete</button>` : ""}</div></form>`;
}
async function saveReport(key, data) {
  // key = "<type>" (new) or "<type>" with id in the form's data-edit (handled by caller split)
  const [type, id] = [key, (view.querySelector("form[data-edit^='report:']")?.dataset.edit || "").split(":")[2]];
  const rec = { type, date: data.date, status: data.status, link: data.link.trim(), pin: data.pin.trim(), cost: data.cost.trim(), score: data.score.trim() === "" ? null : Math.max(0, Math.min(100, Number(data.score))), updated: serverTimestamp() };
  if (id) await updateDoc(doc(cref(), "reports", id), rec); else { await addDoc(collection(cref(), "reports"), { ...rec, created: serverTimestamp() }); await logEntry(`Report added: ${REPORT_TYPES.find((t) => t[0] === type)[1]} (${rec.status})`, "Note"); }
  // Latest score per family shows on the client card.
  const fam = type.startsWith("presence") ? "presence" : "agent";
  const all = REPORTS.filter((r) => r.type.startsWith(fam) && r.id !== id).concat([{ ...rec, id: id || "new" }]).filter((r) => r.score != null).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  await save({ ["scores." + fam]: all[0] ? { score: all[0].score, date: all[0].date, type: all[0].type } : null });
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-rm-report]"); if (!b) return;
  if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Sure?"; return; }
  await deleteDoc(doc(cref(), "reports", b.dataset.rmReport)); editing = null; paintReports(); toast("Report deleted");
});

// contacts + vendors: small lists on the client doc
function listSection(el, title, field, items, render, form) {
  const open = (editing || "").startsWith(field + ":");
  el.innerHTML = `<h2>${title}${open ? "" : `<button class="btn sm" data-edit-item="${field}:new">+ Add</button>`}</h2>
    <div class="items">${items.map((it, i) => editing === `${field}:${i}` ? form(it, i) : `<div class="item">${render(it)}<div class="acts"><button class="btn link" data-edit-item="${field}:${i}">Edit</button><button class="btn link" data-rm="${field}:${i}">Remove</button></div></div>`).join("")}
    ${editing === field + ":new" ? form({}, "new") : ""}${!items.length && editing !== field + ":new" ? `<div class="small muted">None yet.</div>` : ""}</div>`;
}
function paintContacts() {
  const el = $("#contacts"); if (!el) return;
  listSection(el, "Contacts", "contacts", C.contacts || [], (c) => `<div class="t">${esc(c.name)} <span class="muted small">${esc(c.role)}</span></div>
    <div class="l">${[c.phone ? `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}">${esc(c.phone)}</a>` : "", c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : "", c.channel ? "prefers " + esc(c.channel.toLowerCase()) : ""].filter(Boolean).join(" · ")}</div>`,
  (c, i) => `<form class="item" data-edit="contacts:${i}"><div class="grid2"><label class="f">Name<input class="i" name="name" value="${esc(c.name)}" required></label><label class="f">Role<input class="i" name="role" value="${esc(c.role)}"></label></div>
    <div class="grid2"><label class="f">Phone<input class="i" name="phone" value="${esc(c.phone)}" inputmode="tel"></label><label class="f">Email<input class="i" name="email" value="${esc(c.email)}" inputmode="email" autocapitalize="off"></label></div>
    <label class="f">Preferred channel<select class="i" name="channel">${["", ...CHANNELS].map((ch) => `<option ${ch === c.channel ? "selected" : ""}>${ch}</option>`).join("")}</select></label>
    <div class="row"><button class="btn primary sm">Save</button><button type="button" class="btn ghost sm" data-cancel>Cancel</button></div></form>`);
}
function paintVendors() {
  const el = $("#vendors"); if (!el) return;
  listSection(el, "Vendors &amp; contracts", "vendors", C.vendors || [], (v) => { const n = noticeInfo(v); return `<div class="t">${esc(v.name)} <span class="muted small">${esc(v.what)}</span></div>
    <div class="row"><span class="flag ${n.cls}">${esc(n.label)}</span>${v.notice_days ? `<span class="small muted">${v.notice_days}-day notice</span>` : ""}</div>${v.notes ? `<div class="l">${esc(v.notes)}</div>` : ""}`; },
  (v, i) => `<form class="item" data-edit="vendors:${i}"><div class="grid2"><label class="f">Vendor<input class="i" name="name" value="${esc(v.name)}" required></label><label class="f">What it does<input class="i" name="what" value="${esc(v.what)}"></label></div>
    <div class="grid2"><label class="f">Contract ends<input class="i" type="date" name="end" value="${esc(v.end)}"></label><label class="f">Notice window (days)<input class="i" name="notice_days" value="${esc(v.notice_days)}" inputmode="numeric"></label></div>
    <label class="f">Notes<input class="i" name="notes" value="${esc(v.notes)}"></label>
    <div class="row"><button class="btn primary sm">Save</button><button type="button" class="btn ghost sm" data-cancel>Cancel</button></div></form>`);
}
function paintBasics() {
  const el = $("#basics"); if (!el) return;
  if (editing === "basics") {
    el.innerHTML = `<h2>Basics</h2><form data-edit="basics"><div class="formrow"><label class="f">Business name<input class="i" name="name" value="${esc(C.name)}" required></label></div>
      <div class="grid2"><label class="f">Trade<input class="i" name="trade" value="${esc(C.trade)}"></label><label class="f">HQ town<input class="i" name="town" value="${esc(C.town)}"></label></div>
      <div class="formrow"><label class="f">HQ address<input class="i" name="hq" value="${esc(C.hq)}"></label>
      <label class="f">Service towns (comma-separated)<input class="i" name="towns" value="${esc((C.towns || []).join(", "))}"></label></div>
      <div class="grid2"><label class="f">Website<input class="i" name="website" value="${esc(C.website)}" autocapitalize="off"></label><label class="f">Main phone<input class="i" name="phone" value="${esc(C.phone)}" inputmode="tel"></label></div>
      <div class="row" style="margin-top:12px"><button class="btn primary sm">Save</button><button type="button" class="btn ghost sm" data-cancel>Cancel</button></div></form>`; return;
  }
  el.innerHTML = `<h2>Basics<button class="btn sm" data-edit-btn="basics">Edit</button></h2>
    <div class="small"><div><span class="muted">HQ</span> ${esc(C.hq || "–")}</div><div style="margin-top:4px"><span class="muted">Serves</span> ${esc((C.towns || []).join(", ") || "–")}</div></div>`;
}
function paintBrand() {
  const el = $("#brand"); if (!el) return;
  const b = C.brand || {};
  if (editing === "brand") {
    el.innerHTML = `<h2>Brand</h2><form data-edit="brand"><div class="formrow"><label class="f">Logo URL<input class="i" name="logo" value="${esc(b.logo)}" autocapitalize="off"></label><label class="f">Mascot URL<input class="i" name="mascot" value="${esc(b.mascot)}" autocapitalize="off"></label></div>
      <div class="row"><label class="f">Color 1<input class="i" type="color" name="color1" value="${esc(b.color1 || "#173A5E")}"></label><label class="f">Color 2<input class="i" type="color" name="color2" value="${esc(b.color2 || "#E4572E")}"></label></div>
      <div class="row" style="margin-top:12px"><button class="btn primary sm">Save</button><button type="button" class="btn ghost sm" data-cancel>Cancel</button></div></form>`; return;
  }
  el.innerHTML = `<h2>Brand<button class="btn sm" data-edit-btn="brand">Edit</button></h2>
    <div class="row small">${b.logo ? `<img src="${esc(b.logo)}" alt="" style="height:36px;border-radius:6px;background:#fff">` : `<span class="muted">No logo</span>`}
    ${b.color1 ? `<span class="swatch" style="background:${esc(b.color1)}"></span>` : ""}${b.color2 ? `<span class="swatch" style="background:${esc(b.color2)}"></span>` : ""}
    ${b.mascot ? `<img src="${esc(b.mascot)}" alt="" style="height:40px">` : ""}</div><div class="small muted" style="margin-top:6px">Used by the report kit.</div>`;
}
