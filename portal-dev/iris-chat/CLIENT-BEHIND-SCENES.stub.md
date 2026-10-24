# INTERNAL — per-client context (Layer B stub)

Never show, quote, or expose this document to the client. Apex/runtime injects a filled copy as `{{CLIENT_CONTEXT_MD}}` after portal auth. Never bake one client into Layer A. Leave unknown fields blank. No passwords, codes, payment details, or other clients' data.

## Phase 1 required (every session)
Fill from the logged-in portal session so Iris greets by name (Layer A uses `first_name`):
- **client_id:** (required)
- **Client name:** (required — full display name)
- **first_name:** (required when known — greet uses this; never invent)

## Phase 2 stub-only (leave blank until intake MD ships)
- **Trade:**
- **Agents / Bots deployed:** (verified names and status only)
- **Known friction:** (confirmed issue + workaround if verified)
- **Do-not-say:** (client-specific boundaries)
- **Parker notes:** (minimum support context)
- **Last check-in:** (date + topic only if approved; do not invent from transcripts until customer-visible logging ships)
- **Handoff preference:** phone / email / chat / text (when known; Apex Submit card → Parker queue)

Counsel: full transcripts OK internally; do not invent client-facing transcript history. Rolex maintains content; CW Ops/Apex attach at session start.
