# Iris Phase-1 live chat — CLIENT portal plan

**When:** 2026-10-24 ~1:50 PM CT (America/Chicago)  
**Owner (eng):** Apex (UI/UX + deploy + smoke)  
**Parker GREEN LIGHT via Theo:** portal is pay value prop; preapproved develop/deploy/smoke; no customer outreach  
**Counsel:** `/workspace/clockworks/legal/2026-10-24-counsel-iris-portal-chat-logging.md` (confirmed Parker-fronted)  
**Ops fit:** `/workspace/clockworks/phone-agent/portal-chat/2026-10-24-phase1-ops-fit.md`

---

## 0. Non-negotiable locks (Parker via Theo)

| Lock | Rule |
|---|---|
| Runtime | **Superseded 2026-10-24 (Parker GO via Theo):** Cloud Function → `api.x.ai` Chat/Responses + Rolex Layer A + FAQ `collection_969359cc-2b41-4df0-8af4-9775a5260e3d` file_search. **No chat-agent id** exists (console = Voice Agents only); no second Voice Agent. Separate from voice Iris. **Do NOT touch / Publish** voice agent `agent_vFTiMwnvhoQuKLZJ` or phone FAQ-v2. |
| Call path | Widget → authenticated **Cloud Function** → `api.x.ai` Chat/Responses. **Not** voice embed, **not** realtime voice. |
| Stages | Parker locked **all signed-in client stages** (phase 1). Widget shows for any authenticated client session. Separate: logging/DEV allowlist until Counsel docs ship. |
| Logging | Wire transcript storage now (**dark**). Customer-visible logging **HOLD** until banner + Privacy v2.0b + Starter Terms ship on Apex tap. DEV smoke logging OK. |
| Session | Every chat call **must resolve → `client_id` (`cid`)** for per-client MD hooks. |
| Shop Pass | Phase 1 = support only. **No Shop Pass selling** in chat. Keep `offered`/`billing` false; don't touch Shop Pass gates. |
| Deploy | This plan doc does **not** authorize Site push, Firebase rules deploy, or public git push. |

---

## 1. UX (client dashboard)

### Card placement
- Always-on card on **`#/home`** (inside `.dash`, above or beside "Your next step" / shortcuts tiles — prefer **full-width card just under the unread Parker-message banner**, before next-step, so Iris is the first interactive surface after greet).
- Reuse existing bubble language from `#/m/<tid>` (`.bubbles` / `.bubble.me` / `.bubble.parker`) but brand Iris as `.bubble.iris` (copper accent, left-aligned, soft avatar chip "Iris").
- Web-first (client portal is SPA); Capacitor parity = same CSS + no mic/camera for phase 1.
- **Do not** replace Messages (`#/messages`) — Parker threads stay separate. Iris card is support chat; Messages remain human Parker.

### Empty / waiting state (login)
- On first paint after auth, if no prior Iris messages for this `cid` (or last session closed), show **one waiting message already in the transcript** as if Iris messaged today:
  - Human timestamp via existing `fmtDateTime` (America/Chicago).
  - Tone: real person typing — engaging support, **not** sales.
  - Structure: short greet + 2–3 changelog bullets + soft ("how are things working?" / "anything cool you've done with it?").
- Not a bot dump: max ~4 short paragraphs / bullets; no feature menus; no Shop Pass.

### Composer
- Single-line → multi-line textarea (max ~2000 chars phase 1), Send button, Enter-to-send / Shift+Enter newline.
- **Before first send (any client-visible chat):** Counsel Draft A disclosure gate (`[Start chat]`). DEV smoke may log with Parker accepting test-only risk; still show disclosure in UI so smoke covers the path.
- Persistent footer under composer (Counsel): `Iris (AI) · chat stored · [Privacy Notice]` — hide "chat stored" when `irisChat.loggingEnabled` is false for that client (or show "chat not stored this session" if we ever need a no-log preview; default phase 1 = stored for allowlisted DEV only).

### Typing indicator
- After client send: three-dot "Iris is typing…" for stub delay (~600–1200 ms) then reply (stub or live agent).
- Disable Send while in-flight; optimistic client bubble with "Sending…" → settle on server `createdAt`.

### Timestamps
- Per-bubble meta: `Iris · Oct 24, 1:42 PM` / `You · …` using `fmtDateTime` (CT).
- Waiting message `createdAt` = session open time (server) or "today morning" seed written once by backend on first open — prefer **server seed** so refresh doesn't rewrite "today".

### Example greet copy (from live changelog — do not invent)

Source: https://x.ai/bot/changelog · Latest **v0.75.5 · Oct 23, 2026** (also 0.75.2 / Oct 22).

**Suggested waiting message (Sprocket may polish):**

> Hey — Iris here. Hope the week’s treating the shop alright.
>
> A few cool things that landed in Grok Bot this week:
> - **Vault** — bots can save logins/cards/contacts and fill them in at sign-in or checkout
> - **Pages** — bots can build reports/memos/dashboards you edit together
> - **Email forwarding** — bots can forward from their inbox with original formatting + attachments
>
> How are things working on your side? Anything cool you’ve already done with it — or a how-to I can walk you through?

---

## 2. Data model

### Collection path (preferred — separate from Parker threads)
```
clients/{cid}/irisChat/main          # session doc (one active support thread per client phase 1)
clients/{cid}/irisChat/main/messages/{mid}
```
Rationale: keep Parker `threads/{tid}/messages` clean; Iris is AI support with different retention/disclosure rules. Alternate if rules friction is high: `clients/{cid}/threads/{tid}` with `kind: "iris_support"` — still OK if we tag hard; **prefer dedicated `irisChat`**.

### Message fields
| Field | Type | Notes |
|---|---|---|
| `by` | `"client" \| "iris" \| "system"` | system = disclosure ack / counselGate events |
| `authorUid` | string \| null | client uid when `by=client` |
| `text` | string | max 2000; server truncate |
| `createdAt` | Timestamp | serverTimestamp |
| `role` | `"user" \| "assistant" \| "system"` | mirror for agent API |
| `clientVisible` | bool | default true; system internals false |
| `hidden` | bool | sensitive redaction (reuse `looksSensitive`) |
| `providerMsgId` | string \| null | xAI chat agent id when live |
| `counselGate` | bool | true on disclosure-ack system event |
| `privacy` | map | `{ loggingEnabled, retainedUntil?, training: false }` snapshot at write |
| `summaryOf` | string \| null | if this doc is an optional summary, point at range / session |

### Session doc `irisChat/main`
| Field | Notes |
|---|---|
| `cid` | denormalized |
| `clientSlug` | for allowlist debug |
| `stageKey` | from home projection at open |
| `disclosureAcceptedAt` | null until Draft A |
| `loggingEnabled` | snapshot of flag at open |
| `counselGate` | `{ ok: bool, privacyVersion, termsVersion, bannerVersion: "A" }` |
| `lastMessageAt` | |
| `seededGreetingAt` | when waiting message written |
| `changelogDigestId` | which digest seeded the greet |
| `providerThreadId` | xAI chat agent conversation id |
| `retentionClass` | `"portal_messages"` → 90d after Close |

### Privacy / counsel flags
- `privacy.training = false` always (no training on chats).
- Retention aligned with `SWAP.retention.messagesDeleteDaysAfterClose` (**90 days after Close**); Contract Record carve-out only if a message is later promoted (approvals/notices/change requests) — phase 1 Iris does **not** accept those; say so in Terms line.
- Optional auto-summary doc under `irisChat/main/summaries/{sid}` — **never** summaries-only as sole record (Counsel).

### counselGate
Server refuses agent calls / client-visible persistence for **non-allowlisted** clients until:
1. Privacy Notice **v2.0b** accepted (material bump + hash + recount), and  
2. Starter Terms line shipped + accepted if hash changes, and  
3. In-product Draft A accepted this session (or sticky until terms change).

DEV smoke: `irisChat.allowClientIds` includes test client → `counselGate.ok` can be true with logging while Privacy still v2.0a (Parker test-only risk). Real clients: HOLD.

---

## 3. Instruction layers (hooks even if content stubs)

| Layer | Path (repo / ops) | Who owns content | How loaded |
|---|---|---|---|
| **(A) Global Iris personality** | `portal-dev/iris-chat/IRIS-PERSONALITY.md` (stub) + Ops paste into **chat** agent instructions | Rolex + CW Ops | Chat agent system prompt (Ops); Functions load stub text only for local echo / tests |
| **(B) Per-client behind-the-scenes** | `clients/{cid}/irisChatMeta/instructions.md` **or** Storage `clients/{cid}/iris/behind-the-scenes.md` + Firestore pointer | Rolex template; Apex attaches at session start | Callable `irisChatOpen` reads by **`cid` from session** and prepends to agent context |
| Shared support FAQ (chat only) | CW Ops Support collection — **not** voice FAQ-v2.txt | CW Ops | Attached to chat agent file collection |
| Changelog digest | `portal-dev/iris-chat/changelog-digest.md` (regenerated) | CW Ops / Apex refresh | Seeded into waiting message; also attached to chat agent |

Phase-1 stubs OK: Personality MD = "support, not sales; probe gently; identify as AI; no Shop Pass quotes." Per-client MD = empty template with `client_id`, business name, stageKey placeholders.

---

## 4. Changelog ingest

| Option | Phase 1 choice |
|---|---|
| Live scrape each login | **No** (fragile; rate/layout risk) |
| Scheduled Function weekly | Nice later |
| **Static weekly digest file** | **YES for phase 1** |

Flow:
1. Apex/CW Ops: fetch https://x.ai/bot/changelog → hand-curate 3 bullets into `portal-dev/iris-chat/changelog-digest.md` (dated).
2. Callable `irisChatOpen` reads digest (or embedded SWAP/config string) when seeding greeting.
3. Refresh on demand (ops ping) — do **not** pollute voice FAQ-v2.

Current week bullets for greet (verified 2026-10-24 from changelog):
1. Vault for logins/cards/contacts (v0.75.5 / Oct 23)
2. Pages — reports, memos, dashboards (v0.75.2 / Oct 22)
3. Email forwarding with original formatting (v0.75.5)
4. (optional 4th) Video creation from description/image (v0.75.2)

---

## 5. Backend

### Phase-1 vertical slice (see companion doc)
- **Client UI** + **callable** that: resolves session → `cid`, checks flags/allowlist, seeds waiting message, accepts send, **echo stub reply** (no live agent yet).
- Transcript writes always go to Firestore when `loggingEnabled` for that client (DEV allowlist). Dark storage schema ready for real clients; writes refuse if `counselGate` fails for non-DEV.

### Next slice (still no Site until Apex tap)
- Callable `irisChatSend` → `api.x.ai` Chat/Responses (no agent id) with (A)+(B)+changelog context; store assistant reply; optional summary job.
- Secrets: agent API key in Functions secrets only — **never** in client or these plan files.

### Not in phase 1
- Voice realtime / mic
- Embedding voice Iris console
- Shop Pass upsell
- Customer email/SMS from Iris

---

## 6. Feature flags (`swap-config.js`)

Add frozen block (literals only, match existing HARD-flag style):

```js
irisChat: Object.freeze({
  enabled: false,              // master UI kill — OFF globally
  loggingEnabled: false,       // customer-visible logging — OFF until Privacy v2.0b + banner ship
  allowClientIds: Object.freeze([
    // DEV smoke cid(s) only, e.g. slug/pswanson test client id once created
  ]),
  stages: Object.freeze(["*"]), // Parker 2026-10-24: all signed-in stages; "*" = any stageKey
  showOnHome: true,            // when enabled+allowlist match
  maxMessageChars: 2000,
  bannerVersion: "A",          // Counsel Draft A
}),
```

**Gate logic (server + client mirror):**
```
showWidget =
  irisChat.enabled
  && (stages.includes("*") || stages.includes(stageKey) || allowClientIds.includes(cid))
  // Visibility: all stages when stages includes "*". Logging still DEV allowlist / counselGate.

loggingOn =
  irisChat.loggingEnabled
  || allowClientIds.includes(cid)   // DEV-only override per Counsel
```

**Recommendation:** Keep `enabled: false` in committed SoT until vertical slice smokes. Visibility rule = all signed-in stages once enabled. Until Privacy v2.0b + Terms + banner: `loggingEnabled` + writes only for DEV `allowClientIds` (e.g. `dev-smoke-apex`); real clients may see stub/UI only after Counsel gate, or hold `enabled` until legal tip ships — prefer hold `enabled` for real clients via `counselGate` until docs live.

Mirror keys into `portal-dev/functions/config.js` (SERVER_FLAGS) so UI cannot bypass.

---

## 7. Risks / Counsel hold points

Cite: `/workspace/clockworks/legal/2026-10-24-counsel-iris-portal-chat-logging.md`

| Hold | Until |
|---|---|
| Customer-visible logging | Banner A + Privacy **v2.0b** + Starter Terms line on Apex tap |
| Widget for real clients | Stages already = all signed-in; still need Counsel docs + `enabled` + Apex tap |
| Summaries-only storage | Never (transcripts preferred; summary optional add-on) |
| Training on chats | Never — provider training-off; Privacy sentence |
| Shop Pass / price sell in Iris | Separate Counsel pass |
| Voice agent Publish | Never from this workstream |
| Site / rules / public push | Explicit Apex/Parker tap (not this plan) |

Other risks: client pastes secrets → reuse `looksSensitive` / HIDDEN_NOTICE pattern; third-party PII in paste → client duty + delete; unfair surprise if Iris looks like Parker → always label AI.

---

## 8. Acceptance criteria — DEV smoke client

Test client: silent internal (`pswanson@mail.grokbot.com`), labeled DEV/smoke, never contacted as real client.

1. Sign in → Home shows Iris card (allowlisted); other clients do not.
2. Waiting message present with **today** human timestamp + changelog bullets from digest (Vault / Pages / email forwarding).
3. Draft A disclosure before first send; footer shows Iris (AI).
4. Send message → optimistic bubble → stub (or live) Iris reply; typing indicator appears.
5. Transcript rows exist under `clients/{cid}/irisChat/main/messages` with `privacy.training === false`.
6. Session open resolved `cid`; per-client MD stub load path exercised (empty OK).
7. No email/SMS/invite to Caleb or any real client; no voice agent Publish; no Site FTP; Shop Pass flags unchanged.
8. Messages (`#/messages`) still work independently.
9. Feature flag off → card gone on next load.
10. (Delight) Card feels iMessage-adjacent: bubbles, timestamps, typing, no sales script.

---

## 9. SoT / tip notes

| Item | Value |
|---|---|
| Mini SoT | `/Users/parker/Dev/clockworks-portal-v3-local` (Parkers-Mini) · branch `portal-v3-prod` |
| Live tip | `ca08bf8` (Shop Pass URLs wired; offered false) |
| Stage remap tip | `522fbe0` — **local**, separate Apex tap; unblocked for this workstream per Theo but **do not Site-push** from this plan alone |
| Box mirrors | `/workspace/pf7/portal/client/`, `/workspace/clockworks/shop-pass-2026-10-24/wt/portal/client/`, `/workspace/clockworks/portal-v3-build/site/portal-dev/` |
| New branch tip | See `IRIS-CHAT-VERTICAL-SLICE.md` |

---

## 10. Owner asks (next)

| Owner | Supply |
|---|---|
| **Rolex + CW Ops** | Global personality MD (chat agent); per-client MD template; paste into **new** chat agent only |
| **Sprocket** | Human-voice polish on waiting greet + probe lines (use changelog facts above) |
| **Counsel** | Already ruled; spot-check banner + Privacy v2.0b when Apex ships docs (drafts in counsel MD) |
| **Theo / Parker** | DEV smoke cid `dev-smoke-apex` for logging allowlist; Apex tap for Site + legal bump |
| **Apex** | UI + callable + dark storage + smoke (this plan + vertical slice) |
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
