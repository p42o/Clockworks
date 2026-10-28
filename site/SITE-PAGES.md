# Site page inventory (mnclockworks.com)

Generated from `site/pages.inventory.json` by `node site/scripts/check-pages.mjs --write-md`. Edit the JSON, not this file.
Rule (Parker, 2026-10-23): every new or changed page needs GA4 G-PSNYLVG4V1, title + meta description, absolute canonical,
the right robots call, a sitemap entry when indexed, at least one internal link, matching NAP + JSON-LD with (763) 296-9777, and a row here.
`check-pages.mjs` enforces it in `npm run export:root` and in the Deploy to Namecheap workflow before FTP.

Classes: public (served marketing page), error (404), redirect (file kept, .htaccess 301), gone (.htaccess 410), private (gated or unlisted; GA intentionally off).

| Path | Class | Purpose | GA | Robots | Sitemap | Canonical | Linked from |
|---|---|---|---|---|---|---|---|
| `/404.html` | error | Not-found page | yes | noindex | no | none | none (error page) |
| `/404/` | error | Not-found page (Next route copy) | yes | noindex | no | none | none (error page) |
| `/about/` | public | About Parker | yes | index | yes | `https://mnclockworks.com/about/` | footer (About Parker) |
| `/admin-bot.html` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/admin.html` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/blog/2026-05/your-ai-doesnt-know-you.html` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/blog/2026-06/anatomy-of-a-context-vault.html` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/blog/30-day-challenge.html` | gone | Legacy file, served 410 Gone by .htaccess | no | noindex | no | none | none |
| `/blog/30-day-challenge/` | gone | Legacy file, served 410 Gone by .htaccess | no | noindex | no | none | none |
| `/blog/ai-tools-ranked.html` | gone | Legacy file, served 410 Gone by .htaccess | no | noindex | no | none | none |
| `/blog/ai-tools-ranked/` | gone | Legacy file, served 410 Gone by .htaccess | no | noindex | no | none | none |
| `/blog/anatomy-of-a-context-vault/` | public | Blog post (noindex) | yes | noindex | no | `https://mnclockworks.com/blog/anatomy-of-a-context-vault/` | /blog/ |
| `/blog/cheap-vs-good-ai.html` | gone | Legacy file, served 410 Gone by .htaccess | no | noindex | no | none | none |
| `/blog/cheap-vs-good-ai/` | gone | Legacy file, served 410 Gone by .htaccess | no | noindex | no | none | none |
| `/blog/email-triage-tip.html` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/blog/email-triage-tip/` | public | Blog post (noindex) | yes | noindex | no | `https://mnclockworks.com/blog/email-triage-tip/` | /blog/ |
| `/blog/guide-to-claude.html` | gone | Legacy file, served 410 Gone by .htaccess | no | noindex | no | none | none |
| `/blog/guide-to-claude/` | gone | Legacy file, served 410 Gone by .htaccess | no | noindex | no | none | none |
| `/blog/` | public | Blog index (indexable since 2026-10-23); lists listed posts | yes | index | yes | `https://mnclockworks.com/blog/` | footer Pages (Blog) on Next pages + home footer |
| `/blog/prompting-101.html` | gone | Legacy file, served 410 Gone by .htaccess | no | noindex | no | none | none |
| `/blog/prompting-101/` | gone | Legacy file, served 410 Gone by .htaccess | no | noindex | no | none | none |
| `/blog/your-ai-doesnt-know-you/` | public | Blog post (noindex) | yes | noindex | no | `https://mnclockworks.com/blog/your-ai-doesnt-know-you/` | /blog/ |
| `/book/` | public | Book the free 15-minute audit | yes | index | yes | `https://mnclockworks.com/book/` | home CTAs + header CTA |
| `/contact/` | public | Contact: phone, Maple Grove, service towns | yes | index | yes | `https://mnclockworks.com/contact/` | footer Pages + service-area line |
| `/cowork/` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/how-it-works/` | public | How setup works, steps, FAQ | yes | index | yes | `https://mnclockworks.com/how-it-works/` | header nav + footer |
| `/` | public | Home (Parker's 2026-10-23 facelift, hand-built index.html) | yes | index | yes | `https://mnclockworks.com/` | every page header logo |
| `/lab/` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/lab/next.html` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/learn/index.backup.html` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/learn/` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/mg-splash-2026-ca0816/` | private | Retired: July 14, 2026 splash pad recap, PIN-gated. No inbound links, not in sitemap or portal. Kept (no delete), noindex (meta + X-Robots-Tag), GA off | no | noindex | no | none | none (unlisted link shared directly) |
| `/office/` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/portal/client/` | private | Client portal v3 (login app). GA off: ga.js was dropped from index.html in the Privacy Notice v2.0c bump (74e8d30) | no | noindex | no | none | header 'Client login' |
| `/portal/` | private | Portal sign-in door (clients + Parker). GA off by design | no | noindex | no | none | none (admin bookmark) |
| `/privacy.html` | redirect | Legacy privacy page (already carries GA). Served 301 to /portal/client/#/privacy-notice, which GA covers via portal/client/ga.js | yes | noindex | no | none | none |
| `/resources.html` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/results/` | redirect | Held: 301 to /how-it-works/ until Parker's tap (Counsel ruling 1) | no | noindex | no | none | none |
| `/sitesniper/` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/sniper/` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/sniper/thank-you.html` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/sprocket/` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/terms.html` | redirect | Legacy file, served 301 by .htaccess | no | noindex | no | none | none |
| `/terms/` | public | Public Starter Terms summary + links | yes | index | yes | `https://mnclockworks.com/terms/` | home 'Plain written terms' + every footer |
| `/what-i-do/` | public | Split page: the offers and the AI team | yes | index | yes | `https://mnclockworks.com/what-i-do/` | header nav + footer |
| `/your-own-agent/` | public | Split page: Front Desk / your own agent | yes | index | yes | `https://mnclockworks.com/your-own-agent/` | header nav + footer |
| `/timely/` | private | Timely Drywall client report, PIN gate (gate.php), own visit logging + privacy page | no | noindex | no | none | none (shared privately) |
| `/thenickel/` | private | The Nickel client report, PIN gate (gate.php) | no | noindex | no | none | none (shared privately) |
| `/eicher/` | private | Eicher client report/playbook, PIN gate (gate.php) | no | noindex | no | none | none (shared privately) |
| `/internal/timely-deploy/` | private | Internal Timely deploy prompt, PIN gate (gate.php) | no | noindex | no | none | none (shared privately) |
| `/portal/admin/` | private | Admin CRM (PGS Google admins only). GA off by design | no | noindex | no | none | none (door hands admins off here) |
| `/portal/client/preview.html` | private | Admin-only read-only View Customer Dashboard iframe. GA off by design | no | noindex | no | none | none (admin iframe) |
| `/v3/*` | redirect | Old v3 preview export, whole tree 301 to / by .htaccess | no | noindex | no | none | none |
