# Deploy notes: page rule (Parker, 2026-10-23)

Every new or changed page on mnclockworks.com (and the portal where it applies) needs, before it ships:

1. GA4 tag `G-PSNYLVG4V1`. Next pages get it from `site/src/app/layout.tsx` (one shared layout; do not add it per page).
   The hand-built facelift home (`/index.html`) carries its own copy in `<head>`; keep it when editing that file.
   Global Privacy Control (Counsel ruling 2026-10-23): GA loads only from script code that checks
   `navigator.globalPrivacyControl === true` first, so under GPC gtag.js is never requested (DNT is an extra opt-out).
   Never add a static `<script src="https://www.googletagmanager.com/gtag/js...">`; copy the guarded loader from `/index.html`.
   Every public page also loads `/cw-events.js` (shared events, reduced data). Portal sign-in pages use `portal/client/ga.js`.
   Headless proof: `node site/scripts/gpc-headless-test.cjs` (see its header).
2. A sitemap entry (`site/src/app/sitemap.ts`) when indexed, none when noindex; an absolute self canonical; the right robots call.
3. At least one internal link (header nav, footer or another page). Indexed pages may not be orphaned.
4. NAP and LocalBusiness JSON-LD that match: MN Clockworks, Maple Grove, (763) 296-9777, `tel:+17632969777`, `+1-763-296-9777`
   (one source: `PHONE_DIGITS` in `site/src/lib/copy.ts`).
5. A `<title>` and a meta description.
6. A row in `site/pages.inventory.json` (path, purpose, GA, index/noindex, sitemap, canonical, linked from).
   Then run `node site/scripts/check-pages.mjs --write-md` to refresh `site/SITE-PAGES.md`.

Private pages (PIN-gated client reports `/timely/`, `/thenickel/`, `/eicher/`, `/internal/*`, the portal, unlisted pages)
are rows with class `private`: noindex, not in the sitemap, GA intentionally off. Do not add GA there without Parker and Counsel.

## Enforcement
- `npm run export:root` ends with `node scripts/check-pages.mjs`; a failure exits nonzero after the files are written, so do not commit.
- check-pages also fails any static or unguarded Google Analytics load anywhere in the deploy tree.
- `npm run check:pages` runs it alone. `node site/scripts/check-pages.mjs --base http://127.0.0.1:PORT` also checks HTTP status per row.
- `.github/workflows/deploy.yml` runs it right after checkout, before any gate config or FTP step: a failure blocks the deploy.
- `.github/workflows/monthly-publish.yml` runs it after the build, before the commit/upload.
