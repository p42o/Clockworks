# Apex wire pack — Iris portal chat (phase 1)

**Status:** Parker GO (via Theo 2026-10-24). Rolex Layer A/B v1 ready. Console has **no** chat-agent builder (Voice Agents only). Voice Iris `agent_vFTiMwnvhoQuKLZJ` untouched. Accidental Untitled `agent_BCQ2VQaWjGL5rchm` deleted.

## Runtime (Parker GO)
Portal Cloud Function → xAI **Responses / Chat API** (`https://api.x.ai/v1`) with:
- `system` / instructions = Layer A + session injects below
- `file_search` / collections tool on FAQ collection id `collection_969359cc-2b41-4df0-8af4-9775a5260e3d` (MN Clockworks FAQ; live file FAQ-v2.txt) — **do not** attach phone-only tools
- Optional second collection or extra file: `Grok-Bot-Changelog-digest.txt` (ops-approved items only)

There is **no** console `agent_*` id for chat. Wire model + prompt + collection ids. Do **not** use voice agent ids.

## Session inject (every turn / session start)
Replace in the system block before calling the API:
- `{{CLIENT_CONTEXT_MD}}` ← Layer B for this logged-in session. **Required phase 1:** inject logged-in **client_id**, **Client name**, and **first_name** so Iris greets by name (Layer A reads `first_name`). Full per-client intake MD is **phase 2 stub-only** for now (blank fields OK beyond those).
- `{{CHANGELOG_ITEMS}}` ← approved bullets from Support digest (not raw scrape)
- `{{TODAY_TIMESTAMP}}` ← America/Chicago unless per-client TZ later

## Files
- Layer A: `LAYER-A-global-personality-and-support.md`
- Layer B stub: `LAYER-B-per-client-stub.md` (phase 2 intake fields stub-only; name/id required in session)
- Changelog digest: `Grok-Bot-Changelog-digest.txt`
- Counsel logging: `/workspace/clockworks/legal/2026-10-24-counsel-iris-portal-chat-logging.md`

## Handoff (Parker lock)
When Iris needs a human: end the chat handoff in an **Apex review + Submit card** that lands in the **Parker queue**, with the client's preferred channel among phone / email / chat / text. Until that path ships, Iris may still give support phone **(763) 296-9777**. No callback SLAs. No phone tools on this chat surface.

## Logging
Dark-store transcripts OK on DEV smoke client. Customer-visible HOLD until banner + Privacy v2.0b + Starter Terms.

## Holds
No Shop Pass / $99 sell. Kit: free 15-min / $50 / $499.
