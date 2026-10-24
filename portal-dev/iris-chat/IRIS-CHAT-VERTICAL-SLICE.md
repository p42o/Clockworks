# Iris chat — first deployable vertical slice

**When:** 2026-10-24 ~1:50 PM CT (America/Chicago)  
**Goal:** Smallest branch tip that proves Home card + waiting message + send echo + dark transcript storage for DEV smoke — **no Site push, no rules deploy, no public remote push, no client contact.**  
**Companion plan:** `IRIS-CHAT-PHASE1-PLAN.md`  
**Counsel:** `/workspace/clockworks/legal/2026-10-24-counsel-iris-portal-chat-logging.md`

## Rolex Layer A/B (ready to wire)

Source of truth (Rolex / Sprocket merge in progress on Layer A):
- `/workspace/clockworks/iris-portal-chat-2026-10-24/LAYER-A-global-personality-and-support.md`
- `/workspace/clockworks/iris-portal-chat-2026-10-24/LAYER-B-per-client-stub.md`

Copies for smoke pack: same filenames under `portal-smoke-2026-10-24/out/`.
Placeholders: `{{CLIENT_CONTEXT_MD}}` / `{{CHANGELOG_ITEMS}}` / `{{TODAY_TIMESTAMP}}`.
Phase-1 changelog: Support file-collection digest (not live scrape) per Layer A.


---

## Slice scope (in)

1. Iris card on client Home (feature-flagged).
2. Server-seeded **waiting message** (changelog digest bullets + probes).
3. Client send → Firestore transcript → **live Chat/Responses (echo only if CF secret missing)** (not live agent yet).
4. Counsel Draft A gate before first send (UI).
5. `swap-config` / Functions flags: `irisChat.*` with DEV `allowClientIds` only.
6. Session → **`cid`** on every callable.

## Slice scope (out)

- Live xAI chat agent wire-up (next tip after this smoke).
- Privacy v2.0b / Starter Terms ship (Counsel drafts ready; Apex tap later).
- Real-client logging enablement (Counsel docs + Apex tap). Widget visibility already = all signed-in stages when enabled.
- Voice Iris / FAQ-v2 / Publish `agent_vFTiMwnvhoQuKLZJ`.
- Shop Pass, billing, customer email/SMS.
- Site FTP, Firebase rules deploy, `git push` to origin.

---

## Suggested git branch + tip

| | |
|---|---|
| **SoT (Mini)** | `/Users/parker/Dev/clockworks-portal-v3-local` · base from current portal tip used for smoke (`ca08bf8` live / local stage `522fbe0` as needed) |
| **Branch** | `iris-chat-phase1-slice-2026-10-24` |
| **Tip message** | `portal(client): Iris Home chat card + waiting greet + send echo (DEV allowlist; logging dark; no Site)` |

Work locally on Mini SoT or box mirror (`/workspace/clockworks/shop-pass-2026-10-24/wt` / portal-dev twin); keep commits **LOCAL ONLY** until Parker/Apex tap.

---

## Files to add

| Path | Purpose |
|---|---|
| `portal/client/lib/irisChat.js` | Flag helpers (`isIrisChatVisible(cid, stageKey)`), disclosure copy constant (Counsel Draft A), digest bullets loader stub |
| `portal/client/screens/iris-chat-card.js` | Renderable card: bubbles, composer, typing, disclosure overlay; exported `mountIrisChatCard(hostEl, ctx)` |
| `portal-dev/iris-chat/IRIS-PERSONALITY.md` | **Stub** global layer (A) — Rolex replaces |
| `portal-dev/iris-chat/CLIENT-BEHIND-SCENES.stub.md` | **Stub** layer (B) template with `{{cid}}` `{{businessName}}` `{{stageKey}}` |
| `portal-dev/iris-chat/changelog-digest.md` | Curated 3 bullets from x.ai/bot/changelog (Oct 22–23 2026) |
| `portal-dev/functions/lib/irisChat.js` | `openSession`, `seedGreeting`, `postClientMessage`, `stubIrisReply`, allowlist + counselGate checks |
| `portal-dev/tests/iris-chat/` (optional same tip) | Unit: flag matrix, allowlist, no-log refuse for non-DEV |

## Files to change

| Path | Change |
|---|---|
| `portal/client/swap-config.js` | Add `irisChat: { enabled, loggingEnabled, allowClientIds, stages, showOnHome, maxMessageChars, bannerVersion }` — committed defaults **OFF** / empty allowlist; smoke branch may set DEV cid |
| `portal-dev/functions/config.js` | Mirror SERVER_FLAGS.irisChat (fail closed) |
| `portal/client/screens/home.js` | After unread banner / before next-step: host `<section data-iris-chat>` and mount card when visible |
| `portal/client/client.css` | `.iris-card`, `.bubble.iris`, `.iris-typing`, `.iris-disclosure`, footer line |
| `portal/client/lib/api.js` | `irisChatOpen()`, `irisChatSend(text)`, `irisChatAckDisclosure()` → callables |
| `portal/client/app.js` or router | No new route required for slice (card on Home only); optional later `#/iris` |
| `portal-dev/functions/index.js` | Export `irisChatOpen`, `irisChatSend`, `irisChatAckDisclosure` callables |

**Rules note:** Slice may use **emulator / Admin SDK writes** from Functions only so production rules stay untouched this tip. If client direct writes are required, that is a **separate** rules tip + Apex tap — prefer Functions-mediated writes for Iris phase 1.

---

## Minimal UI behavior

```
[Home loads]
  → api.irisChatOpen()
  → server: requireClient → cid; if !allowlisted return { visible:false }
  → ensure irisChat/main; if no seededGreetingAt, write Iris waiting message (digest + probes)
  → return { visible, messages[], disclosureNeeded, loggingEnabled }

[Card paints]
  → bubbles (Iris waiting msg with human CT timestamp)
  → if disclosureNeeded: Draft A panel + [Start chat]
  → else: composer enabled

[Start chat]
  → irisChatAckDisclosure() → counselGate event message (system, clientVisible optional)
  → composer unlocks

[Send]
  → optimistic client bubble + typing
  → irisChatSend(text)
  → server writes client msg (if loggingOn for DEV); stub assistant: "Got it — I'm here. (DEV echo)"
  → client paints Iris bubble; clear typing
```

Stub reply must still identify as AI if asked (Counsel FAQ line D). No Shop Pass, no prices beyond pointing to Parker / Messages.

---

## Data writes (dark storage)

```
clients/{cid}/irisChat/main
clients/{cid}/irisChat/main/messages/{autoId}
```

Every message snapshot:
`privacy: { training: false, loggingEnabled: <bool> }`

DEV allowlist ⇒ `loggingEnabled` true even if global `irisChat.loggingEnabled` false.  
Non-allowlisted ⇒ callable returns invisible; **no** writes.

---

## Changelog bullets (seed — verified, not invented)

From https://x.ai/bot/changelog (fetched 2026-10-24):

1. **Vault** (v0.75.5, Oct 23) — save logins, cards, contact info; fill at sign-in/checkout  
2. **Pages** (v0.75.2, Oct 22) — bots build reports/memos/dashboards you edit together  
3. **Email forwarding** (v0.75.5) — forward from bot inbox with original formatting, images, attachments  

Optional fourth: **Video creation** from description or image (v0.75.2).

---

## Flag recipe for DEV smoke only

```js
// LOCAL SMOKE BRANCH ONLY — do not merge enabled:true without Parker stage pick
irisChat: Object.freeze({
  enabled: true,
  loggingEnabled: false,           // global customer logging still off
  allowClientIds: Object.freeze(["<DEV_SMOKE_CID>"]),
  stages: Object.freeze(["*"]),     // Parker 2026-10-24: all signed-in stages
  showOnHome: true,
  maxMessageChars: 2000,
  bannerVersion: "A",
}),
```

Server: `loggingOn = flags.loggingEnabled || allowClientIds.includes(cid)`.

---

## Smoke checklist (DEV client)

1. Allowlisted cid sees card; a second non-allowlisted fixture does not.  
2. Waiting Iris message + today timestamp + 3 changelog bullets.  
3. Disclosure before first send.  
4. Send → echo reply + typing.  
5. Firestore transcript present; `training: false`.  
6. `#/messages` unaffected.  
7. Voice agent untouched.  
8. No Site deploy performed.

---

## What others supply next

| Owner | Need for tip N+1 (live agent) |
|---|---|
| **Rolex** | Real `IRIS-PERSONALITY.md` (support, probes, anti-sales); greet/probe lines |
| **CW Ops** | ~~Create chat agent~~ — superseded: no chat-agent id exists. Supplies APEX-WIRE.md injects + FAQ collection id; Apex wires Chat/Responses — **no Publish on voice** |
| **Sprocket** | Voice-polish waiting message + empty-composer placeholders |
| **Counsel** | Already ruled; review live banner + Privacy v2.0b text when Apex ships legal tip |
| **Theo / Parker** | DEV smoke cid `dev-smoke-apex` for logging allowlist; Apex tap for legal + Site |

---

## Runtime reminder (Parker lock)

```
Browser (client portal)
  → callable irisChatSend (Auth + requireClient → cid)
  → (next tip) api.x.ai Chat/Responses + Layer A + FAQ collection file_search
  ✗ not voice agent_vFTiMwnvhoQuKLZJ
  ✗ not realtime / embed mic
```

---

## Done when

Branch tip builds; Home smoke on DEV client shows waiting message + send echo; transcripts land under `irisChat/`; flags fail closed for everyone else; plan docs in `portal-smoke-2026-10-24/out/` match shipped slice. **Stop before Site push.**
---

## Parker adds 2026-10-24 (via Theo) — phase-1 acceptance criteria

**Handoff — "I need a human"**
- [ ] Always-visible **I need a human** button on the Iris chat card (header/footer, never in an overflow menu; visible before and after disclosure).
- [ ] Click starts an Iris-driven handoff workflow in the transcript (not a dead form):
  1. Iris: no problem, I can get this to Parker.
  2. Iris asks if they want to share anything specific outside the chat context (wording works with or without prior conversation).
  3. On yes (capture text) / no → Iris: "Got it."
  4. Iris asks best reach method: **phone / email / chat / text** + captures the value (prefill from client profile where known).
  5. In-chat **review card**: client identity (name + cid), transcript/context summary, extra notes, preferred method + value, **Submit** (and Edit/Cancel).
  6. **Submit** → handoff record to Parker/ops queue (e.g. `clients/{cid}/irisChat/main/handoffs/{id}`, status `open`). Confirmation copy must **not** promise a time ("he'll call in X"). Fallback phone (763) 296-9777 only until card ships.
- [ ] Copy/flow lines owned by Rolex (Layer A); do not invent alternate script in UI.

**Identity / context**
- [ ] Every Chat/Responses call injects `client_id` + Client name + `first_name` from portal session into `{{CLIENT_CONTEXT_MD}}` (server-resolved, never client-supplied).
- [ ] Login welcome greets by **first name**.
- [ ] Layer B per-client intake MD = **stub hook only** (path wired, empty/name+id content OK). Does not block phase 1.

**Runtime / flags**
- [ ] Cloud Function → `api.x.ai` Chat/Responses, system = Rolex Layer A + injects (`{{CLIENT_CONTEXT_MD}}`, `{{CHANGELOG_ITEMS}}`, `{{TODAY_TIMESTAMP}}` America/Chicago) + FAQ `collection_969359cc-2b41-4df0-8af4-9775a5260e3d` file_search. No chat-agent id; voice Iris untouched.
- [ ] `irisChat.stages = ["*"]` (all signed-in stages). Logging DEV-only (allowlist) until Counsel docs ship.
- [ ] `SWAP.shopPass.offered` / `billing` remain **false**.

**Tidy**
- [ ] Find and remove/clean old portal chat drafts and dead UI while shipping (list removed files/selectors in tip notes).

**Mid-status:** screenshots to Theo once button + review card exist on DEV smoke.

## Eng note — known admin UI bug (invite link)

After `adminCreateInvite` success, `showInviteLink` inserts `#flow-link`, but the Firestore client re-render can wipe it while the `flow-status` note survives. Follow-up tip: persist `lastInviteLink` in `flowNotes` or other re-render-safe state. **Not blocking** if network capture works for smoke.

## Decisions (Apex 2026-10-24 ~1:58 PM CT)
- **Echo stub:** DROP as Done-when. Phase 1 tip wires live Chat/Responses (Parker GO); DEV smoke may use a short stub only if CF secrets missing, then flip.
- **Visibility vs logging:** Widget visible for all signed-in stages (`stages:["*"]`). `allowClientIds` gates **logging/transcript writes only** (DEV), not card visibility.
- **Smoke checklist:** Add handoff button, review card, first-name greet after Home card lands on DEV smoke.

## Decisions (Parker / Apex 2026-10-24 ~2:10 PM CT) — tip locks

- **Avatar:** `#1` only — `portal/client/assets/iris-avatar-01.png`. Circle crop; small iMessage chat-avatar (~32px); **not** expandable / not tappable (no lightbox, zoom, or click-to-full). `pointer-events: none`.
- **Entitlement:** Iris shows for any signed-in client with **portal access** (all stages + free Follow-Up grace), with **or without** Shop Pass. Gate = portal session / `portalAccess.enabled` (Home + `requireClient`). **Not** a Shop Pass flag. When portal boots after grace, Iris goes with it.
- **Follow-Up grace default:** **30 days** after deploy, then portal boots unless Shop Pass keeps portal open. Admin may exempt / extend / adjust (docs only this tip — no admin grace UI in Iris tip).
- **Visibility vs logging:** Widget visible when `irisChat.enabled` + `stages:["*"]` + portal access. `allowClientIds:["dev-smoke-apex"]` gates **logging / transcript writes only**, not card visibility. Handoff Submit writes for portal clients; message transcripts only when loggingOn.
- **Runtime:** CF → `api.x.ai` Responses with Layer A + injects + FAQ collection id. No chat-agent id. Voice Iris untouched. Stub reply when `XAI_API_KEY` missing (secret not in GCP yet). Bind secret later with `IRIS_CHAT_BIND_XAI_SECRET=1`.
- **Site push:** Rebase onto Coming soon tip `c5f807b` before Site FTP. Shop Pass Coming soon is a separate tip — do not regress it.
- **Removals:** No dead portal chat drafts found (`lib/drafts.js` is intake IndexedDB — left alone).

