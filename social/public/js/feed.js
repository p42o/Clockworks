// feed.js — render live (sent) posts as styled cards on the dashboard
import { db } from "./firebase-init.js";
import {
  collection, query, where, orderBy, limit, onSnapshot, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  });
}

function renderFBCard(post) {
  const url = post.post_url || "#";
  const hasLink = post.post_url;
  return `
    <a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:block">
      <div style="background:var(--panel);border:1px solid rgba(74,158,255,.25);border-radius:12px;padding:16px;position:relative;overflow:hidden;cursor:pointer;transition:all 0.2s" onmouseover="this.style.borderColor='rgba(74,158,255,.5)';this.style.boxShadow='0 0 16px rgba(74,158,255,.2)'" onmouseout="this.style.borderColor='rgba(74,158,255,.25)';this.style.boxShadow='none'">
        <div style="position:absolute;top:-1px;left:-1px;right:-1px;height:2px;background:var(--green);box-shadow:0 0 12px var(--green);opacity:0.6"></div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <img src="logo.svg" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--text)">Clockworks - AI & Automation</div>
            <div style="font-size:10px;color:var(--muted)">${fmtDate(post.sent_at || post.scheduled_at)}</div>
          </div>
          ${hasLink ? '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--green);white-space:nowrap;flex-shrink:0">LIVE ●</div>' : ''}
        </div>
        <div style="font-size:13px;line-height:1.6;color:var(--text);white-space:pre-wrap;word-wrap:break-word;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">${escHtml(post.text || "")}</div>
        <div style="display:flex;gap:4px;font-size:9px;margin-top:12px">
          <span class="badge sent">✅ sent</span>
          <span class="badge facebook" style="white-space:nowrap">
            <img src="facebook-logo.png" style="width:9px;height:9px;object-fit:contain;vertical-align:middle;margin-right:2px"> FB
          </span>
          ${hasLink ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--muted);margin-left:auto">View on Facebook →</span>' : ''}
        </div>
      </div>
    </a>`;
}

function renderXCard(post) {
  const url = post.post_url || "#";
  const hasLink = post.post_url;
  const hasThread = post.thread && post.thread.length > 0;
  return `
    <a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:block">
      <div style="background:var(--panel);border:1px solid rgba(231,233,234,.12);border-radius:8px;padding:14px;position:relative;overflow:hidden;cursor:pointer;transition:all 0.2s" onmouseover="this.style.borderColor='rgba(231,233,234,.25)';this.style.boxShadow='0 0 16px rgba(231,233,234,.15)'" onmouseout="this.style.borderColor='rgba(231,233,234,.12)';this.style.boxShadow='none'">
        <div style="position:absolute;top:-1px;left:-1px;right:-1px;height:2px;background:var(--green);box-shadow:0 0 12px var(--green);opacity:0.6"></div>
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
          <img src="logo.svg" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--text)">Clockworks</div>
            <div style="font-size:10px;color:var(--muted)">@ClockworksMN</div>
          </div>
          ${hasLink ? '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--green);white-space:nowrap;flex-shrink:0">LIVE ●</div>' : ''}
        </div>
        <div style="font-size:12px;line-height:1.4;color:var(--text);white-space:pre-wrap;word-wrap:break-word;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">${escHtml(post.text || "")}</div>
        ${hasThread ? `<div style="margin-top:8px;font-size:10px;color:var(--muted)">+ ${post.thread.length} more tweet${post.thread.length === 1 ? '' : 's'} in thread</div>` : ''}
        <div style="display:flex;gap:4px;font-size:9px;margin-top:12px">
          <span class="badge sent">✅ sent</span>
          <span class="badge x" style="white-space:nowrap">
            <img src="x-logo.png" style="width:8px;height:8px;object-fit:contain;vertical-align:middle;margin-right:2px;filter:invert(1)"> X
          </span>
          ${hasLink ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--muted);margin-left:auto">View on X →</span>' : ''}
        </div>
      </div>
    </a>`;
}

function renderEmptyCard(platform) {
  const isFb = platform === "facebook";
  return `
    <div style="padding:24px;border-radius:8px;background:var(--panel);border:1px dashed ${isFb ? 'rgba(74,158,255,.2)' : 'rgba(231,233,234,.12)'};text-align:center">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim)">No published posts yet</div>
    </div>`;
}

export function initFeed() {
  const el = document.getElementById("dashboard-feed-container");
  if (!el) return Promise.resolve();

  // Show loading state
  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">// Live Feed</div>
      <div style="padding:20px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim)">Loading live posts…</div>
    </div>`;

  const sentQuery = query(
    collection(db, "posts"),
    where("status", "==", "sent"),
    orderBy("sent_at", "desc"),
    limit(20)
  );

  return new Promise((resolve) => {
    onSnapshot(sentQuery, (snap) => {
      const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const fbPosts = posts.filter(p => p.platform === "facebook").slice(0, 3);
      const xPosts  = posts.filter(p => p.platform === "x").slice(0, 3);

      const fbHtml = fbPosts.length > 0
        ? fbPosts.map(p => renderFBCard(p)).join("")
        : renderEmptyCard("facebook");

      const xHtml = xPosts.length > 0
        ? xPosts.map(p => renderXCard(p)).join("")
        : renderEmptyCard("x");

      el.innerHTML = `
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">// Live Feed</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:100%">
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid rgba(74,158,255,.15);background:rgba(74,158,255,.07);border-radius:8px 8px 0 0">
                <img src="facebook-logo.png" style="width:14px;height:14px;object-fit:contain">
                <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--fb);letter-spacing:.06em">FACEBOOK</span>
                <a href="https://www.facebook.com/people/Clockworks-MN/61580475420690/" target="_blank" rel="noopener noreferrer" style="margin-left:auto;font-size:10px;color:var(--muted);text-decoration:none;padding:2px 6px;border:1px solid var(--border);border-radius:3px;transition:all 0.2s" onmouseover="this.style.borderColor='var(--fb)';this.style.color='var(--fb)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">Visit Profile →</a>
              </div>
              ${fbHtml}
            </div>
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid rgba(231,233,234,.08);background:rgba(231,233,234,.04);border-radius:8px 8px 0 0">
                <img src="x-logo.png" style="width:14px;height:14px;object-fit:contain;filter:invert(1)">
                <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--x);letter-spacing:.06em">X / TWITTER</span>
                <a href="https://x.com/ClockworksMN" target="_blank" rel="noopener noreferrer" style="margin-left:auto;font-size:10px;color:var(--muted);text-decoration:none;padding:2px 6px;border:1px solid var(--border);border-radius:3px;transition:all 0.2s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">Visit Profile →</a>
              </div>
              ${xHtml}
            </div>
          </div>
        </div>`;

      resolve();
    }, (err) => {
      console.warn("Feed listener error:", err);
      el.innerHTML = `
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">// Live Feed</div>
          <div style="padding:20px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--red)">Error loading live posts. Check console.</div>
        </div>`;
      resolve();
    });
  });
}
