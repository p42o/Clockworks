# Clockworks Social — Firebase Migration Design
**Date:** 2026-03-29
**Status:** Approved

## Overview

Migrate Clockworks Social from a self-hosted Flask app to a split architecture:
- **Firebase Hosting** serves the static web UI (HTML/JS)
- **Firestore** is the shared data layer (posts, credentials, logs, status)
- **VPS headless Python scheduler** reads Firestore and fires posts to Facebook and X

This eliminates all nginx, DNS, SSL, and firewall management while preserving every existing feature.

---

## Architecture

```
Firebase Hosting (static UI)
        │  reads/writes via Firebase JS SDK
        ▼
    Firestore
        │  reads via firebase-admin SDK
        ▼
VPS Python Scheduler (headless, no web server)
        │  posts to
        ├── Facebook Graph API (/me/feed)
        └── X API v2 (tweepy)
```

**Access URL:** `https://<project-id>.web.app` (Firebase default) or custom domain later
**Auth:** Firebase Auth — Google Sign-In, locked to a single authorized Google account (UID allowlist)
**VPS process:** managed by systemd, auto-starts on boot, restarts on crash

---

## Firestore Data Model

### `posts/{auto-id}`
| Field | Type | Values |
|---|---|---|
| `platform` | string | `"facebook"` \| `"x"` |
| `text` | string | Post body |
| `scheduled_at` | Timestamp | When to fire (stored as UTC, displayed as CT) |
| `status` | string | `"pending"` \| `"sending"` \| `"sent"` \| `"failed"` |
| `thread` | array of strings | X thread tweets (X only, optional) |
| `link` | string | URL added as first comment (Facebook only, optional) |
| `created_at` | Timestamp | |
| `sent_at` | Timestamp | Set on success |
| `error` | string | Set on failure |

### `social_credentials/config`
| Field | Type |
|---|---|
| `fb_page_access_token` | string |
| `fb_page_id` | string |
| `x_api_key` | string |
| `x_api_secret` | string |
| `x_access_token` | string |
| `x_access_token_secret` | string |
| `x_bearer_token` | string |

### `social_status/connection`
| Field | Type |
|---|---|
| `facebook` | map: `{ ok: bool, msg: string, ts: string }` |
| `x` | map: `{ ok: bool, msg: string, ts: string }` |

### `social_logs/{auto-id}`
| Field | Type |
|---|---|
| `ts` | Timestamp |
| `level` | string: `"info"` \| `"success"` \| `"error"` \| `"warning"` \| `"send"` \| `"save"` |
| `icon` | string |
| `msg` | string |

Log collection is capped at 200 entries — scheduler prunes oldest on write.

---

## VPS Scheduler (`scheduler.py`)

### Responsibilities
- Read credentials from `social_credentials/config` on startup
- Watch `social_credentials/config` via `on_snapshot` for live credential updates (no restart needed)
- Every 60 seconds: query `posts` where `status == "pending"` and `scheduled_at <= now(UTC)`
- For each due post: update status → `sending`, call platform API, update → `sent` or `failed`
- Write structured log entries to `social_logs`
- Write connection test results to `social_status/connection` on startup and after credential changes

### Platform posting
- **Facebook:** `POST /me/feed` with Page Access Token; optional link posted as first comment
- **X:** tweepy `create_tweet`; thread support via reply chaining

### Systemd service
- Unit file: `/etc/systemd/system/clockworks-social.service`
- User: `park`
- Working directory: `~/Clockworks/social`
- Restart policy: `on-failure`, 5s delay
- Enable: `systemctl enable clockworks-social`
- Logs: `journalctl -u clockworks-social -f`

### VPS dependencies
```
firebase-admin>=6.0.0
tweepy>=4.15.0
requests>=2.31.0
python-dotenv>=1.0.0
```

---

## Firebase Hosting (UI)

### File structure
```
Clockworks/social/public/
  index.html        — main app shell
  js/
    firebase-init.js  — Firebase app + Firestore init
    auth.js           — Google Sign-In, UID allowlist enforcement
    posts.js          — post CRUD, CSV import/export
    scheduler-ui.js   — connection status, live log, sending indicators
  css/
    app.css
```

### Features (all preserved from Flask app)
- Schedule posts (Facebook or X) with date/time picker (CT)
- X thread composer (multi-tweet)
- Facebook optional first-comment link field
- Post list with status badges (pending / sending / sent / failed)
- Countdown timers to next scheduled post
- CSV bulk import (JS parses file, writes to Firestore)
- Platform-specific CSV template download (static files)
- Credentials UI — save FB/X keys to `social_credentials/config`
- Connection status indicators — live via `onSnapshot` on `social_status/connection`
- Activity log — live tail via `onSnapshot` on `social_logs`, last 200 entries
- Animated "sending" badge when post is in-flight

### Auth
- Google Sign-In via Firebase Auth
- On login: check UID against hardcoded allowlist in `auth.js`
- If not authorized: sign out immediately, show error
- All Firestore Security Rules require `request.auth.uid` in allowlist

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthorized() {
      return request.auth != null &&
             request.auth.uid in ['YOUR_UID_HERE'];
    }
    match /{document=**} {
      allow read, write: if isAuthorized();
    }
  }
}
```

---

## Deployment

### Initial setup (one-time)
1. Create Firebase project, enable Hosting + Firestore + Auth (Google provider)
2. `firebase init` in `Clockworks/social/`
3. Deploy UI: `firebase deploy --only hosting`
4. Deploy Firestore rules: `firebase deploy --only firestore:rules`
5. On VPS: `pip install -r requirements-scheduler.txt`
6. Copy `serviceAccountKey.json` to VPS
7. Enable + start systemd service

### Ongoing UI updates (from Mac)
```bash
cd ~/Clockworks/social
firebase deploy --only hosting
```

### Ongoing scheduler updates (from Mac)
```bash
rsync -av ~/Clockworks/social/scheduler.py park@76.13.107.170:~/Clockworks/social/
ssh park@76.13.107.170 "sudo systemctl restart clockworks-social"
```

---

## Facebook Page Access Token — Setup Guide

### What token is needed
A **Page Access Token** — not a User Access Token. This token is tied to your specific Facebook Page and allows posting on its behalf.

### Required permissions
- `pages_manage_posts` — publish posts to the Page
- `pages_read_engagement` — read Page data (needed for token validation)

### How to get a never-expiring token (one-time setup)

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Select your app, click **Generate Access Token** — this gives a short-lived User Token (~1 hour)
3. Click **"Open in Access Token Tool"** → click **"Extend Access Token"** → copy the long-lived User Token (~60 days)
4. In Graph API Explorer, with the long-lived token, call: `GET /me/accounts`
5. In the response, find your Page — copy its `access_token` field
6. This **Page Access Token never expires** (until you change your Facebook password or revoke the app)

### Verifying the token
Paste it into the [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) — confirm:
- Type: `Page`
- Expires: `Never`
- Scopes include: `pages_manage_posts`, `pages_read_engagement`

### If it ever stops working
- You likely changed your Facebook password, which invalidates all tokens
- Repeat the steps above to generate a fresh Page Access Token

---

## Out of Scope
- Scheduling images/media (text posts only for now)
- Instagram integration
- Analytics/reporting
- Multi-user access
