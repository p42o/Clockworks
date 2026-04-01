// posts.js — post CRUD, live list, countdown timers, stats
import { db } from "./firebase-init.js";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc,
  query, orderBy, serverTimestamp, Timestamp, deleteField
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
  if (data.thread && data.thread.length > 0) post.thread = data.thread;

  return addDoc(postsCol, post);
}

export async function deletePost(id) {
  return deleteDoc(doc(db, "posts", id));
}

// ── Retry a failed post (reset to pending, schedule for now) ─────────────────
async function retryPost(id) {
  return updateDoc(doc(db, "posts", id), {
    status: "pending",
    scheduled_at: Timestamp.fromDate(new Date()),
    error: deleteField(),
    sent_at: deleteField(),
  });
}

// ── Dismiss failed posts (mark as ignored) ───────────────────────────────────
async function dismissFailed(ids) {
  const batch = ids.map(id =>
    updateDoc(doc(db, "posts", id), { status: "dismissed" })
  );
  return Promise.all(batch);
}

// ── Render a single table row ─────────────────────────────────────────────────
function buildRow(id, post) {
  const secs        = secondsUntil(post.scheduled_at);
  const cdId        = `cd-${id}`;
  const showCd      = post.status === "pending" && secs !== null && secs > 0;
  const threadTag   = post.thread ? `<span class="tag tag-thread">THREAD</span>` : "";
  const linkTag     = post.link   ? `<span class="tag tag-link">LINK</span>` : "";
  const errorTip    = post.error  ? ` title="${post.error}"` : "";
  const isFailed    = post.status === "failed";
  let cdHtml;
  if (isFailed) {
    cdHtml = `<button class="btn btn-danger btn-sm" onclick="window.__retryPost('${id}')">↻ Retry</button>`;
  } else if (showCd) {
    cdHtml = `<span id="${cdId}" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)">${fmtCountdown(secs)}</span>`;
  } else {
    cdHtml = "";
  }

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
          <button class="btn btn-cyan btn-sm" onclick="window.__editPost('${id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="window.__deletePost('${id}')">Delete</button>
        </div>
      </td>
    </tr>`;
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Render styled dashboard cards for scheduled posts ───────────────────────────
let dashboardShowAllFb = false;
let dashboardShowAllX = false;

function renderDashboardCards(containerId, posts) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const fbPostsAll = posts.filter(p => p.platform === "facebook" && p.status === "pending");
  const xPostsAll  = posts.filter(p => p.platform === "x" && p.status === "pending");

  const fbPosts = dashboardShowAllFb ? fbPostsAll : fbPostsAll.slice(0, 3);
  const xPosts  = dashboardShowAllX ? xPostsAll : xPostsAll.slice(0, 3);

  const renderFBCard = (id, p) => {
    const secs = secondsUntil(p.scheduled_at);
    const cdId = `cd-fb-${id}`;
    const showCd = secs !== null && secs > 0;
    if (showCd) {
      requestAnimationFrame(() => {
        const el = document.getElementById(cdId);
        if (el) cdRegistry.set(`dash-fb-${id}`, { el, ts: p.scheduled_at });
      });
    }
    const cdTxt = showCd ? fmtCountdown(secs) : "due now";
    return `
      <div class="dashboard-post-card" data-post-id="${id}" style="background:var(--panel);border:1px solid rgba(74,158,255,.25);border-radius:12px;padding:16px;position:relative;overflow:hidden;cursor:pointer;transition:all 0.2s" onmouseover="this.style.borderColor='rgba(74,158,255,.5)';this.style.boxShadow='0 0 16px rgba(74,158,255,.2)'" onmouseout="this.style.borderColor='rgba(74,158,255,.25)';this.style.boxShadow='none'">
        <div style="position:absolute;top:-1px;left:-1px;right:-1px;height:2px;background:var(--green);box-shadow:0 0 12px var(--green);opacity:0.6"></div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <img src="logo.svg" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--text)">Clockworks - AI & Automation</div>
            <div style="font-size:10px;color:var(--text-muted)">${fmt12h(p.scheduled_at)}</div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--yellow);white-space:nowrap;flex-shrink:0" id="${cdId}">${cdTxt}</div>
        </div>
        <div style="font-size:13px;line-height:1.6;color:var(--text);white-space:pre-wrap;word-wrap:break-word;margin-bottom:12px">${escHtml(p.text || "")}</div>
        ${p.link ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;align-items:flex-start;gap:8px">
          <div style="font-size:11px;color:var(--text-muted);flex:1">
            <div style="font-weight:600;color:var(--text);margin-bottom:4px">First Comment</div>
            <a href="${escHtml(p.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--muted);text-decoration:underline;cursor:pointer">${escHtml(p.link)}</a>
          </div>
        </div>` : ''}
        <div style="display:flex;gap:4px;font-size:9px;color:var(--text-faint);margin-top:12px">
          ${statusBadge(p.status)}
          <span class="badge ${p.platform}" style="white-space:nowrap">
            <img src="facebook-logo.png" style="width:9px;height:9px;object-fit:contain;vertical-align:middle;margin-right:2px"> FB
          </span>
        </div>
      </div>`;
  };

  const renderXCard = (id, p) => {
    const secs = secondsUntil(p.scheduled_at);
    const cdId = `cd-x-${id}`;
    const showCd = secs !== null && secs > 0;
    if (showCd) {
      requestAnimationFrame(() => {
        const el = document.getElementById(cdId);
        if (el) cdRegistry.set(`dash-x-${id}`, { el, ts: p.scheduled_at });
      });
    }
    const cdTxt = showCd ? fmtCountdown(secs) : "due now";

    // Build thread display (follow-up tweets only, labeled as Tweet 2, 3, etc.)
    let threadHtml = '';
    if (p.thread && p.thread.length > 0) {
      threadHtml = p.thread.map((tweet, idx) => `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;line-height:1.4;color:var(--text);white-space:pre-wrap;word-wrap:break-word">
          <div style="font-size:10px;color:var(--muted);margin-bottom:6px">Tweet ${idx + 2}</div>
          ${escHtml(tweet)}
        </div>
      `).join('');
    }

    return `
      <div class="dashboard-post-card" data-post-id="${id}" style="background:var(--panel);border:1px solid rgba(231,233,234,.12);border-radius:8px;padding:14px;position:relative;overflow:hidden;cursor:pointer;transition:all 0.2s" onmouseover="this.style.borderColor='rgba(231,233,234,.25)';this.style.boxShadow='0 0 16px rgba(231,233,234,.15)'" onmouseout="this.style.borderColor='rgba(231,233,234,.12)';this.style.boxShadow='none'">
        <div style="position:absolute;top:-1px;left:-1px;right:-1px;height:2px;background:var(--green);box-shadow:0 0 12px var(--green);opacity:0.6"></div>
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
          <img src="logo.svg" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--text)">Clockworks</div>
            <div style="font-size:10px;color:var(--muted)">@ClockworksMN</div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--yellow);white-space:nowrap;flex-shrink:0" id="${cdId}">${cdTxt}</div>
        </div>
        <div style="font-size:12px;line-height:1.4;color:var(--text);white-space:pre-wrap;word-wrap:break-word">${escHtml(p.text || "")}</div>
        ${threadHtml}
        <div style="display:flex;gap:4px;font-size:9px;margin-top:12px">
          ${statusBadge(p.status)}
          <span class="badge ${p.platform}" style="white-space:nowrap">
            <img src="x-logo.png" style="width:8px;height:8px;object-fit:contain;vertical-align:middle;margin-right:2px;filter:invert(1)"> X
          </span>
        </div>
      </div>`;
  };

  const fbHtml = fbPostsAll.length > 0
    ? fbPosts.map(({ id, ...p }) => renderFBCard(id, p)).join("")
    : '<div class="no-posts" style="margin:0">No Facebook posts scheduled</div>';

  const xHtml = xPostsAll.length > 0
    ? xPosts.map(({ id, ...p }) => renderXCard(id, p)).join("")
    : '<div class="no-posts" style="margin:0">No X posts scheduled</div>';

  const fbMoreBtn = fbPostsAll.length > 3 && !dashboardShowAllFb
    ? `<button class="btn btn-ghost btn-sm" id="fb-show-more-btn" style="width:100%;margin-top:8px">📂 See all ${fbPostsAll.length} posts</button>`
    : fbPostsAll.length > 3 && dashboardShowAllFb
    ? `<button class="btn btn-ghost btn-sm" id="fb-show-less-btn" style="width:100%;margin-top:8px">📂 Show less</button>`
    : "";

  const xMoreBtn = xPostsAll.length > 3 && !dashboardShowAllX
    ? `<button class="btn btn-ghost btn-sm" id="x-show-more-btn" style="width:100%;margin-top:8px">📂 See all ${xPostsAll.length} posts</button>`
    : xPostsAll.length > 3 && dashboardShowAllX
    ? `<button class="btn btn-ghost btn-sm" id="x-show-less-btn" style="width:100%;margin-top:8px">📂 Show less</button>`
    : "";

  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">// Scheduled Posts</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(74,158,255,.07);border-radius:6px">
            <img src="facebook-logo.png" style="width:12px;height:12px;object-fit:contain">
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:var(--fb);letter-spacing:.06em">FACEBOOK</span>
          </div>
          ${fbHtml}
          ${fbMoreBtn}
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(231,233,234,.04);border-radius:6px">
            <img src="x-logo.png" style="width:12px;height:12px;object-fit:contain;filter:invert(1)">
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:var(--x);letter-spacing:.06em">X</span>
          </div>
          ${xHtml}
          ${xMoreBtn}
        </div>
      </div>
    </div>`;

  // Add event listeners for show more/less buttons
  document.getElementById("fb-show-more-btn")?.addEventListener("click", () => {
    dashboardShowAllFb = true;
    renderDashboardCards(containerId, posts);
  });

  document.getElementById("fb-show-less-btn")?.addEventListener("click", () => {
    dashboardShowAllFb = false;
    renderDashboardCards(containerId, posts);
  });

  document.getElementById("x-show-more-btn")?.addEventListener("click", () => {
    dashboardShowAllX = true;
    renderDashboardCards(containerId, posts);
  });

  document.getElementById("x-show-less-btn")?.addEventListener("click", () => {
    dashboardShowAllX = false;
    renderDashboardCards(containerId, posts);
  });

  // Add click handlers to dashboard post cards
  document.querySelectorAll(".dashboard-post-card").forEach(card => {
    card.addEventListener("click", () => {
      const postId = card.dataset.postId;
      const post = posts.find(p => p.id === postId);
      if (post) openEditDialog(postId, post);
    });
  });
}

// ── Render failed-posts banner on dashboard ──────────────────────────────────
function renderFailedBanner(containerId, posts) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const failed = posts.filter(p => p.status === "failed");
  if (!failed.length) {
    el.innerHTML = "";
    return;
  }

  const fbFailed = failed.filter(p => p.platform === "facebook").length;
  const xFailed  = failed.filter(p => p.platform === "x").length;
  const parts = [];
  if (fbFailed) parts.push(`${fbFailed} Facebook`);
  if (xFailed)  parts.push(`${xFailed} X`);

  const ids = failed.map(p => p.id);

  el.innerHTML = `
    <div class="failed-banner">
      <div class="fb-icon">⚠️</div>
      <div class="fb-msg"><strong>${failed.length} post${failed.length > 1 ? 's' : ''} failed</strong> — ${parts.join(", ")}</div>
      <div class="fb-actions">
        <button class="btn btn-danger btn-sm" id="banner-retry-all">↻ Retry All</button>
        <button class="btn btn-ghost btn-sm" id="banner-dismiss">Dismiss</button>
      </div>
    </div>`;

  document.getElementById("banner-retry-all").addEventListener("click", async (e) => {
    e.target.disabled = true;
    e.target.textContent = "Retrying…";
    try {
      await Promise.all(ids.map(id => retryPost(id)));
    } catch (err) {
      alert("Retry failed: " + err.message);
    }
  });

  document.getElementById("banner-dismiss").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      await dismissFailed(ids);
    } catch (err) {
      alert("Dismiss failed: " + err.message);
    }
  });
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

// ── Render upcoming queue / timeline ──────────────────────────────────────────
function renderQueue(containerId, posts) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const pending = posts
    .filter(p => p.status === "pending")
    .slice(0, 10);

  if (!pending.length) {
    el.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">// Upcoming Timeline</div>
        <div class="no-posts">No posts scheduled.</div>
      </div>`;
    return;
  }

  // Build timeline visualization
  const timelineItems = pending.map(({ id, ...p }, idx) => {
    const cdId  = `qcd-${id}`;
    const secs  = secondsUntil(p.scheduled_at);
    const cdTxt = secs !== null && secs > 0 ? fmtCountdown(secs) : "due now";
    const isFb  = p.platform === "facebook";
    const isFirst = idx === 0;
    const isLast = idx === pending.length - 1;

    requestAnimationFrame(() => {
      const cdEl = document.getElementById(cdId);
      if (cdEl && secs !== null && secs > 0) cdRegistry.set(`q-${id}`, { el: cdEl, ts: p.scheduled_at });
    });

    // Build thread/comment display for timeline
    let detailsHtml = '';
    if (isFb && p.link) {
      detailsHtml = `<div style="margin-top:8px;font-size:11px;color:var(--text-muted)">First comment: ${escHtml(p.link)}</div>`;
    } else if (!isFb && p.thread && p.thread.length > 0) {
      detailsHtml = `<div style="margin-top:8px;font-size:10px;color:var(--muted)">+ ${p.thread.length} more ${p.thread.length === 1 ? 'tweet' : 'tweets'} in thread</div>`;
    }

    return `
      <div style="position:relative;padding-left:32px;margin-bottom:${isLast ? '0' : '20px'};cursor:pointer" class="timeline-post-card" data-post-id="${id}">
        <!-- Timeline dot -->
        <div style="position:absolute;left:0;top:4px;width:12px;height:12px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);border:2px solid var(--panel)"></div>
        <!-- Timeline line (skip on last item) -->
        ${!isLast ? `<div style="position:absolute;left:5px;top:16px;width:2px;height:20px;background:linear-gradient(180deg,var(--green),var(--border))"></div>` : ''}
        <!-- Content -->
        <div style="padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;transition:all 0.2s" onmouseover="this.style.borderColor='var(--green)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="badge ${p.platform}" style="white-space:nowrap;flex-shrink:0">
              ${isFb
                ? `<img src="facebook-logo.png" style="width:10px;height:10px;object-fit:contain;vertical-align:middle;margin-right:3px"> FB`
                : `<img src="x-logo.png" style="width:10px;height:10px;object-fit:contain;vertical-align:middle;margin-right:6px;filter:invert(1)"> X`}
            </span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);white-space:nowrap;flex-shrink:0">${fmt12h(p.scheduled_at)}</span>
            <span id="${cdId}" style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--yellow);white-space:nowrap;flex-shrink:0;margin-left:auto">${cdTxt}</span>
          </div>
          <div style="color:var(--text);font-size:12px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word">${escHtml(p.text || "")}</div>
          ${detailsHtml}
        </div>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">// Upcoming Timeline</div>
      <div style="padding:12px;background:var(--bg3);border-radius:6px;border:1px solid var(--border)" id="timeline-container">${timelineItems}</div>
    </div>`;

  // Add click handlers for timeline items
  document.querySelectorAll(".timeline-post-card").forEach(card => {
    card.addEventListener("click", () => {
      const postId = card.dataset.postId;
      const post = posts.find(p => p.id === postId);
      if (post) openEditDialog(postId, post);
    });
  });
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
          <button class="btn btn-cyan" id="sendnow-${platform}">⚡ Send Now</button>
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

  // ── Send Now handler ─────────────────────────────────────────────────────
  document.getElementById(`sendnow-${platform}`).addEventListener("click", async () => {
    const text  = document.getElementById(`${platform}-text`).value.trim();
    const msgEl = document.getElementById(`${formId}-msg`);

    if (!text) {
      msgEl.innerHTML = `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--red)">Post text is required.</span>`;
      return;
    }

    const data = { platform, text, scheduledDate: "", scheduledTime: "" };

    if (isFb) {
      const link = document.getElementById("facebook-link").value.trim();
      if (link) data.link = link;
    } else {
      const threadRaw = document.getElementById("x-thread").value.trim();
      if (threadRaw) {
        data.thread = threadRaw.split("\n").map(s => s.trim()).filter(Boolean);
      }
    }

    const nowBtn = document.getElementById(`sendnow-${platform}`);
    nowBtn.disabled = true;
    nowBtn.textContent = "Sending…";

    try {
      // Build post doc directly with scheduled_at = now (scheduler picks it up immediately)
      const post = {
        platform,
        text,
        scheduled_at: Timestamp.fromDate(new Date()),
        status: "pending",
        created_at: serverTimestamp(),
      };
      if (data.link)   post.link   = data.link;
      if (data.thread && data.thread.length > 0) post.thread = data.thread;

      await addDoc(postsCol, post);
      msgEl.innerHTML = `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--green)">⚡ Post queued for immediate send!</span>`;
      document.getElementById(`${platform}-text`).value = "";
      if (isFb) document.getElementById("facebook-link").value = "";
      else      document.getElementById("x-thread").value = "";
      setTimeout(() => { msgEl.innerHTML = ""; }, 3000);
    } catch (e) {
      msgEl.innerHTML = `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--red)">Error: ${escHtml(e.message)}</span>`;
    } finally {
      nowBtn.disabled = false;
      nowBtn.textContent = "⚡ Send Now";
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

// ── Edit Dialog ───────────────────────────────────────────────────────────────
function openEditDialog(id, post) {
  const isFb = post.platform === "facebook";
  const hasThreadOrComments = isFb ? !!post.link : (post.thread && post.thread.length > 0);

  // Build thread/comment fields HTML
  let threadFieldsHtml = '';
  if (!isFb && post.thread && post.thread.length > 0) {
    // X posts with threads
    threadFieldsHtml = post.thread.map((tweet, idx) => `
      <div class="form-group full">
        <label>Tweet ${idx + 2}</label>
        <textarea class="edit-thread-field" data-index="${idx}" rows="3" placeholder="Tweet ${idx + 2}…">${escHtml(tweet)}</textarea>
      </div>
    `).join('');
  }

  const modalHtml = `
    <div class="modal-overlay open" id="edit-modal-overlay" style="display:flex">
      <div class="modal" style="max-width:600px;max-height:90vh;overflow-y:auto">
        <div class="modal-title">
          <span>✏️ Edit Post</span>
          <button class="modal-close" id="edit-modal-close">×</button>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="edit-date" value="${post.scheduled_at instanceof Timestamp ? post.scheduled_at.toDate().toLocaleDateString('en-CA', {timeZone: 'America/Chicago'}) : post.scheduled_at}">
          </div>
          <div class="form-group">
            <label>Time (Central Time)</label>
            <input type="time" id="edit-time" value="${post.scheduled_at instanceof Timestamp ? post.scheduled_at.toDate().toLocaleTimeString('en-US', {timeZone: 'America/Chicago', hour12: false, hour: '2-digit', minute: '2-digit'}).slice(0,5) : '00:00'}">
          </div>
          <div class="form-group full">
            <label>${isFb ? "Post Text" : "Tweet 1 (Main Post)"}</label>
            <textarea id="edit-text" rows="4">${escHtml(post.text || "")}</textarea>
          </div>
          ${isFb ? `
          <div class="form-group full">
            <label>First Comment Link <span style="color:var(--dim);font-size:9px">(optional)</span></label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="url" id="edit-link" placeholder="https://mnclockworks.com/blog/..." value="${post.link || ""}" style="flex:1">
              ${post.link ? `<a href="${escHtml(post.link)}" target="_blank" rel="noopener noreferrer" style="padding:6px 10px;border:1px solid var(--border);border-radius:4px;text-decoration:none;color:var(--muted);font-size:11px;white-space:nowrap;transition:all 0.2s" onmouseover="this.style.borderColor='var(--green)';this.style.color='var(--green)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">Open ↗</a>` : ''}
            </div>
          </div>` : `
          ${threadFieldsHtml}
          <div class="form-group full" style="border-top:1px solid var(--border);padding-top:12px;margin-top:12px">
            <button class="btn btn-ghost btn-sm" id="add-thread-btn" style="width:100%">+ Add Another Tweet to Thread</button>
          </div>`}

          <div class="form-group full" style="flex-direction:row;align-items:center;gap:12px">
            <button class="btn btn-primary" id="edit-save-btn">💾 Save Changes</button>
            <button class="btn btn-danger btn-sm" id="edit-delete-btn">🗑️ Delete</button>
            <button class="btn btn-ghost btn-sm" id="edit-cancel-btn">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  const overlay = document.getElementById("edit-modal-overlay");
  const closeBtn = document.getElementById("edit-modal-close");
  const cancelBtn = document.getElementById("edit-cancel-btn");
  const saveBtn = document.getElementById("edit-save-btn");
  const deleteBtn = document.getElementById("edit-delete-btn");

  function closeModal() {
    overlay.remove();
  }

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeModal();
  });

  saveBtn.addEventListener("click", async () => {
    const date = document.getElementById("edit-date").value;
    const time = document.getElementById("edit-time").value;
    const text = document.getElementById("edit-text").value.trim();

    if (!date || !time || !text) {
      alert("Date, time, and text are required");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      // Convert CT input to UTC (same logic as addPost)
      const ctDateStr = `${date}T${time}:00`;
      const ctDate = new Date(ctDateStr);
      const utcDate = new Date(
        new Date(ctDateStr).toLocaleString("en-US", { timeZone: "America/Chicago" })
      );
      const offset = ctDate - utcDate;
      const scheduledUtc = new Date(ctDate.getTime() + offset);

      const updateData = {
        scheduled_at: Timestamp.fromDate(scheduledUtc),
        text,
      };

      if (post.platform === "facebook") {
        const link = document.getElementById("edit-link").value.trim();
        updateData.link = link || deleteField();
      } else {
        // Collect all thread fields
        const threadFields = document.querySelectorAll(".edit-thread-field");
        const thread = Array.from(threadFields)
          .map(field => field.value.trim())
          .filter(Boolean);

        if (thread.length === 0) {
          updateData.thread = deleteField();
        } else {
          updateData.thread = thread;
        }
      }

      await updateDoc(doc(db, "posts", id), updateData);
      closeModal();
    } catch (e) {
      alert("Error saving: " + e.message);
      saveBtn.disabled = false;
      saveBtn.textContent = "💾 Save Changes";
    }
  });

  // Add thread field button (X posts only)
  document.getElementById("add-thread-btn")?.addEventListener("click", () => {
    const threadFields = document.querySelectorAll(".edit-thread-field");
    const newIndex = threadFields.length;
    const newField = document.createElement("div");
    newField.className = "form-group full";
    newField.innerHTML = `
      <label>Tweet ${newIndex + 2}</label>
      <textarea class="edit-thread-field" data-index="${newIndex}" rows="3" placeholder="Tweet ${newIndex + 2}…"></textarea>
    `;
    // Insert before the "Add Another Tweet" button's container
    const addBtnContainer = document.getElementById("add-thread-btn").closest(".form-group");
    addBtnContainer.parentElement.insertBefore(newField, addBtnContainer);
  });

  deleteBtn.addEventListener("click", async () => {
    if (!confirm("Delete this post?")) return;
    deleteBtn.disabled = true;
    deleteBtn.textContent = "Deleting…";
    try {
      await deletePost(id);
      closeModal();
    } catch (e) {
      alert("Error deleting: " + e.message);
      deleteBtn.disabled = false;
      deleteBtn.textContent = "🗑️ Delete";
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initPosts() {
  // Global delete handler (called from table row buttons)
  window.__deletePost = async (id) => {
    if (!confirm("Delete this scheduled post?")) return;
    await deletePost(id).catch(e => alert("Delete failed: " + e.message));
  };

  // Global retry handler (called from table row buttons)
  window.__retryPost = async (id) => {
    await retryPost(id).catch(e => alert("Retry failed: " + e.message));
  };

  // Global edit handler (called from table row buttons)
  // We need access to current posts, stored via snapshot
  let _currentPosts = [];
  window.__editPost = (id) => {
    const post = _currentPosts.find(p => p.id === id);
    if (post) openEditDialog(id, post);
  };

  // Render forms once
  renderForm("fb-form-container", "facebook");
  renderForm("x-form-container",  "x");

  // Live Firestore subscription
  const q = query(postsCol, orderBy("scheduled_at", "asc"));
  onSnapshot(q, (snap) => {
    cdRegistry.clear();
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _currentPosts = posts;
    updateStats(posts);
    renderFailedBanner("dashboard-failed-banner", posts);
    renderDashboardCards("dashboard-queue-container", posts);
    renderTable("fb-list-container",         posts, "facebook");
    renderTable("x-list-container",          posts, "x");
  }, err => console.warn("posts listener error:", err));
}
