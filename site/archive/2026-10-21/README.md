# Archive, 2026-10-21 (V2 Counsel fix pass)

Moved out of the webroot and out of the blog build. Nothing was deleted. Restore with `git mv` back to the same relative path.

- `webroot/` mirrors the repo root (the FTP webroot). `site/**` is excluded from the FTP deploy, so nothing here is published.
- `site-content-blog/` holds the markdown sources from `site/content/blog/`.

| Item | Why | URL response now |
|---|---|---|
| /preview/ | Legacy preview page (old offer copy) | 301 to / (Counsel) |
| trades-pivot | Counsel: 410. Jobber, "most callers", text-back | 410 |
| what-a-pilot-buys | Counsel: 410 (pilot offer) | 410 |
| anatomy-of-a-missed-call | "most callers", text-back | 404 (410 staged) |
| heating-season-software | missed-call text-back | 404 (410 staged) |
| truck-cab-ai-playbook | missed-call text-back, follow-up texts | 404 (410 staged) |
| lead-response-workflow | Jobber, SMS, texting service | 404 (410 staged) |
| 2026-outlook | Jobber | 404 (410 staged) |
| ai-vs-automation | "A customer texts you" | 404 (410 staged) |
| 5-ai-tools-small-business-2026 | "send you a text notification" | 404 (410 staged) |
| year-end-paper-pile | Held post (Nov 3). Jobber | never built |
| first-season-notes | Held post (Dec 1). Jobber | never built |

client-story was left in place (Counsel). Restoring any post needs Parker's blog keepers call.
