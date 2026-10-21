# Blog pull 2026-10-21 (branch blog-pull-2026-10-21)

Parker approved pulling invented or illustrative client-result posts (1:42 PM CT via Theo); Counsel signed off on the final list (1:50 PM CT via Sprocket).
Nothing here is deleted. `site/**` is excluded from the FTP deploy, so files in this folder are kept in git but not served.

- `webroot/blog/` holds the old built pages (`blog/<slug>/index.html` + `index.txt`), legacy `blog/<slug>.html`, and dated `blog/2026-0X/<slug>.html` copies, moved with `git mv`.
- Sources stay in `site/content/blog/` with `hold: true` (out of build, index, sitemap, manifest, and the monthly-publish run).
- The root `.htaccess` returns 410 Gone for every URL variant of the pulled slugs.

To restore a post: remove `hold: true`, `git mv` its files back, drop the slug from the 410 rule, rebuild (`npm run export:root` in site/).
