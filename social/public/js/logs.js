// logs.js — live activity log via Firestore onSnapshot
import { db } from "./firebase-init.js";
import {
  collection, query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ICON_MAP = {
  info:    "ℹ️",
  success: "✅",
  error:   "❌",
  warning: "⚠️",
  send:    "📤",
  save:    "💾",
  import:  "📥",
};

function fmtTs(ts) {
  if (!ts?.toDate) return ts || "";
  const d = ts.toDate();
  const date = d.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "short", day: "numeric"
  });
  const time = d.toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true
  });
  return `${date} ${time}`;
}

export function initLogs() {
  const activityEntriesEl = document.getElementById("activity-log-entries");

  if (!activityEntriesEl) return;

  let knownIds = new Set();

  const q = query(
    collection(db, "social_logs"),
    orderBy("ts", "desc"),
    limit(200)
  );

  onSnapshot(q, (snap) => {
    if (snap.empty) {
      activityEntriesEl.innerHTML = '<div class="log-empty">No activity yet.</div>';
      return;
    }

    knownIds = new Set(snap.docs.map(d => d.id));

    // Build HTML (newest first)
    const html = snap.docs.map(d => {
      const e    = d.data();
      const ts   = fmtTs(e.ts);
      const icon = ICON_MAP[e.level] || "•";
      const msg  = (e.msg || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      return `<div class="log-entry ${e.level || ""}">
        <span class="ts">${ts}</span><span class="icon">${icon}</span><span class="msg">${msg}</span>
      </div>`;
    }).join("");

    activityEntriesEl.innerHTML = html;
  }, err => console.warn("logs listener error:", err));
}
