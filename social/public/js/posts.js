// posts.js — post CRUD, live list, countdown timers, stats
import { db } from "./firebase-init.js";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const postsCol = collection(db, "posts");

// ── Time helpers ──────────────────────────────────────────────────────────────
function fmt12h(ts) {
  if (!ts) return "—";
  const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  });
}

function secondsUntil(ts) {
  if (!ts) return null;
  const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
  return Math.floor((d - Date.now()) / 1000);
}

function fmtCountdown(secs) {
  if (secs <= 0) return "due now";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 48) return `${Math.floor(h/24)}d ${h%24}h`;
  if (h > 0)  return `${h}h ${m}m`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Live countdown registry ───────────────────────────────────────────────────
// Map of docId → { el, ts } — updated every second
const cdRegistry = new Map();
setInterval(() => {
  cdRegistry.forEach(({ el, ts }) => {
    if (!el.isConnected) return;
    const secs = secondsUntil(ts);
    if (secs === null) return;
    el.textContent = fmtCountdown(secs);
    el.style.color = secs < 120 ? "var(--yellow)" : "var(--muted)";
  });
}, 1000);

// ── Badge helpers ─────────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    sending: `<span class="badge sending"><span class="spin">🚀</span> sending</span>`,
    sent:    `<span class="badge sent">✅ sent</span>`,
    failed:  `<span class="badge failed">✕ failed</span>`,
    pending: `<span class="badge pending">⏳ pending</span>`,
  };
  return map[status] || `<span class="badge pending">${status}</span>`;
}

// ── Add post ──────────────────────────────────────────────────────────────────
export async function addPost(data) {
  // data: { platform, text, scheduledDate, scheduledTime, thread?, link? }
  // Build a UTC Date from CT input (browser interprets datetime-local as local,
  // but we want CT explicitly)
  const ctDateStr = `${data.scheduledDate}T${data.scheduledTime}:00`;
  // Parse as CT by formatting through Intl
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }).formatToParts(new Date(ctDateStr));
  // The user typed in CT — convert to UTC Timestamp
  const ctDate = new Date(ctDateStr);
  // Get the UTC offset for CT at that moment
  const utcDate = new Date(
    new Date(ctDateStr).toLocaleString("en-US", { timeZone: "America/Chicago" })
  );
  const offset = ctDate - utcDate;
  const scheduledUtc = new Date(ctDate.getTime() + offset);

  const post = {
    platform:     data.platform,
    text:         data.text,
    scheduled_at: Timestamp.fromDate(scheduledUtc),
    status:       "pending",
    created_at:   serverTimestamp(),
  };
  if (data.link)   post.link   = data.link;
  if (data.thread && data.thread.length > 0) post.thread = [data.text, ...data.thread];

  return addDoc(postsCol, post);
}

export async function deletePost(id) {
  return deleteDoc(doc(db, "posts", id));
}

// ── Render a single table row ─────────────────────────────────────────────────
function buildRow(id, post) {
  const secs        = secondsUntil(post.scheduled_at);
  const cdId        = `cd-${id}`;
  const showCd      = post.status === "pending" && secs !== null && secs > 0;
  const threadTag   = post.thread ? `<span class="tag tag-thread">THREAD</span>` : "";
  const linkTag     = post.link   ? `<span class="tag tag-link">LINK</span>` : "";
  const errorTip    = post.error  ? ` title="${post.error}"` : "";
  const cdHtml      = showCd
    ? `<span id="${cdId}" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)">${fmtCountdown(secs)}</span>`
    : "";

  if (showCd) {
    // Register after DOM insertion
    requestAnimationFrame(() => {
      const el = document.getElementById(cdId);
      if (el) cdRegistry.set(id, { el, ts: post.scheduled_at });
    });
  }

  return `
    <tr${errorTip}>
      <td>${statusBadge(post.status)}</td>
      <td><span class="badge ${post.platform}">${post.platform === "facebook" ? `<img src="facebook-logo.png" style="width:11px;height:11px;object-fit:contain;vertical-align:middle;margin-right:4px"> FB` : `<img src="x-logo.png" style="width:11px;height:11px;object-fit:contain;vertical-align:middle;margin-right:4px;filter:invert(1)"> X`}</span></td>
      <td><div class="preview">${escHtml(post.text || "")}${threadTag}${linkTag}</div></td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:12px;white-space:nowrap">${fmt12h(post.scheduled_at)}</td>
      <td>${cdHtml}</td>
      <td>
        <div class="actions">
          <button class="btn btn-danger btn-sm" onclick="window.__deletePost('${id}')">Delete</button>
        </div>
      </td>
    </tr>`;
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Render post table into a container ───────────────────────────────────────
function renderTable(containerId, posts, filterPlatform) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const filtered = filterPlatform ? posts.filter(p => p.platform === filterPlatform) : posts;
  if (!filtered.length) {
    el.innerHTML = `<div class="no-posts">No posts scheduled yet.</div>`;
    return;
  }

  el.innerHTML = `
    <div class="card">
      <div class="card-title">Scheduled Posts</div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Status</th><th>Platform</th><th>Content</th>
            <th>Scheduled (CT)</th><th>Countdown</th><th></th>
          </tr></thead>
          <tbody>${filtered.map(({ id, ...p }) => buildRow(id, p)).join("")}</tbody>
        </table>
      </div>
    </div>`;
}

// ── Render upcoming queue ─────────────────────────────────────────────────────
function renderQueue(containerId, posts) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const pending = posts
    .filter(p => p.status === "pending")
    .slice(0, 10);

  if (!pending.length) {
    el.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">// Upcoming Queue</div>
        <div class="no-posts">No posts scheduled.</div>
      </div>`;
    return;
  }

  const rows = pending.map(({ id, ...p }) => {
    const cdId  = `qcd-${id}`;
    const secs  = secondsUntil(p.scheduled_at);
    const cdTxt = secs !== null && secs > 0 ? fmtCountdown(secs) : "due now";
    const isFb  = p.platform === "facebook";

    requestAnimationFrame(() => {
      const cdEl = document.getElementById(cdId);
      if (cdEl && secs !== null && secs > 0) cdRegistry.set(`q-${id}`, { el: cdEl, ts: p.scheduled_at });
    });

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:9px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:12px">
        <span class="badge ${p.platform}" style="white-space:nowrap;flex-shrink:0">
          ${isFb
            ? `<img src="facebook-logo.png" style="width:10px;height:10px;object-fit:contain;vertical-align:middle;margin-right:3px"> FB`
            : `<img src="x-logo.png" style="width:10px;height:10px;object-fit:contain;vertical-align:middle;margin-right:6px;filter:invert(1)"> X`}
        </span>
        <div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">${escHtml(p.text || "")}</div>
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);white-space:nowrap;flex-shrink:0">${fmt12h(p.scheduled_at)}</span>
        <span id="${cdId}" style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--yellow);white-space:nowrap;flex-shrink:0;min-width:48px;text-align:right">${cdTxt}</span>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">// Upcoming Queue</div>
      <div style="display:flex;flex-direction:column;gap:8px">${rows}</div>
    </div>`;
}

// ── Render schedule form ──────────────────────────────────────────────────────
function renderForm(containerId, platform) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const isFb   = platform === "facebook";
  const formId = `form-${platform}`;

  el.innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <div class="card-title">${isFb ? `<img src="facebook-logo.png" style="width:13px;height:13px;object-fit:contain;vertical-align:middle;margin-right:6px"> New Facebook Post` : `<img src="x-logo.png" style="width:13px;height:13px;object-fit:contain;vertical-align:middle;margin-right:6px;filter:invert(1)"> New X Post / Thread`}</div>
      <div class="form-grid" id="${formId}">
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="${platform}-date">
        </div>
        <div class="form-group">
          <label>Time (Central Time)</label>
          <input type="time" id="${platform}-time">
        </div>
        <div class="form-group full">
          <label>${isFb ? "Post Text" : "First Tweet"}</label>
          <textarea id="${platform}-text" rows="4" placeholder="${isFb ? "Write your Facebook post…" : "Write your first tweet…"}"></textarea>
        </div>
        ${isFb ? `
        <div class="form-group full">
          <label>First Comment Link <span style="color:var(--dim);font-size:9px">(optional)</span></label>
          <input type="url" id="facebook-link" placeholder="https://mnclockworks.com/blog/...">
          <div class="hint">Added as the first comment — keeps the post clean while preserving the link.</div>
        </div>` : `
        <div class="form-group full">
          <label>Thread Tweets <span style="color:var(--dim);font-size:9px">(optional — one per line)</span></label>
          <textarea id="x-thread" rows="5" placeholder="Tweet 2&#10;Tweet 3&#10;Tweet 4&#10;&#10;Leave blank for a single tweet."></textarea>
          <div class="hint">First tweet goes in the field above. Add continuation tweets here, one per line.</div>
        </div>`}
        <div class="form-group full" style="flex-direction:row;align-items:center;gap:12px">
          <button class="btn btn-primary" id="submit-${platform}">+ Schedule Post</button>
          <div id="${formId}-msg"></div>
        </div>
      </div>
    </div>`;

  document.getElementById(`submit-${platform}`).addEventListener("click", async () => {
    const date  = document.getElementById(`${platform}-date`).value;
    const time  = document.getElementById(`${platform}-time`).value;
    const text  = document.getElementById(`${platform}-text`).value.trim();
    const msgEl = document.getElementById(`${formId}-msg`);

    if (!date || !time || !text) {
      msgEl.innerHTML = `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--red)">Date, time, and text are required.</span>`;
      return;
    }

    const data = { platform, text, scheduledDate: date, scheduledTime: time };

    if (isFb) {
      const link = document.getElementById("facebook-link").value.trim();
      if (link) data.link = link;
    } else {
      const threadRaw = document.getElementById("x-thread").value.trim();
      if (threadRaw) {
        data.thread = threadRaw.split("\n").map(s => s.trim()).filter(Boolean);
      }
    }

    const btn = document.getElementById(`submit-${platform}`);
    btn.disabled = true;
    btn.textContent = "Scheduling…";

    try {
      await addPost(data);
      msgEl.innerHTML = `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--green)">✅ Post scheduled!</span>`;
      document.getElementById(`${platform}-text`).value = "";
      if (isFb) document.getElementById("facebook-link").value = "";
      else      document.getElementById("x-thread").value = "";
      setTimeout(() => { msgEl.innerHTML = ""; }, 3000);
    } catch (e) {
      msgEl.innerHTML = `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--red)">Error: ${escHtml(e.message)}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "+ Schedule Post";
    }
  });
}

// ── Update stat counters ──────────────────────────────────────────────────────
function updateStats(posts) {
  const set = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.textContent = posts.filter(fn).length;
  };
  set("stat-fb",   p => p.platform === "facebook");
  set("stat-x",    p => p.platform === "x");
  set("stat-sent", p => p.status   === "sent");
  set("stat-pend", p => p.status   === "pending");
  set("stat-fail", p => p.status   === "failed");
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initPosts() {
  // Global delete handler (called from table row buttons)
  window.__deletePost = async (id) => {
    if (!confirm("Delete this scheduled post?")) return;
    await deletePost(id).catch(e => alert("Delete failed: " + e.message));
  };

  // Render forms once
  renderForm("fb-form-container", "facebook");
  renderForm("x-form-container",  "x");

  // Live Firestore subscription
  const q = query(postsCol, orderBy("scheduled_at", "asc"));
  onSnapshot(q, (snap) => {
    cdRegistry.clear();
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats(posts);
    renderQueue("dashboard-queue-container", posts);
    renderTable("fb-list-container",         posts, "facebook");
    renderTable("x-list-container",          posts, "x");
  }, err => console.warn("posts listener error:", err));
}
