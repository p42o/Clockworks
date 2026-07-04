# Clockworks Social — Firebase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Clockworks Social from a self-hosted Flask app to Firebase Hosting (static UI) + Firestore (data layer) + VPS headless Python scheduler, preserving all features.

**Architecture:** Static HTML/JS UI on Firebase Hosting reads/writes Firestore. A headless Python process on the VPS polls Firestore every 60s and fires due posts to Facebook and X. All credentials, schedule, logs, and status live in Firestore.

**Tech Stack:** Firebase Hosting, Firestore, Firebase Auth (Google Sign-In), firebase-admin (Python), tweepy, requests, systemd

---

## File Map

```
Clockworks/social/
  scheduler.py                          NEW — headless VPS posting engine
  requirements-scheduler.txt            NEW — VPS pip dependencies
  systemd/
    clockworks-social.service           NEW — systemd unit file
  public/                               NEW — Firebase Hosting root
    index.html                          NEW — full single-page app UI
    js/
      firebase-init.js                  NEW — Firebase app + Firestore + Auth init
      auth.js                           NEW — Google Sign-In, UID allowlist
      posts.js                          NEW — post CRUD, live list, countdown timers
      credentials.js                    NEW — save/display credentials, connection status
      logs.js                           NEW — live activity log via onSnapshot
      csv.js                            NEW — CSV parse + import + template download
    templates/
      facebook-template.csv             NEW — static download
      x-template.csv                    NEW — static download
  firebase.json                         NEW — Firebase Hosting + Firestore config
  .firebaserc                           NEW — Firebase project alias
  firestore.rules                       NEW — security rules
```

`web.py` and `clockworks_social.py` are **not modified or deleted** — kept as reference/fallback.

---

## Task 1: Firebase project setup

**Files:**
- Create: `Clockworks/social/firebase.json`
- Create: `Clockworks/social/.firebaserc`
- Create: `Clockworks/social/firestore.rules`

- [ ] **Step 1: Install Firebase CLI if not present**

```bash
npm install -g firebase-tools
firebase --version
```
Expected: version number printed (e.g. `13.x.x`)

- [ ] **Step 2: Login and create project**

```bash
firebase login
firebase projects:create clockworks-social-YOURNAME --display-name "Clockworks Social"
```

Or create at https://console.firebase.google.com — name it `clockworks-social` (add suffix if taken). Note the **Project ID** — you'll use it below.

- [ ] **Step 3: Enable Firestore**

In Firebase Console → Firestore Database → Create database → Start in **production mode** → choose region `us-central1`.

- [ ] **Step 4: Enable Auth**

Firebase Console → Authentication → Get started → Sign-in method → Google → Enable → Save.

- [ ] **Step 5: Write firebase.json**

```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

- [ ] **Step 6: Write .firebaserc** (replace `YOUR_PROJECT_ID` with your actual project ID)

```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

- [ ] **Step 7: Write firestore.rules**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthorized() {
      return request.auth != null &&
             request.auth.uid in ['REPLACE_WITH_YOUR_UID'];
    }
    match /{document=**} {
      allow read, write: if isAuthorized();
    }
  }
}
```

Note: you'll replace `REPLACE_WITH_YOUR_UID` in Task 7 after first sign-in.

- [ ] **Step 8: Initialize Firebase in project directory**

```bash
cd ~/Clockworks/social
firebase use --add   # select your project, alias: default
```

- [ ] **Step 9: Deploy Firestore rules**

```bash
firebase deploy --only firestore:rules
```

Expected: `✔  firestore: released rules`

- [ ] **Step 10: Create serviceAccountKey.json for VPS**

Firebase Console → Project Settings → Service accounts → Generate new private key → Save as `Clockworks/social/serviceAccountKey.json`.

Add to `.gitignore`:
```
serviceAccountKey.json
.env
```

- [ ] **Step 11: Commit**

```bash
cd ~/Clockworks/social
git add firebase.json .firebaserc firestore.rules .gitignore
git commit -m "feat: add Firebase project config and Firestore rules"
```

---

## Task 2: Firebase Hosting public directory scaffold

**Files:**
- Create: `Clockworks/social/public/js/firebase-init.js`
- Create: `Clockworks/social/public/templates/facebook-template.csv`
- Create: `Clockworks/social/public/templates/x-template.csv`

- [ ] **Step 1: Create public directory structure**

```bash
mkdir -p ~/Clockworks/social/public/js
mkdir -p ~/Clockworks/social/public/templates
```

- [ ] **Step 2: Write public/js/firebase-init.js**

Replace the config object values with your actual Firebase project config (Firebase Console → Project Settings → Your apps → Web app → Config).

```javascript
// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { initializeFirestore, experimentalAutoDetectLongPolling } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const db   = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
export const auth = getAuth(app);
```

- [ ] **Step 3: Write public/templates/facebook-template.csv**

```
scheduled_date,scheduled_time,post_text,first_comment,notes
2026-04-01,09:00,"Most people think AI is complicated. It's not — if someone shows you the right way.","https://mnclockworks.com/blog/ai-vs-automation","Link in first_comment column"
2026-04-02,09:00,"Quick win for today: ask Claude to rewrite your last email.",,""
```

- [ ] **Step 4: Write public/templates/x-template.csv**

```
scheduled_date,scheduled_time,post_text,thread_tweets,notes
2026-04-01,08:30,"Most small business owners are paying for AI tools they don't know how to use.","It's not the tool.|The prompt matters more than the platform.|Fix the input. Fix the output.","Pipe-separate thread tweets"
2026-04-02,08:30,"'I don't have time to learn AI' is the most expensive sentence in small business.",,""
```

- [ ] **Step 5: Commit**

```bash
git add public/
git commit -m "feat: scaffold public directory with Firebase init and CSV templates"
```

---

## Task 3: Auth module

**Files:**
- Create: `Clockworks/social/public/js/auth.js`

- [ ] **Step 1: Write public/js/auth.js**

```javascript
// auth.js
import { auth } from "./firebase-init.js";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Replace with your actual Google UID (found in Firebase Console → Auth → Users after first sign-in)
const ALLOWED_UIDS = ["REPLACE_WITH_YOUR_UID"];

const provider = new GoogleAuthProvider();

export function signIn() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

export function onAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (!ALLOWED_UIDS.includes(user.uid)) {
        await signOut(auth);
        callback(null, "unauthorized");
        return;
      }
      callback(user, null);
    } else {
      callback(null, null);
    }
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/auth.js
git commit -m "feat: add Firebase Auth module with Google Sign-In and UID allowlist"
```

---

## Task 4: Main UI shell (index.html — structure, CSS, nav, auth gate)

**Files:**
- Create: `Clockworks/social/public/index.html`

This task builds the full HTML shell with all CSS (ported from `web.py`), navigation, and auth gate. Page content sections are empty divs — filled in later tasks.

- [ ] **Step 1: Write public/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Clockworks Social</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0c0f;--bg2:#0d1117;--bg3:#111820;--panel:#131a22;
  --border:#1e2d3d;--border2:#243447;
  --green:#00ff88;--cyan:#00d4ff;--orange:#ff7b35;
  --red:#ff3b3b;--yellow:#ffd700;--fb:#4a9eff;--x:#e7e9ea;
  --text:#c9d1d9;--muted:#6e8094;--dim:#3d5166;
  --log-w:340px;
}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px}
body::before{content:'';position:fixed;inset:0;z-index:9999;pointer-events:none;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,136,.012) 2px,rgba(0,255,136,.012) 4px)}

/* Auth gate */
#auth-gate{display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:20px}
#auth-gate.hidden{display:none}
#app.hidden{display:none}
.auth-card{background:var(--panel);border:1px solid var(--border2);border-radius:12px;padding:40px;text-align:center;max-width:360px;width:100%}
.auth-logo{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;color:var(--green);text-shadow:0 0 20px rgba(0,255,136,.4);margin-bottom:6px}
.auth-sub{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);margin-bottom:28px;letter-spacing:.08em}
.auth-err{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--red);margin-top:12px;display:none}

/* Layout */
.layout{display:grid;grid-template-columns:230px 1fr;min-height:100vh;transition:grid-template-columns .25s}
.layout.log-open{grid-template-columns:230px 1fr var(--log-w)}

/* Sidebar */
.sidebar{background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;position:sticky;top:0;height:100vh}
.sidebar-logo{padding:18px 20px 14px;border-bottom:1px solid var(--border);position:relative}
.sidebar-logo::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,var(--green),transparent);opacity:.4}
.logo-name{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--green);letter-spacing:.05em;text-shadow:0 0 12px rgba(0,255,136,.5)}
.logo-sub{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);margin-top:3px;letter-spacing:.08em}
.logo-blink{display:inline-block;width:7px;height:13px;background:var(--green);margin-left:3px;animation:blink 1s step-end infinite;vertical-align:text-bottom;box-shadow:0 0 6px var(--green)}
@keyframes blink{50%{opacity:0}}
.conn-indicators{display:flex;gap:8px;margin-top:8px}
.conn-pip{display:flex;align-items:center;gap:4px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.06em;padding:2px 7px;border-radius:3px;border:1px solid var(--border)}
.conn-pip.ok  {color:var(--green);border-color:rgba(0,255,136,.2);background:rgba(0,255,136,.06)}
.conn-pip.bad {color:var(--red);border-color:rgba(255,59,59,.2);background:rgba(255,59,59,.06)}
.conn-pip.unk {color:var(--dim);border-color:var(--border)}
.conn-pip .dot{width:6px;height:6px;border-radius:50%}
.conn-pip.ok  .dot{background:var(--green);box-shadow:0 0 4px var(--green);animation:pulse 2s ease-in-out infinite}
.conn-pip.bad .dot{background:var(--red)}
.conn-pip.unk .dot{background:var(--dim)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
nav{padding:10px 10px;flex:1}
.nav-section{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;color:var(--dim);letter-spacing:.15em;text-transform:uppercase;padding:12px 10px 4px}
nav a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;text-decoration:none;color:var(--muted);font-size:13px;font-weight:500;transition:all .12s;margin-bottom:1px;border:1px solid transparent;cursor:pointer}
nav a:hover{color:var(--green);background:rgba(0,255,136,.05);border-color:rgba(0,255,136,.15)}
nav a.active{color:var(--green);background:rgba(0,255,136,.08);border-color:rgba(0,255,136,.2);box-shadow:inset 3px 0 0 var(--green)}
.sidebar-footer{padding:12px 16px;border-top:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);display:flex;align-items:center;justify-content:space-between}
main{padding:30px 34px;overflow-y:auto;min-width:0}

/* Log panel */
.log-panel{background:var(--bg2);border-left:1px solid var(--border);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;width:var(--log-w);overflow:hidden;transform:translateX(100%);transition:transform .25s}
.layout.log-open .log-panel{transform:translateX(0)}
.log-header{padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.log-title{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--green);letter-spacing:.1em;display:flex;align-items:center;gap:8px}
.log-actions{display:flex;gap:6px}
.log-btn{background:none;border:1px solid var(--border2);border-radius:4px;color:var(--muted);font-size:11px;font-family:'JetBrains Mono',monospace;padding:3px 8px;cursor:pointer;transition:all .12s}
.log-btn:hover{color:var(--text);background:rgba(255,255,255,.05)}
.log-entries{flex:1;overflow-y:auto;padding:6px 0}
.log-entry{padding:5px 14px;border-bottom:1px solid rgba(30,45,61,.5);font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.5}
.log-entry .ts{color:var(--dim);margin-right:5px}
.log-entry .icon{margin-right:3px}
.log-entry .msg{color:var(--text)}
.log-entry.success .msg{color:var(--green)}
.log-entry.error   .msg{color:var(--red)}
.log-entry.warning .msg{color:var(--yellow)}
.log-entry.send    .msg{color:var(--cyan)}
.log-entry.save    .msg{color:var(--orange)}
.log-entry.import  .msg{color:#c084fc}
.log-empty{color:var(--dim);font-family:'JetBrains Mono',monospace;font-size:11px;padding:20px 14px}
.log-toggle-btn{background:rgba(0,255,136,.1);border:1px solid rgba(0,255,136,.25);border-radius:5px;color:var(--green);font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;padding:5px 10px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s}
.log-toggle-btn:hover{background:rgba(0,255,136,.18)}
.log-badge{background:var(--red);color:white;border-radius:99px;font-size:9px;padding:1px 5px;min-width:16px;text-align:center;display:none}
.log-badge.show{display:inline-block}

/* Page header */
.page-title{font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:700;color:var(--green);text-shadow:0 0 20px rgba(0,255,136,.3);margin-bottom:6px;display:flex;align-items:center;gap:10px}
.page-title::before{content:'> ';color:var(--dim)}
.breadcrumb{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:22px}

/* Stats */
.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:26px}
.stat{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px;text-align:center;position:relative;overflow:hidden}
.stat::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.stat.fb::before     {background:var(--fb);box-shadow:0 0 8px var(--fb)}
.stat.xp::before     {background:var(--x)}
.stat.sent::before   {background:var(--green);box-shadow:0 0 8px var(--green)}
.stat.pend::before   {background:var(--yellow);box-shadow:0 0 8px var(--yellow)}
.stat.fail::before   {background:var(--red);box-shadow:0 0 8px var(--red)}
.stat .val{font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:700;line-height:1}
.stat.fb   .val{color:var(--fb);text-shadow:0 0 12px rgba(74,158,255,.4)}
.stat.xp   .val{color:var(--x)}
.stat.sent .val{color:var(--green);text-shadow:0 0 12px rgba(0,255,136,.4)}
.stat.pend .val{color:var(--yellow);text-shadow:0 0 12px rgba(255,215,0,.4)}
.stat.fail .val{color:var(--red);text-shadow:0 0 12px rgba(255,59,59,.4)}
.stat .lbl{font-size:10px;color:var(--muted);margin-top:5px;font-family:'JetBrains Mono',monospace}

/* Cards */
.card{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:20px;margin-bottom:16px}
.card-title{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:var(--cyan);letter-spacing:.08em;text-transform:uppercase;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.card-title::before{content:'//';color:var(--dim);margin-right:2px}

/* Platform cards */
.platform-cards{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.platform-card{background:var(--panel);border-radius:10px;overflow:hidden}
.platform-card.fb-card{border:1px solid rgba(74,158,255,.25)}
.platform-card.x-card {border:1px solid rgba(231,233,234,.15)}
.pc-header{padding:16px 20px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.pc-header.fb{background:rgba(74,158,255,.07)}
.pc-header.x {background:rgba(231,233,234,.04)}
.pc-title{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px}
.pc-title.fb{color:var(--fb)}
.pc-title.x {color:var(--x)}
.pc-status{font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 9px;border-radius:4px;display:flex;align-items:center;gap:5px}
.pc-status .dot{width:6px;height:6px;border-radius:50%}
.pc-status.ok  {background:rgba(0,255,136,.1);color:var(--green);border:1px solid rgba(0,255,136,.25)}
.pc-status.ok  .dot{background:var(--green);box-shadow:0 0 4px var(--green);animation:pulse 2s ease-in-out infinite}
.pc-status.bad {background:rgba(255,59,59,.1);color:var(--red);border:1px solid rgba(255,59,59,.25)}
.pc-status.bad .dot{background:var(--red)}
.pc-status.unk {background:rgba(100,100,100,.08);color:var(--muted);border:1px solid var(--border)}
.pc-status.unk .dot{background:var(--dim)}
.pc-body{padding:18px 20px}
.pc-steps{list-style:none;margin-bottom:16px}
.pc-steps li{display:flex;gap:12px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--text)}
.pc-steps li:last-child{border-bottom:none}
.step-num{font-family:'JetBrains Mono',monospace;font-weight:700;min-width:20px;font-size:10px}
.fb-card .step-num{color:var(--fb)}
.x-card  .step-num{color:var(--x)}
.pc-steps li a{color:var(--cyan);font-size:12px}
.pc-warning{font-size:11px;font-family:'JetBrains Mono',monospace;padding:8px 12px;border-radius:5px;margin-bottom:14px}
.pc-warning.yellow{background:rgba(255,215,0,.07);border:1px solid rgba(255,215,0,.2);color:var(--yellow)}
.pc-warning.cyan  {background:rgba(0,212,255,.07);border:1px solid rgba(0,212,255,.2);color:var(--cyan)}
.pc-fields{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
.pc-field{display:flex;flex-direction:column;gap:4px}
.pc-field label{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;display:flex;align-items:center;justify-content:space-between}
.fb-card .pc-field label{color:var(--fb)}
.x-card  .pc-field label{color:var(--x)}
.pc-field input{background:var(--bg3);border:1px solid var(--border2);border-radius:5px;color:var(--text);padding:7px 10px;font-size:12px;font-family:'JetBrains Mono',monospace;outline:none;transition:border .12s;width:100%}
.pc-field input:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(0,255,136,.1)}
.field-set  {font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--green)}
.field-unset{font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--red)}
.pc-actions{display:flex;gap:8px;flex-wrap:wrap}
.test-result{font-family:'JetBrains Mono',monospace;font-size:11px;padding:8px 12px;border-radius:5px;margin-top:10px;display:none}
.test-result.ok  {background:rgba(0,255,136,.08);border:1px solid rgba(0,255,136,.2);color:var(--green)}
.test-result.fail{background:rgba(255,59,59,.08);border:1px solid rgba(255,59,59,.2);color:var(--red)}

/* Table */
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{text-align:left;padding:9px 12px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;color:var(--cyan);letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid var(--border2);background:rgba(0,212,255,.03)}
tbody tr{border-bottom:1px solid var(--border);transition:background .1s}
tbody tr:hover{background:rgba(0,255,136,.03)}
tbody td{padding:9px 12px;color:var(--text);vertical-align:middle}
.preview{max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--muted)}

/* Badges */
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.04em}
.badge.facebook{background:rgba(74,158,255,.12);color:var(--fb);border:1px solid rgba(74,158,255,.2)}
.badge.x       {background:rgba(231,233,234,.07);color:var(--x);border:1px solid rgba(231,233,234,.15)}
.badge.sent    {background:rgba(0,255,136,.1);color:var(--green);border:1px solid rgba(0,255,136,.2)}
.badge.pending {background:rgba(255,215,0,.1);color:var(--yellow);border:1px solid rgba(255,215,0,.2)}
.badge.failed  {background:rgba(255,59,59,.1);color:var(--red);border:1px solid rgba(255,59,59,.2)}
.badge.sending {background:rgba(0,212,255,.12);color:var(--cyan);border:1px solid rgba(0,212,255,.3);animation:sendpulse 1s ease-in-out infinite}
@keyframes sendpulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(0,212,255,.4)}50%{opacity:.8;box-shadow:0 0 0 4px rgba(0,212,255,0)}}
.spin{display:inline-block;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid transparent;text-decoration:none;transition:all .12s;font-family:'JetBrains Mono',monospace;letter-spacing:.03em}
.btn-primary{background:rgba(0,255,136,.1);color:var(--green);border-color:rgba(0,255,136,.3)}
.btn-primary:hover{background:rgba(0,255,136,.18);border-color:var(--green);box-shadow:0 0 12px rgba(0,255,136,.2)}
.btn-ghost{background:rgba(255,255,255,.04);color:var(--muted);border-color:var(--border2)}
.btn-ghost:hover{background:rgba(255,255,255,.08);color:var(--text)}
.btn-danger{background:rgba(255,59,59,.08);color:var(--red);border-color:rgba(255,59,59,.2)}
.btn-danger:hover{background:rgba(255,59,59,.16)}
.btn-success{background:rgba(0,255,136,.08);color:var(--green);border-color:rgba(0,255,136,.2)}
.btn-success:hover{background:rgba(0,255,136,.15)}
.btn-cyan{background:rgba(0,212,255,.08);color:var(--cyan);border-color:rgba(0,212,255,.2)}
.btn-cyan:hover{background:rgba(0,212,255,.15)}
.btn-fb{background:rgba(74,158,255,.1);color:var(--fb);border-color:rgba(74,158,255,.25)}
.btn-fb:hover{background:rgba(74,158,255,.18)}
.btn-purple{background:rgba(192,132,252,.1);color:#c084fc;border-color:rgba(192,132,252,.25)}
.btn-purple:hover{background:rgba(192,132,252,.18)}
.btn-sm{padding:4px 10px;font-size:11px}
.actions{display:flex;gap:5px;align-items:center}

/* Forms */
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.form-group{display:flex;flex-direction:column;gap:6px}
.form-group.full{grid-column:1/-1}
label{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;color:var(--cyan);letter-spacing:.1em;text-transform:uppercase}
input,select,textarea{background:var(--bg3);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:8px 12px;font-size:13px;font-family:'JetBrains Mono',monospace;outline:none;transition:border .12s}
input:focus,select:focus,textarea:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(0,255,136,.1)}
textarea{resize:vertical;min-height:100px}
select option{background:var(--bg3)}
.hint{font-size:11px;color:var(--dim);font-family:'JetBrains Mono',monospace}

/* Alerts */
.alert{padding:11px 15px;border-radius:6px;font-size:13px;margin-bottom:16px;font-family:'JetBrains Mono',monospace}
.alert-success{background:rgba(0,255,136,.07);border:1px solid rgba(0,255,136,.2);color:var(--green)}
.alert-error  {background:rgba(255,59,59,.07);border:1px solid rgba(255,59,59,.2);color:var(--red)}
.alert-info   {background:rgba(0,212,255,.07);border:1px solid rgba(0,212,255,.2);color:var(--cyan)}
.alert-warning{background:rgba(255,215,0,.07);border:1px solid rgba(255,215,0,.2);color:var(--yellow)}

/* Filters */
.filters{display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.filter-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:.08em}
.filter-btn{padding:4px 11px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid var(--border2);background:transparent;color:var(--muted);transition:all .12s;font-family:'JetBrains Mono',monospace}
.filter-btn.active,.filter-btn:hover{background:rgba(0,255,136,.08);border-color:rgba(0,255,136,.3);color:var(--green)}

/* Tags */
.tag{display:inline-block;padding:2px 6px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;margin-left:3px}
.tag-thread{background:rgba(255,123,53,.15);color:var(--orange);border:1px solid rgba(255,123,53,.25)}
.tag-link  {background:rgba(74,158,255,.12);color:var(--fb);border:1px solid rgba(74,158,255,.2)}

/* Modal */
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto;backdrop-filter:blur(2px)}
.modal-overlay.open{display:flex}
.modal{background:var(--panel);border:1px solid var(--border2);border-radius:10px;padding:26px;width:680px;max-width:96vw;box-shadow:0 0 40px rgba(0,255,136,.08)}
.modal-title{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--green);margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
.modal-close{background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;line-height:1}
.modal-close:hover{color:var(--red)}

/* Import table */
.import-table{width:100%;border-collapse:collapse;font-size:12px;font-family:'JetBrains Mono',monospace}
.import-table th{text-align:left;padding:7px 10px;color:var(--cyan);font-size:10px;letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--border2);background:rgba(0,212,255,.03)}
.import-table td{padding:7px 10px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:top}
.import-table tr:hover td{background:rgba(0,255,136,.02)}
.import-table .cell-preview{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)}
.import-table .row-err td{background:rgba(255,59,59,.05);color:var(--red)}
.row-check{width:16px;height:16px;accent-color:var(--green);cursor:pointer}

/* Upload zone */
.upload-zone{border:2px dashed var(--border2);border-radius:10px;padding:40px;text-align:center;transition:all .2s;cursor:pointer;position:relative}
.upload-zone:hover,.upload-zone.drag{border-color:var(--green);background:rgba(0,255,136,.04)}
.upload-zone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.upload-zone .uz-icon{font-size:36px;margin-bottom:10px}
.upload-zone .uz-label{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--muted);margin-bottom:4px}
.upload-zone .uz-hint{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim)}

/* Misc */
code{background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:1px 6px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--orange)}
.divider{border:none;border-top:1px solid var(--border);margin:18px 0}
.status-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.status-dot.on{background:var(--green);box-shadow:0 0 6px var(--green);animation:pulse 2s ease-in-out infinite}
.page-section{display:none}
.page-section.active{display:block}
</style>
</head>
<body>

<!-- Auth gate -->
<div id="auth-gate">
  <div class="auth-card">
    <div class="auth-logo">CLOCKWORKS SOCIAL<span class="logo-blink"></span></div>
    <div class="auth-sub">// CAMPAIGN MANAGER v2</div>
    <button class="btn btn-primary" id="sign-in-btn" style="width:100%;justify-content:center">
      Sign in with Google
    </button>
    <div class="auth-err" id="auth-err">Not authorized.</div>
  </div>
</div>

<!-- Main app -->
<div id="app" class="hidden">
  <div class="layout" id="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-name">CLOCKWORKS<span class="logo-blink"></span></div>
        <div class="logo-sub">// SOCIAL MANAGER</div>
        <div class="conn-indicators">
          <div class="conn-pip unk" id="pip-fb"><div class="dot"></div>FB</div>
          <div class="conn-pip unk" id="pip-x"><div class="dot"></div>X</div>
        </div>
      </div>
      <nav>
        <div class="nav-section">Dashboard</div>
        <a data-page="dashboard" class="active">📊 Overview</a>
        <div class="nav-section">Schedule</div>
        <a data-page="facebook">🔵 Facebook</a>
        <a data-page="x">🐦 X / Twitter</a>
        <div class="nav-section">System</div>
        <a data-page="credentials">🔑 Credentials</a>
        <a data-page="import">📥 Import CSV</a>
      </nav>
      <div class="sidebar-footer">
        <span id="scheduler-status">⏰ scheduler running</span>
        <button class="log-toggle-btn" id="log-toggle">
          LOG <span class="log-badge" id="log-badge">0</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main>
      <!-- Dashboard page -->
      <div class="page-section active" id="page-dashboard">
        <div class="page-title">Overview</div>
        <div class="breadcrumb">clockworks / social / dashboard</div>
        <div class="stats">
          <div class="stat fb" ><div class="val" id="stat-fb">—</div><div class="lbl">Facebook</div></div>
          <div class="stat xp" ><div class="val" id="stat-x">—</div><div class="lbl">X Posts</div></div>
          <div class="stat sent"><div class="val" id="stat-sent">—</div><div class="lbl">Sent</div></div>
          <div class="stat pend"><div class="val" id="stat-pend">—</div><div class="lbl">Pending</div></div>
          <div class="stat fail"><div class="val" id="stat-fail">—</div><div class="lbl">Failed</div></div>
        </div>
        <div id="dashboard-posts-container"></div>
      </div>

      <!-- Facebook page -->
      <div class="page-section" id="page-facebook">
        <div class="page-title">Facebook</div>
        <div class="breadcrumb">clockworks / social / facebook</div>
        <div id="fb-form-container"></div>
        <div id="fb-list-container"></div>
      </div>

      <!-- X page -->
      <div class="page-section" id="page-x">
        <div class="page-title">X / Twitter</div>
        <div class="breadcrumb">clockworks / social / x</div>
        <div id="x-form-container"></div>
        <div id="x-list-container"></div>
      </div>

      <!-- Credentials page -->
      <div class="page-section" id="page-credentials">
        <div class="page-title">Credentials</div>
        <div class="breadcrumb">clockworks / social / credentials</div>
        <div id="credentials-container"></div>
      </div>

      <!-- Import page -->
      <div class="page-section" id="page-import">
        <div class="page-title">Import CSV</div>
        <div class="breadcrumb">clockworks / social / import</div>
        <div id="import-container"></div>
      </div>
    </main>

    <!-- Log panel -->
    <div class="log-panel" id="log-panel">
      <div class="log-header">
        <div class="log-title">⚡ ACTIVITY LOG</div>
        <div class="log-actions">
          <button class="log-btn" id="log-clear-btn">CLEAR</button>
          <button class="log-btn" id="log-close-btn">✕</button>
        </div>
      </div>
      <div class="log-entries" id="log-entries">
        <div class="log-empty">No activity yet.</div>
      </div>
    </div>
  </div>
</div>

<script type="module" src="js/auth.js"></script>
<script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/index.html
git commit -m "feat: add static UI shell with full CSS and layout"
```

---

## Task 5: App bootstrap (app.js — nav routing, auth wiring)

**Files:**
- Create: `Clockworks/social/public/js/app.js`

- [ ] **Step 1: Write public/js/app.js**

```javascript
// app.js — nav routing and auth wiring
import { auth } from "./firebase-init.js";
import { onAuth, signIn, signOutUser } from "./auth.js";
import { initPosts, renderFbForm, renderXForm, renderDashboardPosts } from "./posts.js";
import { initCredentials } from "./credentials.js";
import { initLogs } from "./logs.js";
import { initImport } from "./csv.js";

const authGate = document.getElementById("auth-gate");
const appEl    = document.getElementById("app");
const signInBtn = document.getElementById("sign-in-btn");
const authErr  = document.getElementById("auth-err");
const layout   = document.getElementById("layout");
const logToggle  = document.getElementById("log-toggle");
const logCloseBtn = document.getElementById("log-close-btn");
const logClearBtn = document.getElementById("log-clear-btn");

// ── Auth ──────────────────────────────────────────────────────────────────────
signInBtn.addEventListener("click", () => signIn().catch(() => {}));

onAuth((user, err) => {
  if (user) {
    authGate.classList.add("hidden");
    appEl.classList.remove("hidden");
    bootApp();
  } else if (err === "unauthorized") {
    authErr.style.display = "block";
    authErr.textContent = "Not authorized. Contact admin.";
  } else {
    authGate.classList.remove("hidden");
    appEl.classList.add("hidden");
  }
});

// ── Navigation ────────────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
  const section = document.getElementById(`page-${name}`);
  if (section) section.classList.add("active");
  const navLink = document.querySelector(`nav a[data-page="${name}"]`);
  if (navLink) navLink.classList.add("active");
}

document.querySelectorAll("nav a[data-page]").forEach(a => {
  a.addEventListener("click", () => showPage(a.dataset.page));
});

// ── Log panel ─────────────────────────────────────────────────────────────────
logToggle.addEventListener("click", () => {
  layout.classList.toggle("log-open");
  document.getElementById("log-badge").classList.remove("show");
  document.getElementById("log-badge").textContent = "0";
});
logCloseBtn.addEventListener("click", () => layout.classList.remove("log-open"));
logClearBtn.addEventListener("click", () => {
  document.getElementById("log-entries").innerHTML = '<div class="log-empty">Log cleared.</div>';
});

// ── Boot ──────────────────────────────────────────────────────────────────────
let booted = false;
function bootApp() {
  if (booted) return;
  booted = true;
  initPosts();
  initCredentials();
  initLogs();
  initImport();
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/app.js
git commit -m "feat: add app bootstrap with nav routing and auth wiring"
```

---

## Task 6: Posts module (posts.js)

**Files:**
- Create: `Clockworks/social/public/js/posts.js`

- [ ] **Step 1: Write public/js/posts.js**

```javascript
// posts.js
import { db } from "./firebase-init.js";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const postsCol = collection(db, "posts");

// ── Helpers ───────────────────────────────────────────────────────────────────
function ctNow() {
  return new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
}

function fmt12h(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr instanceof Timestamp ? isoStr.toDate() : isoStr);
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

function formatCountdown(secs) {
  if (secs <= 0) return "due now";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function statusBadge(status) {
  const icons = { sending: "🚀 ", sent: "", failed: "✕ ", pending: "" };
  return `<span class="badge ${status}">${icons[status] || ""}${status}</span>`;
}

// ── Countdown updater ─────────────────────────────────────────────────────────
const countdownEls = new Map(); // docId → {el, ts}
setInterval(() => {
  countdownEls.forEach(({ el, ts }, id) => {
    const secs = secondsUntil(ts);
    if (secs === null) return;
    el.textContent = secs > 0 ? formatCountdown(secs) : "due now";
  });
}, 1000);

// ── Add post ──────────────────────────────────────────────────────────────────
export async function addPost(data) {
  // data: { platform, text, scheduledDate, scheduledTime, thread?, link? }
  const [year, month, day] = data.scheduledDate.split("-").map(Number);
  const [hour, minute] = data.scheduledTime.split(":").map(Number);
  // Build a Date in CT, then store as UTC Timestamp
  const ctDate = new Date(
    new Date(`${data.scheduledDate}T${data.scheduledTime}:00`).toLocaleString("en-US", { timeZone: "America/Chicago" })
  );
  // Re-parse to get UTC
  const scheduledAt = Timestamp.fromDate(new Date(ctDate.getTime()));

  const post = {
    platform: data.platform,
    text: data.text,
    scheduled_at: scheduledAt,
    status: "pending",
    created_at: serverTimestamp(),
  };
  if (data.link) post.link = data.link;
  if (data.thread && data.thread.length > 0) post.thread = [data.text, ...data.thread];

  return addDoc(postsCol, post);
}

export async function deletePost(id) {
  return deleteDoc(doc(db, "posts", id));
}

// ── Render post row ───────────────────────────────────────────────────────────
function postRow(id, post) {
  const secs = secondsUntil(post.scheduled_at);
  const countdownId = `cd-${id}`;
  const countdownHtml = post.status === "pending" && secs !== null
    ? `<span id="${countdownId}" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)">${formatCountdown(secs)}</span>`
    : "";

  if (post.status === "pending" && secs !== null) {
    setTimeout(() => {
      const el = document.getElementById(countdownId);
      if (el) countdownEls.set(id, { el, ts: post.scheduled_at });
    }, 0);
  }

  const threadTag = post.thread ? `<span class="tag tag-thread">THREAD</span>` : "";
  const linkTag   = post.link   ? `<span class="tag tag-link">LINK</span>` : "";

  return `
    <tr>
      <td>${statusBadge(post.status)}</td>
      <td><span class="badge ${post.platform}">${post.platform === "facebook" ? "🔵 Facebook" : "🐦 X"}</span></td>
      <td><div class="preview">${post.text || ""}${threadTag}${linkTag}</div></td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:12px;white-space:nowrap">${fmt12h(post.scheduled_at)}</td>
      <td>${countdownHtml}</td>
      <td>
        <div class="actions">
          <button class="btn btn-danger btn-sm" onclick="window.__deletePost('${id}')">Delete</button>
        </div>
      </td>
    </tr>`;
}

// ── Table renderer ────────────────────────────────────────────────────────────
function renderTable(containerId, posts, filterPlatform) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const filtered = filterPlatform
    ? posts.filter(p => p.platform === filterPlatform)
    : posts;

  if (!filtered.length) {
    container.innerHTML = `<div class="alert alert-info">No posts scheduled.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="card-title">Scheduled Posts</div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Status</th><th>Platform</th><th>Content</th>
            <th>Scheduled (CT)</th><th>Countdown</th><th>Actions</th>
          </tr></thead>
          <tbody>${filtered.map(({id, ...post}) => postRow(id, post)).join("")}</tbody>
        </table>
      </div>
    </div>`;
}

// ── Form renderer ─────────────────────────────────────────────────────────────
function renderForm(containerId, platform) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const isFb = platform === "facebook";
  const accent = isFb ? "var(--fb)" : "var(--x)";
  const label  = isFb ? "🔵 Facebook Post" : "🐦 X Post / Thread";

  container.innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <div class="card-title">${label}</div>
      <div class="form-grid" id="form-${platform}">
        <div class="form-group">
          <label>Scheduled Date</label>
          <input type="date" id="${platform}-date">
        </div>
        <div class="form-group">
          <label>Scheduled Time (CT)</label>
          <input type="time" id="${platform}-time">
        </div>
        <div class="form-group full">
          <label>${isFb ? "Post Text" : "First Tweet"}</label>
          <textarea id="${platform}-text" rows="4" placeholder="Write your post..."></textarea>
        </div>
        ${isFb ? `
        <div class="form-group full">
          <label>First Comment Link <span style="color:var(--dim)">(optional)</span></label>
          <input type="url" id="facebook-link" placeholder="https://...">
        </div>` : `
        <div class="form-group full">
          <label>Thread Tweets <span style="color:var(--dim)">(optional — one per line)</span></label>
          <textarea id="x-thread" rows="4" placeholder="Tweet 2&#10;Tweet 3&#10;Tweet 4"></textarea>
          <div class="hint">Leave blank for a single tweet.</div>
        </div>`}
        <div class="form-group full">
          <button class="btn btn-primary" id="submit-${platform}">+ Schedule Post</button>
          <div id="form-${platform}-msg" style="margin-top:10px"></div>
        </div>
      </div>
    </div>`;

  document.getElementById(`submit-${platform}`).addEventListener("click", async () => {
    const date = document.getElementById(`${platform}-date`).value;
    const time = document.getElementById(`${platform}-time`).value;
    const text = document.getElementById(`${platform}-text`).value.trim();
    const msgEl = document.getElementById(`form-${platform}-msg`);

    if (!date || !time || !text) {
      msgEl.innerHTML = `<div class="alert alert-error">Date, time, and text are required.</div>`;
      return;
    }

    const data = { platform, text, scheduledDate: date, scheduledTime: time };
    if (isFb) {
      const link = document.getElementById("facebook-link").value.trim();
      if (link) data.link = link;
    } else {
      const threadRaw = document.getElementById("x-thread").value.trim();
      if (threadRaw) data.thread = threadRaw.split("\n").map(s => s.trim()).filter(Boolean);
    }

    try {
      await addPost(data);
      msgEl.innerHTML = `<div class="alert alert-success">Post scheduled!</div>`;
      document.getElementById(`${platform}-text`).value = "";
      if (isFb) document.getElementById("facebook-link").value = "";
      else document.getElementById("x-thread").value = "";
      setTimeout(() => { msgEl.innerHTML = ""; }, 3000);
    } catch (e) {
      msgEl.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
    }
  });
}

// ── Stats updater ─────────────────────────────────────────────────────────────
function updateStats(posts) {
  const count = (fn) => posts.filter(fn).length;
  document.getElementById("stat-fb").textContent   = count(p => p.platform === "facebook");
  document.getElementById("stat-x").textContent    = count(p => p.platform === "x");
  document.getElementById("stat-sent").textContent = count(p => p.status === "sent");
  document.getElementById("stat-pend").textContent = count(p => p.status === "pending");
  document.getElementById("stat-fail").textContent = count(p => p.status === "failed");
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initPosts() {
  // Wire delete globally
  window.__deletePost = async (id) => {
    if (confirm("Delete this post?")) {
      await deletePost(id).catch(console.error);
    }
  };

  // Render forms
  renderForm("fb-form-container",  "facebook");
  renderForm("x-form-container",   "x");

  // Live subscription
  const q = query(postsCol, orderBy("scheduled_at", "asc"));
  onSnapshot(q, (snap) => {
    countdownEls.clear();
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats(posts);
    renderTable("dashboard-posts-container", posts, null);
    renderTable("fb-list-container",         posts, "facebook");
    renderTable("x-list-container",          posts, "x");
  }, (err) => console.warn("posts listener error:", err));
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/posts.js
git commit -m "feat: add posts module with live Firestore subscription, forms, and countdown timers"
```

---

## Task 7: Credentials module (credentials.js)

**Files:**
- Create: `Clockworks/social/public/js/credentials.js`

- [ ] **Step 1: Write public/js/credentials.js**

```javascript
// credentials.js
import { db } from "./firebase-init.js";
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CRED_DOC  = doc(db, "social_credentials", "config");
const CONN_DOC  = doc(db, "social_status", "connection");

const BULLETS = "••••••••••••";

function masked(val) {
  if (!val) return "";
  return BULLETS;
}

function fieldRow(id, labelText, saved) {
  return `
    <div class="pc-field">
      <label>${labelText}
        <span class="${saved ? 'field-set' : 'field-unset'}">${saved ? "● SET" : "○ NOT SET"}</span>
      </label>
      <input type="password" id="${id}" placeholder="${saved ? BULLETS : "Enter value..."}"
             autocomplete="off">
    </div>`;
}

function statusEl(conn, platform) {
  if (!conn) return `<div class="pc-status unk"><div class="dot"></div>NOT TESTED</div>`;
  if (conn.ok)  return `<div class="pc-status ok"><div class="dot"></div>${conn.msg || "CONNECTED"}</div>`;
  return `<div class="pc-status bad"><div class="dot"></div>${conn.msg || "ERROR"}</div>`;
}

function renderCredentials(creds, conn) {
  const container = document.getElementById("credentials-container");
  if (!container) return;

  container.innerHTML = `
    <div class="platform-cards">
      <!-- Facebook -->
      <div class="platform-card fb-card">
        <div class="pc-header fb">
          <div class="pc-title fb">🔵 Facebook Page</div>
          <div id="fb-conn-status">${statusEl(conn?.facebook, "facebook")}</div>
        </div>
        <div class="pc-body">
          <div class="pc-warning yellow">
            ⚠ Use a <strong>Page Access Token</strong> — not a User token.
            Page tokens never expire if generated correctly. See docs below.
          </div>
          <div class="pc-fields">
            ${fieldRow("fb-token",   "Page Access Token", !!creds?.fb_page_access_token)}
            ${fieldRow("fb-page-id", "Page ID",           !!creds?.fb_page_id)}
          </div>
          <div class="pc-actions">
            <button class="btn btn-fb btn-sm" id="save-fb-btn">💾 Save</button>
          </div>
          <div id="fb-save-msg" style="margin-top:8px"></div>
        </div>
      </div>

      <!-- X -->
      <div class="platform-card x-card">
        <div class="pc-header x">
          <div class="pc-title x">🐦 X / Twitter</div>
          <div id="x-conn-status">${statusEl(conn?.x, "x")}</div>
        </div>
        <div class="pc-body">
          <div class="pc-warning cyan">
            ℹ API v2 credentials required. Needs Basic or Pro tier for posting access.
          </div>
          <div class="pc-fields">
            ${fieldRow("x-api-key",    "API Key",              !!creds?.x_api_key)}
            ${fieldRow("x-api-secret", "API Secret",           !!creds?.x_api_secret)}
            ${fieldRow("x-acc-token",  "Access Token",         !!creds?.x_access_token)}
            ${fieldRow("x-acc-secret", "Access Token Secret",  !!creds?.x_access_token_secret)}
            ${fieldRow("x-bearer",     "Bearer Token",         !!creds?.x_bearer_token)}
          </div>
          <div class="pc-actions">
            <button class="btn btn-ghost btn-sm" id="save-x-btn">💾 Save</button>
          </div>
          <div id="x-save-msg" style="margin-top:8px"></div>
        </div>
      </div>
    </div>

    <!-- Token guide -->
    <div class="card">
      <div class="card-title">Facebook Page Access Token — Setup Guide</div>
      <ol style="padding-left:20px;line-height:2;font-size:13px;color:var(--text)">
        <li>Go to <a href="https://developers.facebook.com/tools/explorer" target="_blank" style="color:var(--cyan)">Graph API Explorer</a></li>
        <li>Select your app → Generate Access Token (short-lived User Token, ~1 hr)</li>
        <li>Click <strong>Open in Access Token Tool</strong> → <strong>Extend Access Token</strong> (long-lived User Token, ~60 days)</li>
        <li>Back in Explorer, call: <code>GET /me/accounts</code> with the long-lived token</li>
        <li>Find your Page in the response → copy its <code>access_token</code> value</li>
        <li>This <strong>Page Access Token never expires</strong> (until password change or app revoke)</li>
        <li>Required permissions: <code>pages_manage_posts</code>, <code>pages_read_engagement</code></li>
        <li>Verify at <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" style="color:var(--cyan)">Access Token Debugger</a> — confirm Type: Page, Expires: Never</li>
      </ol>
    </div>`;

  // Save Facebook
  document.getElementById("save-fb-btn").addEventListener("click", async () => {
    const token   = document.getElementById("fb-token").value.trim();
    const page_id = document.getElementById("fb-page-id").value.trim();
    const msgEl   = document.getElementById("fb-save-msg");
    const update  = {};
    if (token)   update.fb_page_access_token = token;
    if (page_id) update.fb_page_id = page_id;
    if (!Object.keys(update).length) {
      msgEl.innerHTML = `<div class="alert alert-warning">Enter at least one value to save.</div>`;
      return;
    }
    try {
      await setDoc(CRED_DOC, update, { merge: true });
      msgEl.innerHTML = `<div class="alert alert-success">Saved. Scheduler will auto-reload credentials.</div>`;
      document.getElementById("fb-token").value = "";
      document.getElementById("fb-page-id").value = "";
      setTimeout(() => { msgEl.innerHTML = ""; }, 4000);
    } catch (e) {
      msgEl.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
    }
  });

  // Save X
  document.getElementById("save-x-btn").addEventListener("click", async () => {
    const fields = {
      x_api_key:             document.getElementById("x-api-key").value.trim(),
      x_api_secret:          document.getElementById("x-api-secret").value.trim(),
      x_access_token:        document.getElementById("x-acc-token").value.trim(),
      x_access_token_secret: document.getElementById("x-acc-secret").value.trim(),
      x_bearer_token:        document.getElementById("x-bearer").value.trim(),
    };
    const msgEl = document.getElementById("x-save-msg");
    const update = Object.fromEntries(Object.entries(fields).filter(([,v]) => v));
    if (!Object.keys(update).length) {
      msgEl.innerHTML = `<div class="alert alert-warning">Enter at least one value to save.</div>`;
      return;
    }
    try {
      await setDoc(CRED_DOC, update, { merge: true });
      msgEl.innerHTML = `<div class="alert alert-success">Saved. Scheduler will auto-reload credentials.</div>`;
      ["x-api-key","x-api-secret","x-acc-token","x-acc-secret","x-bearer"].forEach(id => {
        document.getElementById(id).value = "";
      });
      setTimeout(() => { msgEl.innerHTML = ""; }, 4000);
    } catch (e) {
      msgEl.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
    }
  });
}

export function initCredentials() {
  let creds = null;
  let conn  = null;

  // Live credentials doc (to show SET/NOT SET indicators)
  onSnapshot(CRED_DOC, (snap) => {
    creds = snap.exists() ? snap.data() : {};
    renderCredentials(creds, conn);
  }, err => console.warn("creds listener:", err));

  // Live connection status (written by scheduler)
  onSnapshot(CONN_DOC, (snap) => {
    conn = snap.exists() ? snap.data() : null;
    // Update sidebar pips
    const pipFb = document.getElementById("pip-fb");
    const pipX  = document.getElementById("pip-x");
    if (pipFb) {
      pipFb.className = `conn-pip ${conn?.facebook?.ok ? "ok" : conn?.facebook?.ok === false ? "bad" : "unk"}`;
      pipFb.innerHTML = `<div class="dot"></div>FB`;
    }
    if (pipX) {
      pipX.className = `conn-pip ${conn?.x?.ok ? "ok" : conn?.x?.ok === false ? "bad" : "unk"}`;
      pipX.innerHTML = `<div class="dot"></div>X`;
    }
    // Re-render credentials page if visible
    renderCredentials(creds, conn);
  }, err => console.warn("conn listener:", err));
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/credentials.js
git commit -m "feat: add credentials module with live status, save to Firestore, and token setup guide"
```

---

## Task 8: Logs module (logs.js)

**Files:**
- Create: `Clockworks/social/public/js/logs.js`

- [ ] **Step 1: Write public/js/logs.js**

```javascript
// logs.js
import { db } from "./firebase-init.js";
import { collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ICON_MAP = {
  info: "ℹ️", success: "✅", error: "❌", warning: "⚠️",
  send: "📤", save: "💾", import: "📥"
};

export function initLogs() {
  const entriesEl = document.getElementById("log-entries");
  const badgeEl   = document.getElementById("log-badge");
  let unseenCount = 0;
  let panelOpen   = false;

  // Track log panel open state
  document.getElementById("log-toggle").addEventListener("click", () => {
    panelOpen = document.getElementById("layout").classList.contains("log-open");
    if (panelOpen) { unseenCount = 0; badgeEl.textContent = "0"; badgeEl.classList.remove("show"); }
  });

  const q = query(
    collection(db, "social_logs"),
    orderBy("ts", "desc"),
    limit(200)
  );

  onSnapshot(q, (snap) => {
    if (snap.empty) {
      entriesEl.innerHTML = '<div class="log-empty">No activity yet.</div>';
      return;
    }

    const entries = snap.docs.map(d => d.data());
    entriesEl.innerHTML = entries.map(e => {
      const ts   = e.ts?.toDate ? e.ts.toDate().toLocaleTimeString("en-US", {
        timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true
      }) : e.ts || "";
      const icon = ICON_MAP[e.level] || "•";
      return `<div class="log-entry ${e.level || ''}">
        <span class="ts">${ts}</span>
        <span class="icon">${icon}</span>
        <span class="msg">${e.msg || ""}</span>
      </div>`;
    }).join("");

    // Badge for unseen entries when panel is closed
    if (!document.getElementById("layout").classList.contains("log-open")) {
      unseenCount++;
      if (unseenCount > 0) {
        badgeEl.textContent = unseenCount > 99 ? "99+" : unseenCount;
        badgeEl.classList.add("show");
      }
    }
  }, err => console.warn("logs listener:", err));
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/logs.js
git commit -m "feat: add live activity log module via Firestore onSnapshot"
```

---

## Task 9: CSV import module (csv.js)

**Files:**
- Create: `Clockworks/social/public/js/csv.js`

- [ ] **Step 1: Write public/js/csv.js**

```javascript
// csv.js
import { addPost } from "./posts.js";

function parseCSVLine(line) {
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "," && !inQuote) { result.push(cur); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row  = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || "").trim(); });
    return row;
  });
}

function rowToPostData(row, platform) {
  const date = row["scheduled_date"] || "";
  const time = row["scheduled_time"] || "";
  const text = row["post_text"] || "";
  if (!date || !time || !text) return null;
  const data = { platform, text, scheduledDate: date, scheduledTime: time };
  if (platform === "facebook" && row["first_comment"]) data.link = row["first_comment"];
  if (platform === "x" && row["thread_tweets"]) {
    const extras = row["thread_tweets"].split("|").map(s => s.trim()).filter(Boolean);
    if (extras.length) data.thread = extras;
  }
  return data;
}

function renderImportUI(platform) {
  const container = document.getElementById("import-container");
  if (!container) return;

  container.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Download Templates</div>
      <div style="display:flex;gap:12px">
        <a class="btn btn-fb btn-sm" href="templates/facebook-template.csv" download>⬇ Facebook Template</a>
        <a class="btn btn-ghost btn-sm" href="templates/x-template.csv" download>⬇ X Template</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Import CSV</div>
      <div style="display:flex;gap:10px;margin-bottom:16px">
        <button class="btn btn-fb btn-sm ${platform==='facebook'?'btn-primary':''}" id="tab-fb-import">🔵 Facebook</button>
        <button class="btn btn-ghost btn-sm ${platform==='x'?'':''}">🐦 X</button>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:16px">
        <button class="btn btn-fb   btn-sm" id="import-tab-fb">🔵 Facebook CSV</button>
        <button class="btn btn-ghost btn-sm" id="import-tab-x">🐦 X CSV</button>
      </div>
      <div id="import-platform-label" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--cyan);margin-bottom:12px">
        Platform: <strong id="import-plat-name">Facebook</strong>
      </div>
      <div class="upload-zone" id="upload-zone">
        <input type="file" id="csv-file-input" accept=".csv">
        <div class="uz-icon">📥</div>
        <div class="uz-label">Drop CSV file here or click to browse</div>
        <div class="uz-hint">facebook-template.csv or x-template.csv</div>
      </div>
      <div id="import-preview" style="margin-top:16px"></div>
    </div>`;

  let currentPlatform = "facebook";

  function setPlatform(p) {
    currentPlatform = p;
    document.getElementById("import-plat-name").textContent = p === "facebook" ? "Facebook" : "X / Twitter";
  }

  document.getElementById("import-tab-fb").addEventListener("click", () => setPlatform("facebook"));
  document.getElementById("import-tab-x").addEventListener("click",  () => setPlatform("x"));

  const fileInput = document.getElementById("csv-file-input");
  const uploadZone = document.getElementById("upload-zone");

  uploadZone.addEventListener("dragover",  e => { e.preventDefault(); uploadZone.classList.add("drag"); });
  uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag"));
  uploadZone.addEventListener("drop", e => {
    e.preventDefault(); uploadZone.classList.remove("drag");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = e => renderPreview(e.target.result, currentPlatform);
    reader.readAsText(file);
  }

  function renderPreview(csvText, platform) {
    const rows = parseCSV(csvText);
    const previewEl = document.getElementById("import-preview");
    if (!rows.length) {
      previewEl.innerHTML = `<div class="alert alert-error">No rows found in CSV.</div>`;
      return;
    }

    const parsed = rows.map(r => ({ raw: r, data: rowToPostData(r, platform) }));
    const valid = parsed.filter(p => p.data !== null);

    previewEl.innerHTML = `
      <div style="margin-bottom:10px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted)">
        Found <strong style="color:var(--green)">${valid.length}</strong> valid rows.
        ${parsed.length - valid.length > 0 ? `<span style="color:var(--red)">${parsed.length - valid.length} invalid (missing date/time/text).</span>` : ""}
      </div>
      <table class="import-table">
        <thead><tr>
          <th><input type="checkbox" class="row-check" id="check-all"></th>
          <th>Date</th><th>Time</th><th>Content</th>
          ${platform === "facebook" ? "<th>Link</th>" : "<th>Thread</th>"}
        </tr></thead>
        <tbody>
          ${parsed.map((p, i) => p.data ? `
            <tr>
              <td><input type="checkbox" class="row-check import-row-check" data-idx="${i}" checked></td>
              <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${p.data.scheduledDate}</td>
              <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${p.data.scheduledTime}</td>
              <td><div class="cell-preview">${p.data.text}</div></td>
              <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)">
                ${platform === "facebook" ? (p.data.link || "—") : (p.data.thread ? `${p.data.thread.length} tweets` : "—")}
              </td>
            </tr>` : `
            <tr class="row-err">
              <td></td>
              <td colspan="4">Invalid row — missing required fields</td>
            </tr>`
          ).join("")}
        </tbody>
      </table>
      <div style="margin-top:14px;display:flex;gap:10px;align-items:center">
        <button class="btn btn-primary" id="confirm-import-btn">✅ Import Selected</button>
        <span id="import-result" style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--green)"></span>
      </div>`;

    // Select all checkbox
    document.getElementById("check-all").addEventListener("change", e => {
      document.querySelectorAll(".import-row-check").forEach(cb => { cb.checked = e.target.checked; });
    });

    document.getElementById("confirm-import-btn").addEventListener("click", async () => {
      const checked = [...document.querySelectorAll(".import-row-check:checked")].map(cb => parseInt(cb.dataset.idx));
      const toImport = checked.map(i => parsed[i]?.data).filter(Boolean);
      if (!toImport.length) {
        document.getElementById("import-result").textContent = "No rows selected.";
        return;
      }
      const btn = document.getElementById("confirm-import-btn");
      btn.disabled = true;
      btn.textContent = "Importing…";
      let imported = 0, failed = 0;
      for (const data of toImport) {
        try { await addPost(data); imported++; }
        catch { failed++; }
      }
      btn.textContent = "✅ Import Selected";
      btn.disabled = false;
      document.getElementById("import-result").textContent =
        `Imported ${imported} post${imported !== 1 ? "s" : ""}${failed ? `, ${failed} failed` : ""}.`;
    });
  }
}

export function initImport() {
  renderImportUI("facebook");
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/csv.js
git commit -m "feat: add CSV import module with preview, validation, and Firestore write"
```

---

## Task 10: VPS scheduler (scheduler.py)

**Files:**
- Create: `Clockworks/social/scheduler.py`
- Create: `Clockworks/social/requirements-scheduler.txt`

- [ ] **Step 1: Write requirements-scheduler.txt**

```
firebase-admin>=6.0.0
tweepy>=4.15.0
requests>=2.31.0
```

- [ ] **Step 2: Write scheduler.py**

```python
#!/usr/bin/env python3
"""
Clockworks Social Scheduler
Runs on VPS. Reads Firestore every 60s, fires due posts to Facebook and X.
Logs: journalctl -u clockworks-social -f
"""

import os
import sys
import time
import threading
import logging
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import firebase_admin
from firebase_admin import credentials, firestore
import tweepy
import requests

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger("cw-social")

CT = ZoneInfo("America/Chicago")

# ── Firebase init ─────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
KEY_FILE = BASE_DIR / "serviceAccountKey.json"

if not KEY_FILE.exists():
    log.error(f"serviceAccountKey.json not found at {KEY_FILE}")
    sys.exit(1)

cred = credentials.Certificate(str(KEY_FILE))
firebase_admin.initialize_app(cred)
db = firestore.client()

CRED_DOC = db.collection("social_credentials").document("config")
CONN_DOC = db.collection("social_status").document("connection")
LOGS_COL = db.collection("social_logs")
POSTS_COL = db.collection("posts")

# ── State ─────────────────────────────────────────────────────────────────────
_creds: dict = {}
_creds_lock = threading.Lock()

# ── Firestore log ─────────────────────────────────────────────────────────────
ICONS = {
    "info": "ℹ️", "success": "✅", "error": "❌",
    "warning": "⚠️", "send": "📤", "save": "💾"
}

def fslog(level: str, msg: str):
    """Write a log entry to Firestore and stdout."""
    icon = ICONS.get(level, "•")
    log.info(f"[{level.upper()}] {msg}")
    try:
        LOGS_COL.add({
            "ts":    firestore.SERVER_TIMESTAMP,
            "level": level,
            "icon":  icon,
            "msg":   msg,
        })
        # Prune to 200 entries
        _prune_logs()
    except Exception as e:
        log.warning(f"fslog write failed: {e}")

def _prune_logs():
    """Delete oldest log entries beyond 200."""
    try:
        all_logs = list(LOGS_COL.order_by("ts", direction=firestore.Query.DESCENDING).limit(201).stream())
        if len(all_logs) > 200:
            for doc in all_logs[200:]:
                doc.reference.delete()
    except Exception:
        pass

# ── Credential loader ─────────────────────────────────────────────────────────
def load_credentials():
    global _creds
    try:
        snap = CRED_DOC.get()
        with _creds_lock:
            _creds = snap.to_dict() if snap.exists else {}
        log.info("Credentials loaded from Firestore")
    except Exception as e:
        log.error(f"Failed to load credentials: {e}")

def watch_credentials():
    """Listen for credential changes — hot-reload without restart."""
    def on_snapshot(doc_snapshot, changes, read_time):
        global _creds
        for doc in doc_snapshot:
            with _creds_lock:
                _creds = doc.to_dict() if doc.exists else {}
            fslog("save", "Credentials updated — reloading connections")
            test_connections()

    CRED_DOC.on_snapshot(on_snapshot)
    log.info("Watching credentials for changes")

def get_creds() -> dict:
    with _creds_lock:
        return dict(_creds)

# ── Connection tests ──────────────────────────────────────────────────────────
def test_facebook() -> tuple[bool, str]:
    c = get_creds()
    token   = c.get("fb_page_access_token", "")
    page_id = c.get("fb_page_id", "")
    if not token or not page_id:
        return False, "Credentials not set"
    try:
        r = requests.get(
            "https://graph.facebook.com/v19.0/me",
            params={"fields": "name,id", "access_token": token},
            timeout=10,
        )
        data = r.json()
        if "error" in data:
            raise Exception(data["error"].get("message", "API error"))
        return True, f"{data.get('name')} (id={data.get('id')})"
    except Exception as e:
        return False, str(e)

def test_x() -> tuple[bool, str]:
    c = get_creds()
    required = ["x_api_key","x_api_secret","x_access_token","x_access_token_secret","x_bearer_token"]
    missing  = [k for k in required if not c.get(k)]
    if missing:
        return False, f"Missing: {', '.join(missing)}"
    try:
        client = tweepy.Client(
            consumer_key=c["x_api_key"],
            consumer_secret=c["x_api_secret"],
            access_token=c["x_access_token"],
            access_token_secret=c["x_access_token_secret"],
            bearer_token=c["x_bearer_token"],
        )
        me = client.get_me()
        return True, f"@{me.data.username}"
    except Exception as e:
        return False, str(e)

def test_connections():
    ts = datetime.now(CT).strftime("%-I:%M %p")
    fb_ok, fb_msg = test_facebook()
    x_ok,  x_msg  = test_x()
    try:
        CONN_DOC.set({
            "facebook": {"ok": fb_ok, "msg": fb_msg, "ts": ts},
            "x":        {"ok": x_ok,  "msg": x_msg,  "ts": ts},
        })
    except Exception as e:
        log.warning(f"Failed to write connection status: {e}")
    fslog("success" if fb_ok else "error", f"Facebook — {fb_msg}")
    fslog("success" if x_ok  else "error", f"X — {x_msg}")

# ── Platform posting ──────────────────────────────────────────────────────────
def post_to_facebook(text: str, link: str | None = None) -> tuple[bool, str]:
    c = get_creds()
    token = c.get("fb_page_access_token", "")
    if not token:
        return False, "Missing FB_PAGE_ACCESS_TOKEN"
    try:
        r = requests.post(
            "https://graph.facebook.com/v19.0/me/feed",
            data={"message": text, "access_token": token},
            timeout=30,
        )
        body = r.json()
        if "error" in body:
            fb_err = body["error"]
            return False, f"FB {fb_err.get('code')}: {fb_err.get('message')}"
        post_id = body.get("id", "?")
        if link:
            cr = requests.post(
                f"https://graph.facebook.com/v19.0/{post_id}/comments",
                data={"message": link, "access_token": token},
                timeout=15,
            )
            cb = cr.json()
            if "error" in cb:
                fslog("warning", f"First comment failed: {cb['error'].get('message')}")
        return True, f"id={post_id}"
    except Exception as e:
        return False, str(e)

def post_to_x(text: str, thread: list | None = None) -> tuple[bool, str]:
    c = get_creds()
    try:
        client = tweepy.Client(
            consumer_key=c.get("x_api_key"),
            consumer_secret=c.get("x_api_secret"),
            access_token=c.get("x_access_token"),
            access_token_secret=c.get("x_access_token_secret"),
            bearer_token=c.get("x_bearer_token"),
            wait_on_rate_limit=True,
        )
        if thread:
            prev_id = None
            for tweet in thread:
                kwargs = {"text": tweet}
                if prev_id:
                    kwargs["in_reply_to_tweet_id"] = prev_id
                resp    = client.create_tweet(**kwargs)
                prev_id = resp.data["id"]
            return True, f"thread ({len(thread)} tweets)"
        else:
            resp = client.create_tweet(text=text)
            return True, f"id={resp.data['id']}"
    except Exception as e:
        return False, str(e)

# ── Post execution ────────────────────────────────────────────────────────────
def execute_post(doc_ref, post: dict):
    pid = doc_ref.id
    fslog("send", f"🚀 Launching post {pid[:8]}… → {post.get('platform','?')}")

    # Mark sending
    doc_ref.update({"status": "sending"})

    platform = post.get("platform", "")
    text     = post.get("text", "")
    thread   = post.get("thread")
    link     = post.get("link")

    if platform == "facebook":
        ok, msg = post_to_facebook(text, link)
    elif platform == "x":
        ok, msg = post_to_x(text, thread)
    else:
        ok, msg = False, f"Unknown platform: {platform}"

    update = {
        "status":  "sent" if ok else "failed",
        "sent_at": firestore.SERVER_TIMESTAMP,
    }
    if not ok:
        update["error"] = msg
    doc_ref.update(update)

    if ok:
        fslog("success", f"✅ {platform} post live — {msg}")
    else:
        fslog("error", f"❌ {platform} post failed — {msg}")

# ── Scheduler loop ────────────────────────────────────────────────────────────
def fire_due_posts():
    now_utc = datetime.now(timezone.utc)
    try:
        due = (
            POSTS_COL
            .where("status", "==", "pending")
            .where("scheduled_at", "<=", now_utc)
            .stream()
        )
        due_list = [(d.reference, d.to_dict()) for d in due]
    except Exception as e:
        fslog("error", f"Firestore query failed: {e}")
        return

    if not due_list:
        return

    fslog("info", f"⏰ {len(due_list)} post(s) due")

    fb_due = [(ref, p) for ref, p in due_list if p.get("platform") == "facebook"]
    x_due  = [(ref, p) for ref, p in due_list if p.get("platform") == "x"]

    def fire_list(lst, delay=0):
        if delay:
            time.sleep(delay)
        for ref, post in lst:
            execute_post(ref, post)

    if fb_due and x_due:
        t1 = threading.Thread(target=fire_list, args=(fb_due, 0),  daemon=True)
        t2 = threading.Thread(target=fire_list, args=(x_due,  17), daemon=True)
        t1.start(); t2.start()
    elif fb_due:
        threading.Thread(target=fire_list, args=(fb_due,), daemon=True).start()
    elif x_due:
        threading.Thread(target=fire_list, args=(x_due,),  daemon=True).start()

def run():
    log.info("=== Clockworks Social Scheduler starting ===")
    load_credentials()
    watch_credentials()
    test_connections()
    fslog("info", "⏰ Scheduler started (60s loop, Central Time)")

    while True:
        try:
            fire_due_posts()
        except Exception as e:
            fslog("error", f"Scheduler loop error: {e}")
        time.sleep(60)

if __name__ == "__main__":
    run()
```

- [ ] **Step 3: Commit**

```bash
git add scheduler.py requirements-scheduler.txt
git commit -m "feat: add headless VPS scheduler with Firestore integration"
```

---

## Task 11: systemd service

**Files:**
- Create: `Clockworks/social/systemd/clockworks-social.service`

- [ ] **Step 1: Create systemd directory and write unit file**

```bash
mkdir -p ~/Clockworks/social/systemd
```

Write `Clockworks/social/systemd/clockworks-social.service`:

```ini
[Unit]
Description=Clockworks Social Scheduler
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=park
WorkingDirectory=/home/park/Clockworks/social
ExecStart=/home/park/Clockworks/social/venv/bin/python3 scheduler.py
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=clockworks-social

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Commit the unit file**

```bash
git add systemd/
git commit -m "feat: add systemd unit file for clockworks-social scheduler"
```

- [ ] **Step 3: Install on VPS**

```bash
# From Mac: sync files
rsync -av ~/Clockworks/social/ park@76.13.107.170:~/Clockworks/social/

# SSH to VPS and run setup
ssh park@76.13.107.170
```

On VPS:
```bash
cd ~/Clockworks/social
python3 -m venv venv
venv/bin/pip install -r requirements-scheduler.txt

# Install systemd unit
sudo cp systemd/clockworks-social.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable clockworks-social
sudo systemctl start clockworks-social

# Verify
sudo systemctl status clockworks-social
journalctl -u clockworks-social -f
```

Expected output in journal:
```
=== Clockworks Social Scheduler starting ===
Credentials loaded from Firestore
Watching credentials for changes
[INFO] Facebook — ...
[INFO] X — ...
⏰ Scheduler started (60s loop, Central Time)
```

---

## Task 12: Get your UID and update auth + Firestore rules

- [ ] **Step 1: Deploy the UI**

```bash
cd ~/Clockworks/social
firebase deploy --only hosting
```

Expected:
```
✔  hosting[YOUR_PROJECT]: File upload complete
✔  Deploy complete!
Hosting URL: https://YOUR_PROJECT_ID.web.app
```

- [ ] **Step 2: Sign in and get your UID**

1. Open `https://YOUR_PROJECT_ID.web.app`
2. Click "Sign in with Google" — sign in with your Google account
3. You'll see "Not authorized" (expected — allowlist is empty)
4. Go to Firebase Console → Authentication → Users — copy your UID

- [ ] **Step 3: Update auth.js with your UID**

In `public/js/auth.js`, replace `REPLACE_WITH_YOUR_UID`:
```javascript
const ALLOWED_UIDS = ["YOUR_ACTUAL_UID_HERE"];
```

- [ ] **Step 4: Update firestore.rules with your UID**

In `firestore.rules`, replace `REPLACE_WITH_YOUR_UID`:
```
request.auth.uid in ['YOUR_ACTUAL_UID_HERE']
```

- [ ] **Step 5: Deploy both**

```bash
firebase deploy --only hosting,firestore:rules
```

- [ ] **Step 6: Verify end-to-end**

1. Open the app URL, sign in — should land on dashboard
2. Navigate to Credentials — enter FB + X credentials, save
3. Watch the sidebar pips — should turn green within ~60 seconds as scheduler detects the update
4. Schedule a test post for 2 minutes from now
5. Watch the log panel — should show `🚀 Launching post…` then `✅ post live`
6. Check Facebook/X — post should appear

- [ ] **Step 7: Commit**

```bash
git add public/js/auth.js firestore.rules
git commit -m "feat: configure UID allowlist and deploy production build"
```

---

## Quick Reference

**Deploy UI from Mac:**
```bash
cd ~/Clockworks/social && firebase deploy --only hosting
```

**Deploy scheduler from Mac:**
```bash
rsync -av ~/Clockworks/social/scheduler.py park@76.13.107.170:~/Clockworks/social/
ssh park@76.13.107.170 "sudo systemctl restart clockworks-social"
```

**Tail scheduler logs on VPS:**
```bash
journalctl -u clockworks-social -f
```

**Scheduler status:**
```bash
sudo systemctl status clockworks-social
```
