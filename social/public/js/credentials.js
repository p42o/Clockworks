// credentials.js — save/display API credentials, live connection status
import { db } from "./firebase-init.js";
import {
  doc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CRED_DOC = doc(db, "social_credentials", "config");
const CONN_DOC = doc(db, "social_status", "connection");

// ── Helpers ───────────────────────────────────────────────────────────────────
function setIndicator(id, state, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  const dot = el.querySelector ? el : null;
  el.className = `pc-status ${state}`;
  el.innerHTML = `<div class="dot"></div>${msg}`;
}

function fieldRow(inputId, labelText, isSet) {
  return `
    <div class="pc-field">
      <label>${labelText}
        <span class="${isSet ? "field-set" : "field-unset"}">${isSet ? "● SET" : "○ NOT SET"}</span>
      </label>
      <input type="password" id="${inputId}" placeholder="${isSet ? "••••••••••••" : "Enter value…"}" autocomplete="off">
    </div>`;
}

function connStatus(conn) {
  if (!conn)           return `<div class="pc-status unk"><div class="dot"></div>NOT TESTED</div>`;
  if (conn.ok === true)  return `<div class="pc-status ok"><div class="dot"></div>${conn.msg || "CONNECTED"}</div>`;
  return `<div class="pc-status bad"><div class="dot"></div>${conn.msg || "ERROR"}</div>`;
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(creds, conn) {
  const container = document.getElementById("credentials-container");
  if (!container) return;

  const c  = creds || {};
  const fb = conn?.facebook;
  const x  = conn?.x;

  container.innerHTML = `
    <div class="platform-cards">

      <!-- Facebook -->
      <div class="platform-card fb-card">
        <div class="pc-header fb">
          <div class="pc-title fb"><img src="facebook-logo.png" style="width:14px;height:14px;object-fit:contain;vertical-align:middle;margin-right:6px"> Facebook Page</div>
          <div id="fb-conn-badge">${connStatus(fb)}</div>
        </div>
        <div class="pc-body">
          <div class="pc-warning yellow">
            ⚠ Use a <strong>Page Access Token</strong> — not a User token.
            Generated correctly, it <strong>never expires</strong>. See guide below.
          </div>
          <div class="pc-fields">
            ${fieldRow("inp-fb-token",   "Page Access Token", !!c.fb_page_access_token)}
            ${fieldRow("inp-fb-page-id", "Page ID",           !!c.fb_page_id)}
          </div>
          <div class="pc-actions">
            <button class="btn btn-fb btn-sm" id="save-fb-btn">💾 Save</button>
          </div>
          <div id="fb-save-msg" style="margin-top:10px"></div>
          ${fb?.ts ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);margin-top:8px">Last tested: ${fb.ts}</div>` : ""}
        </div>
      </div>

      <!-- X -->
      <div class="platform-card x-card">
        <div class="pc-header x">
          <div class="pc-title x"><img src="x-logo.png" style="width:14px;height:14px;object-fit:contain;vertical-align:middle;margin-right:6px;filter:invert(1)"> X</div>
          <div id="x-conn-badge">${connStatus(x)}</div>
        </div>
        <div class="pc-body">
          <div class="pc-warning cyan">
            ℹ Requires X API v2 with Basic or Pro tier for write access.
          </div>
          <div class="pc-fields">
            ${fieldRow("inp-x-key",    "API Key",              !!c.x_api_key)}
            ${fieldRow("inp-x-secret", "API Secret",           !!c.x_api_secret)}
            ${fieldRow("inp-x-token",  "Access Token",         !!c.x_access_token)}
            ${fieldRow("inp-x-tsec",   "Access Token Secret",  !!c.x_access_token_secret)}
            ${fieldRow("inp-x-bearer", "Bearer Token",         !!c.x_bearer_token)}
          </div>
          <div class="pc-actions">
            <button class="btn btn-ghost btn-sm" id="save-x-btn">💾 Save</button>
          </div>
          <div id="x-save-msg" style="margin-top:10px"></div>
          ${x?.ts ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);margin-top:8px">Last tested: ${x.ts}</div>` : ""}
        </div>
      </div>

    </div>

    <!-- Facebook token guide -->
    <div class="card">
      <div class="card-title">Facebook Page Access Token — Setup Guide</div>
      <ol style="padding-left:20px;line-height:2.2;font-size:13px;color:var(--text)">
        <li>Go to <a href="https://developers.facebook.com/tools/explorer" target="_blank" style="color:var(--cyan)">Graph API Explorer</a></li>
        <li>Select your app → click <strong>Generate Access Token</strong> → grant all Page permissions</li>
        <li>Copy the token → open <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" style="color:var(--cyan)">Access Token Debugger</a> → click <strong>Extend Access Token</strong></li>
        <li>Back in Explorer with the long-lived token, call: <code>GET /me/accounts</code></li>
        <li>Find your Page in the JSON response → copy its <code>access_token</code> value</li>
        <li>This <strong>Page Access Token never expires</strong> unless you change your Facebook password or revoke the app</li>
      </ol>
      <div style="margin-top:16px;padding:12px 16px;background:rgba(0,255,136,.05);border:1px solid rgba(0,255,136,.15);border-radius:6px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--green);margin-bottom:6px">Required permissions</div>
        <div style="font-size:12px;color:var(--text);line-height:1.8">
          <code>pages_manage_posts</code> — publish posts<br>
          <code>pages_read_engagement</code> — read page data (required for token validation)
        </div>
      </div>
      <div style="margin-top:12px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)">
        Verify your token at <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" style="color:var(--cyan)">Access Token Debugger</a> — confirm Type: Page, Expires: Never.
      </div>
    </div>`;

  // ── Save Facebook ──
  document.getElementById("save-fb-btn").addEventListener("click", async () => {
    const token   = document.getElementById("inp-fb-token").value.trim();
    const page_id = document.getElementById("inp-fb-page-id").value.trim();
    const msgEl   = document.getElementById("fb-save-msg");
    const update  = {};
    if (token)   update.fb_page_access_token = token;
    if (page_id) update.fb_page_id = page_id;
    if (!Object.keys(update).length) {
      msgEl.innerHTML = `<div class="alert alert-warning" style="margin:0">Enter at least one value to save.</div>`;
      return;
    }
    const btn = document.getElementById("save-fb-btn");
    btn.disabled = true;
    try {
      await setDoc(CRED_DOC, update, { merge: true });
      msgEl.innerHTML = `<div class="alert alert-success" style="margin:0">✅ Saved. Scheduler will auto-reload within 60s.</div>`;
      document.getElementById("inp-fb-token").value = "";
      document.getElementById("inp-fb-page-id").value = "";
      setTimeout(() => { msgEl.innerHTML = ""; }, 5000);
    } catch (e) {
      msgEl.innerHTML = `<div class="alert alert-error" style="margin:0">Error: ${e.message}</div>`;
    } finally {
      btn.disabled = false;
    }
  });

  // ── Save X ──
  document.getElementById("save-x-btn").addEventListener("click", async () => {
    const fields = {
      x_api_key:             document.getElementById("inp-x-key").value.trim(),
      x_api_secret:          document.getElementById("inp-x-secret").value.trim(),
      x_access_token:        document.getElementById("inp-x-token").value.trim(),
      x_access_token_secret: document.getElementById("inp-x-tsec").value.trim(),
      x_bearer_token:        document.getElementById("inp-x-bearer").value.trim(),
    };
    const msgEl = document.getElementById("x-save-msg");
    const update = Object.fromEntries(Object.entries(fields).filter(([, v]) => v));
    if (!Object.keys(update).length) {
      msgEl.innerHTML = `<div class="alert alert-warning" style="margin:0">Enter at least one value to save.</div>`;
      return;
    }
    const btn = document.getElementById("save-x-btn");
    btn.disabled = true;
    try {
      await setDoc(CRED_DOC, update, { merge: true });
      msgEl.innerHTML = `<div class="alert alert-success" style="margin:0">✅ Saved. Scheduler will auto-reload within 60s.</div>`;
      ["inp-x-key","inp-x-secret","inp-x-token","inp-x-tsec","inp-x-bearer"].forEach(id => {
        document.getElementById(id).value = "";
      });
      setTimeout(() => { msgEl.innerHTML = ""; }, 5000);
    } catch (e) {
      msgEl.innerHTML = `<div class="alert alert-error" style="margin:0">Error: ${e.message}</div>`;
    } finally {
      btn.disabled = false;
    }
  });
}

// ── Update sidebar connection pips ────────────────────────────────────────────
function updatePips(conn) {
  const update = (id, platform) => {
    const el = document.getElementById(id);
    if (!el) return;
    const state = conn?.[platform]?.ok === true  ? "ok"
                : conn?.[platform]?.ok === false ? "bad"
                : "unk";
    el.className = `conn-pip ${state}`;
  };
  update("pip-fb", "facebook");
  update("pip-x",  "x");
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initCredentials() {
  let cachedCreds = null;
  let cachedConn  = null;

  onSnapshot(CRED_DOC, (snap) => {
    cachedCreds = snap.exists() ? snap.data() : {};
    render(cachedCreds, cachedConn);
  }, err => console.warn("creds listener:", err));

  onSnapshot(CONN_DOC, (snap) => {
    cachedConn = snap.exists() ? snap.data() : null;
    updatePips(cachedConn);
    // Re-render credentials page to update badges
    render(cachedCreds, cachedConn);
  }, err => console.warn("conn listener:", err));
}
