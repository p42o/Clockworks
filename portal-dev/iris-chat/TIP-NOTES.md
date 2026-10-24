# Iris chat phase-1 tip notes — 2026-10-24

## Branches
- Site/client worktree: `/Users/parker/Dev/cw-callfn-prod-2026-10-24` · `iris-chat-phase1-slice-2026-10-24` (rebase onto `origin/main` @ `c5f807b` before Site push)
- Functions Mini SoT: `/Users/parker/Dev/clockworks-portal-v3-local` · `iris-chat-phase1-slice-2026-10-24`

## Flag recipe (committed)
```js
irisChat: Object.freeze({
  enabled: true,
  loggingEnabled: false,
  allowClientIds: Object.freeze(["dev-smoke-apex"]),
  stages: Object.freeze(["*"]),
  showOnHome: true,
  maxMessageChars: 2000,
  bannerVersion: "A",
})
```
`SWAP.shopPass.offered` / billing remain false.

## Client files
- ADD `portal/client/assets/iris-avatar-01.png` (96×96 web chip; full source kept in wire pack)
- ADD `portal/client/lib/irisChat.js`
- ADD `portal/client/screens/iris-chat-card.js`
- CHANGE `portal/client/swap-config.js`, `screens/home.js`, `screens/invite.js`, `client.css`, `lib/api.js`, `index.html` (`?v=iris-chat-phase1`)
- Docs under `portal-dev/iris-chat/`

## Functions files (Mini SoT)
- ADD `portal-dev/functions/lib/irisChat.js`
- ADD `portal-dev/functions/iris-chat/` (Layer A/B + changelog for deploy bundle)
- CHANGE `portal-dev/functions/config.js`, `index.js` (iris callables; optional `IRIS_CHAT_BIND_XAI_SECRET=1`)
- CHANGE `portal/client/swap-config.js` (mirror flags for stage-functions)
- Docs under `portal-dev/iris-chat/`

## Removals
- None. No dead Iris/chat UI drafts found. Left `lib/drafts.js` (intake IndexedDB).

## Invite race
- `completing` flag: `go(#/home)` before `token=null` on setPassword + verify paths.

## Smoke
1. vault_597855 → client Home `#/home`
2. Iris card visible (avatar circle, "I need a human", disclosure)
3. DEV cid `dev-smoke-apex`: transcript writes + `training:false`
4. Non-allowlisted signed-in client: card visible, no transcript writes (handoff Submit still OK)
5. Shop Pass offered still false; Coming soon modal still on Account after rebase

## Blockers / follow-ups
- **XAI_API_KEY** not in Secret Manager yet → stub replies until Apex creates secret + redeploy with `IRIS_CHAT_BIND_XAI_SECRET=1`
- file_search tool shape may need ops tune against live xAI Collections API (collection id wired)
- Privacy v2.0b / Starter Terms customer-visible logging HOLD (Counsel)
- Codex hit usage limit mid-tip (~4:13 PM CT reset); packaging finished by executor from Codex partial

## Deploy posture
- Functions: deploy iris callables when ready (no secret bind first)
- Site: push only after rebase onto `c5f807b` (Coming soon LIVE)
