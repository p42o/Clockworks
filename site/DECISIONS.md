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
