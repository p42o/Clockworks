# mnclockworks.com v3 — build log & decisions

Running log. Newest entries at the bottom of each section.

## The one-line concept

**A beautifully machined instrument that gives you your evenings back.**
The escapement — the mechanism in a clock that turns chaotic spring force into calm, even ticks —
is the whole business in one image: your chaotic week in, calm ordered time out.
Everything on the site serves that metaphor with restraint.

## Design direction

- **Identity:** "Warm horology" — technical-drawing precision on warm paper. Shinola ad × Field Notes ×
  Swiss escapement drawings. Explicitly NOT tactical-CRT (the house drift), not SaaS gradient-and-card,
  not Silicon Valley cold.
- **Palette (canon = Brand Guide v2, April 2026):** paper `#F5F1E8` / cream `#EDE7D8` / sand `#E2DAC5`,
  ink `#1A1916`, ground `#0E0E0C` for dark bands, **signal copper `#D4582A`** (< 10% of any
  composition, per guide), patina green `#3C5A4A` secondary, warm hairlines `#D4CCB4`. The live
  site's orange `#C4834A` loses to the guide. One committed light look + ground-dark bands —
  no dark-mode toggle; `color-scheme: light` declared.
- **Type:** Instrument Serif (display, incl. italics for the human moments) · Geist Sans (body/UI) ·
  Geist Mono (eyebrows, numbers, spec labels). All self-hosted via next/font + geist package — zero
  external font requests.
- **Texture:** faint SVG-noise paper grain + hairline rules like a drafting sheet. Numbered sections
  in mono (01 / 02 / 03) like drawing callouts.
- **Motion:** springs via `motion`; slow 1 Hz escapement tick in the hero; scroll reveals ≤ 700ms;
  page-to-page View Transitions (next-view-transitions) so the site feels like one continuous sheet
  of paper. `prefers-reduced-motion` honored everywhere — static fallbacks, no exceptions.
- **Signature moments (only two, both hand-built, no three.js):**
  1. Hero: a working escapement + gear train drawn in thin copper line, custom WebGL fragment shader
     (SDF-based), ticking once per second. DPR-aware, pauses off-screen, static SVG fallback for
     reduced-motion / no-WebGL. Budget: < 8KB of shader + TS.
  2. "Your week — before and after": chaotic scatter of real owner pains that organizes into a calm
     week grid as you scroll/drag. DOM + motion springs (not canvas) for accessibility.

## Engineering decisions

- **Next.js 15.5.20 (App Router) + TS strict + Tailwind v4** — per brief. `output: "export"` (static)
  because hosting is Namecheap shared (LiteSpeed) via the existing GitHub Actions FTPS pipeline.
  No server runtime available — everything client/deploy-time.
- **No react-three-fiber.** Both signature moments are cheaper and sharper hand-built (raw WebGL
  fragment shader + DOM springs). three.js would cost ~150KB against a Core-Web-Vitals budget for
  mid-range Android; the brief allows judgment and judgment says lean.
- **View transitions:** `next-view-transitions` (stable, works with App Router + static export)
  instead of Next's experimental flag — no canary React needed.
- **basePath switch:** `NEXT_PUBLIC_BASE_PATH=/v3` builds a preview deployable to
  mnclockworks.com/v3/ without touching the live root. Root flip = same build, no basePath.
- **Booking backend:** provider-abstracted `AuditProvider` interface. Default provider mirrors the
  legacy contact stack (Firestore `formLogs` on project `stonearchai` + Discord webhook fallback) so
  submissions surface in Parker's existing admin.html and Discord instantly. Swap = one line in
  `lib/booking/index.ts`.
- **Legacy preserved:** blog/, sitesniper/, sniper/, sprocket/, admin.html, privacy.html, terms.html,
  resources.html, .htaccess all stay untouched at repo root. The static export is synced into root
  by `scripts/sync-out.mjs` with an explicit allowlist of what it may overwrite.
- **Repo layout:** `site/` = source (FTPS-excluded), repo root = deploy artifact. Matches the repo's
  existing "root is the site" pipeline; GHA workflow gains excludes for `site/**`.

## Copy decisions

- Voice: plainspoken, warm, Minnesotan, outcome-first, first person. No "leverage," no "transform,"
  no exclamation points. Numbers stated straight, pricing public.
- H1 chosen: **"Get your evenings back."** (Runners-up kept in copy.ts comments: "Win more jobs
  without more admin," "The office work runs itself now," "Built for the trades. Run by a clock.")
- Primary CTA everywhere: **Book your free audit** with the de-risking line
  "30 minutes, no pitch. You leave with a written plan either way."
- Proof honesty rule: no invented client stats. Proof = systems Parker verifiably runs + industry
  stats only when citable + anonymized early wins clearly labeled. Case-study slots structured so
  Eicher drops in cleanly later.

## Recon findings that shaped the build (2026-07-03)

- **What's actually live:** origin/main still serves the OLD $499/$999-tier marketing site. The
  May-22 "AI Integration" rewrite and a later "business card" index.html exist only as uncommitted
  local changes — never pushed. v3 supersedes both; the uncommitted files stay untouched on `main`.
- **Blog index is resources.html** (static allPosts array, publishAt gating) + ~24 legacy blog HTML
  files. All preserved verbatim; new nav links "Notes" in the footer.
- **Contact stack:** delivery = Discord webhook (fetch POST), Firestore `formLogs` on `stonearchai`
  is only a log; `siteContent/formSettings` can override the webhook. AuditProvider mirrors this
  exactly via Firestore REST (no SDK payload) so leads appear in admin.html + Discord like today.
- **admin.html gate:** `ADMIN_EMAIL` is empty — any Google account can open the portal. Fixed in
  this branch (set to Parker's Gmail); it's a client-side gate, noted in the handoff report.
- **Clockworks Social:** Firebase `clockwork-social`, collection `posts`
  {platform: "facebook"|"x", text, scheduled_at (UTC Timestamp), status: pending→sending→sent|failed,
  thread[], link, image_url}. No LinkedIn adapter. The 3-month system emits a master JSON +
  X/FB CSVs matching its import format + a LinkedIn manual-paste queue. Content queue has been
  DRY since Jun 5 — the new calendar takes over from Jul 7.
- **Brand assets:** images/Parker.png portrait + logo SVGs exist in the site repo; brand-guide-v2
  supplies the locked voice lines ("The hidden mechanism behind small business," the coffee bet,
  "Ten hours a week, returned to you").

## Build log

- **2026-07-03** — Project start. Branch `v3-redesign`. Scaffolded Next 15.5.20 static-export app in
  `site/`, Tailwind v4 tokens, fonts self-hosted. Deep-research workflow on customer acquisition
  launched in parallel; recon agent mapping legacy site + Clockworks Social schema.
- **2026-07-03** — Tokens corrected to Brand Guide v2 canon (#D4582A copper, warm lines, ground).
  Rectilinear radii (2–4px) adopted per guide.
- **2026-07-03** — Verification round (Playwright, desktop+iPhone+reduced-motion) found and fixed:
  GLSL `tanh` missing in WebGL1 (custom `th()`); WeekFlow hydration mismatch under reduced motion
  (mount-gated static variant, ref always attached); Reveal/StatCount rebuilt to FAIL VISIBLE
  (no hidden SSR styles + 3s force fallback — content can never be stuck invisible for crawlers
  or slow devices); portrait compressed 3.4MB→135KB; GA4 added (skipped on /v3 previews);
  raw <img> srcs basePath-wrapped via asset(); WeekFlow hint-fade hook hoisted above the early
  return (hook-order crash for reduced-motion users). Audit flow e2e-verified: Discord delivery
  204 (real embed on Parker's phone), Firestore formLogs write is PERMISSION_DENIED by rules —
  pre-existing (legacy site logging silently fails in prod too); flow treats Discord as delivery.
  Deployed to mnclockworks.com/v3/ (GHA run 37s, live-verified: zero 4xx, canvas mounts,
  portrait 200, root site + all legacy paths untouched).

## Round 2 — feedback build (2026-07-03/04)

Parker's second brief (positioning doubled to automation + intel/dashboards, plus a live
sample-product chatbot). All live-verified on mnclockworks.com/v3.

- **Quick wins:** existing gear logo re-colored to the palette (`LogoMark.tsx`), custom cursor
  DELETED (read as broken), Results nav link gets a breathing copper glow, ALL emails removed
  (contact is form→Discord only; `site.email` no longer rendered anywhere), FAQ gains a
  cost-context "couldn't I DIY with ChatGPT?" answer (real tool/VPS pricing), Results receipts
  swapped: "monitoring/alerts" → custom real-time dashboards/intel, "family calendar" → generic
  inbox-automation (employer/product/brand deliberately unnamed).
- **Blog system:** file-based (`content/blog/*.md`, gray-matter + marked). 22 legacy posts
  extracted from the old HTML + 6 new trades-voice posts (Jul–Dec, one/month). Build-time
  publish gating (`lib/blog.ts` — future-dated posts aren't exported) = "scheduled publishing"
  on a static host; the **monthly-publish GHA cron** (1st of month) rebuilds so the next post
  goes live. `/blog` index + `/blog/[slug]`, JSON-LD, `blog-manifest.json` route for the admin.
  `sync-out.mjs` root-mode now merges a marker-delimited 301 block into `.htaccess`
  (legacy `/blog/*.html` → new slugs, `resources.html` → `/blog/`). Prose CSS in globals.
- **Results = 6 interactive demos** (was 4 static receipts), `components/demos/`: Call Catch
  (playable text-back sim), Quote Chaser (time-lapse pipeline), Review Engine (happy/unhappy
  fork), Command Dashboard, Intel Desk (competitor/demand/materials), Inbox Autopilot. Chart
  palette validated via the dataviz six-checks (`#D4582A/#1F7A50/#946A00/#3D6BA8` on paper —
  the brand muted tones failed the chroma floor). Every demo hard-labels SAMPLE DATA and shows
  its assumptions — the data-integrity rule from the brief.
- **Chatbot "Front Desk"** = the headline sample-product. Brain in `~/Dev/clockworks-bot/lib/
  brain.ts` (Socratic, genuinely sales-skilled, teaches, illustrative-math-only guardrails,
  `<lead>` capture tag → Discord). Provider-abstracted proxy DEPLOYED to
  **clockworks-bot.vercel.app/api/chat** (CORS-locked to mnclockworks.com + localhost). Running
  **Grok-4 now** (xAI key); flips to **claude-opus-4-8** by setting ANTHROPIC_API_KEY in the
  Vercel project + model in botConfig — the code already prefers Claude. Conversations + config
  in Firebase `clockwork-social` (admin SDK via `CW_SA_B64`). Floating widget `ChatWidget.tsx`
  with a poppable **HVAC sample-insights dashboard** (what an owner learns from site chats).
- **"Your Own Agent" page** (`/your-own-agent`): non-technical ownership pitch — one brain across
  web/SMS/Telegram/Discord, logging→insights, tool integrations, a live steer demo (tone dial),
  training scope, flagship-model comparison w/ rough per-convo pricing, camera-input story, and
  the cost/control/visibility own-vs-rent argument. Linked from the chat via the
  "Learn more about having your own agent" tooltip. Positioning doubled per the brief.
- **Admin:** `admin-bot.html` (Google-auth, clockwork-social) — bot enable/model/extra-
  instructions config, conversation viewer + JSON export, blog-schedule readout. Linked from
  `admin.html`. Home grid + spec sheet grew 4→6 systems (added Intel Desk, Front Desk).
- **Verify:** Playwright over the new surface (blog gating confirmed — Jul-7 post correctly 404s
  on Jul-3; steer demo; all 6 demos; LIVE chat round-trips through the deployed proxy with a
  grounded pricing answer). Zero page errors. Redeployed /v3, live-checked on production.

## Round 3 — feedback build (2026-07-04): homepage density + bot guardrails

- **Homepage now surfaces the demos.** New "Go ahead — poke it / Play with it" band embeds the
  full `<DemoGallery/>` (all 6 interactives) mid-scroll, after What I Do. Parker: demos should be
  noted on the scrolling homepage.
- **Less minimalistic:** hero gains a trust-chip row (48-hr demo · you own everything · no
  contracts · coffee-bet) + styled tool PILLS (was plain text); "02" drafting-numeral watermark
  on What I Do; a copper tick-ring/gear ornament on the dark Numbers band. Restraint kept — added
  structure and drafting motifs, not clutter.
- **Bot cost + abuse hardening** (the real point of round 3):
  - `lib/guard.ts` — cheap pre-LLM screen: jailbreak/prompt-injection + code-gen/off-task +
    raw-code-blob → instant canned redirect, NO paid model call (verified 0.6s).
  - `store.ts checkRate()` — Firestore rate limiter: per-IP burst (6/min) + per-IP daily (40) +
    a **GLOBAL daily ceiling (1200)** that fails CLOSED = the hard credit backstop (bounds max
    daily spend regardless of IP spread). All three tunable from admin-bot.html.
  - Turn cap 18 (was 40), max_tokens 500 (was 700), input 1500 chars (was 3000).
  - Brain boundaries rewritten: one subject only (the business + AI-for-business), refuses
    code/essays/homework/trivia, refuses SHADY advice (fake reviews etc.) with the honest
    alternative, resists jailbreaks silently, stays warm + teaching. Verified live: warm Socratic
    answers, clean off-topic redirect, firm fake-reviews refusal, burst throttle at the 7th req.
  - **Claude:** wired via ANTHROPIC_API_KEY + automatic Grok fallback in `complete()` (a Claude
    failure never takes the bot down). ⚠️ **The key Parker supplied returned `invalid x-api-key`**
    (mistyped/revoked/wrong-workspace) — removed it, so the bot runs cleanly on **Grok-4** now.
    The instant a valid key is added to the clockworks-bot Vercel project, it's on Claude with
    Grok as fallback (default model logic already prefers claude-opus-4-8 when the key is present).

## Round 4 — GO LIVE at root (2026-07-04)

Parker: "make my logo a little larger, then deploy over my home page." Also reported an
"Application error: a client-side exception" on the site.

- **Root cause of the exception: no Cache-Control headers from the host.** Browsers heuristically
  cached the HTML; after a redeploy the stale HTML referenced `_next` chunks the incremental FTP
  deploy had already deleted → 404 → hydration crash. Cold loads always passed (my tests), which
  is the tell. **Fixed in `.htaccess`:** `no-cache, must-revalidate` on `*.html` +
  `max-age=604800` on hashed assets (mod_headers, with a mod_expires fallback). Verified live:
  HTML now returns `cache-control: no-cache`. This permanently prevents the stale-chunk crash.
- **Logo enlarged:** mark 32→44px, wordmark 1.55→1.7rem, gap widened.
- **THE FLIP — mnclockworks.com root is now the new site.** `sync-out.mjs` gained an OVERLAY mode
  for `blog`: the new Next blog is merged on top of the legacy `blog/*.html` files (which stay and
  are 301'd to the new slugs) instead of the script refusing on the collision. Ran `export:root`:
  new index.html + `_next` + all app dirs written to root, blog overlaid, `.htaccess` merged with
  22 blog 301s + `resources.html`→`/blog/` (cache block preserved above the managed markers).
  **Zero legacy deletions** — sitesniper, sprocket, admin.html, admin-bot.html, privacy, terms,
  resources, contact, images, social all intact. Live-verified: root 200 + clean hydration (no
  errors), logo 44px, demos band, chat answering; `/sitesniper/` `/admin.html` `/privacy.html`
  200; `/blog/ai-myths.html`→301→`/blog/ai-myths/`; `/resources.html`→301→`/blog/`. The `/v3`
  preview mirror stays live (noindex) as a fallback. Root build indexes (SEO on).

## Round 5 — bot guardrails re-tuned (2026-07-04)

Parker: the bot was too much of a bouncer — refused a joke, refused to name a favorite AI model,
gave canned "I'm not that kind of AI" lines. He wants personality + CLEVER improvised re-routes,
while still blocking people from using it to build their projects.
- **`guard.ts` narrowed** to genuine prompt-injection/jailbreak ONLY (override-instructions /
  extract-prompt / DAN-mode). Removed the OFF_TASK + code-blob pre-blocks so jokes, opinions, and
  "write me X" now reach the model for a witty re-route instead of a canned deflect. Credits still
  protected by rate limits + 18-turn cap + max_tokens 500 + 1500-char input truncation.
- **`brain.ts` rewritten:** added a Personality section (tells jokes — actually tells them; has
  opinions incl. favorite model = Claude with reasons; light small talk) and reframed the boundary
  to ONE hard line — "you don't do people's actual project work" (code/essays/homework/campaigns) —
  with explicit "REEL THEM BACK cleverly, never recite" guidance + vibe examples (labeled do-not-copy).
  Still firm (gracefully) on shady advice, jailbreaks, sensitive data. Deployed to clockworks-bot.
  Verified: joke lands + pivots, favorite-model has a real take, weather banter redirects, "build my
  scraper" gets a funny decline, jailbreak still deflects. Still on Grok (Claude key still invalid).

## Round 6 — blog newspaper redesign, de-em-dash, chat-bubble redesign (2026-07-04)

- **Blog in header nav** ("Field notes"); footer deduped (now "Your own agent" + legal).
- **Newspaper post template** (`blog/[slug]/page.tsx` + `.prose-article` CSS): centered masthead
  (kicker rules, big serif headline, italic dek from the post description), a **byline with a
  circular author photo**, a copper **drop cap** on the opening paragraph, and section rules before
  each h2. New **`AuthorBio.tsx`** at the foot of every post — circular headshot in a copper ring,
  "Written by Parker Swanson," bio, book/about links (Parker: "my face in a circle like an author").
- **De-em-dashed all posts:** 5 parallel agents rewrote 26 posts, removing all **416 em-dashes** by
  restructuring sentences to read naturally (not find-replace), deleting AI-tell sign-offs
  ("— Parker Swanson, CEO of Clockworks"), light de-robotizing. Facts/numbers/structure untouched;
  verified 0 em-dashes in every article body. (Remaining em-dashes in the site's UI chrome — hero,
  footer, CTA, other page bodies — are house-style microcopy, left as-is; a full-site sweep is a
  one-word ask if wanted.)
- **Chat launcher redesigned** (`ChatWidget.tsx`): killed the literal 🕰️ clock emoji. Now a copper
  gradient button with a cream **speech-bubble glyph + copper typing dots**, a radar pulse ring, a
  live green status dot, a minimize chevron when open, and a **first-visit peek nudge** ("Hey, I'm
  the front desk…", session-gated, dismissible). AuthorBio em-dash removed too.
- **Deploy gotcha logged:** never run `npm run build` while `next dev` is running — they share
  `.next` and the build bakes stale renders. Kill the dev server, `rm -rf .next out`, then build.
- All live-verified on the root: newspaper template + 2 circular photos/post, 0 article em-dashes,
  new bubble opens + bot answers, future-dated Dec post still correctly 404s (scheduling intact).
  ## Redesign study — /preview/ (navy/teal alt direction, 2026-07-04). Master-control dial + Demo Lab w/ 6 human-in-the-loop demos. Source ~/Desktop/MN Clockworks Redesign Prototype.html, repo preview/index.html. CTAs→/book/. Decision open: adopt or leave as study.
