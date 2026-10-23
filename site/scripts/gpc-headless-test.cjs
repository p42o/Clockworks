// site/scripts/gpc-headless-test.cjs (Counsel ruling 2026-10-23): headless Global Privacy Control test.
// Usage: BASE=http://127.0.0.1:8094 PLAIN=http://127.0.0.1:8095 PLAYWRIGHT_CORE=/path/to/playwright-core node site/scripts/gpc-headless-test.cjs
//   BASE  = the deploy tree served with .htaccess (Apache); PLAIN = the same tree on a plain static server
//   (so /privacy.html is tested itself instead of its 301). Exit 1 on any failure.
const BASE = (process.env.BASE || 'http://127.0.0.1:8094').replace(/\/$/, '');
const PLAIN = (process.env.PLAIN || 'http://127.0.0.1:8095').replace(/\/$/, '');
// Headless GPC test: with navigator.globalPrivacyControl === true no request may go to Google Analytics hosts;
// with GPC off the GA4 tag must load. Google requests are recorded, then aborted (no real hits sent).
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const H = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/;
const PAGES = [
  ['home (facelift)', BASE + '/'], ['about', BASE + '/about/'], ['contact', BASE + '/contact/'],
  ['book', BASE + '/book/'], ['blog', BASE + '/blog/'], ['how-it-works', BASE + '/how-it-works/'],
  ['terms', BASE + '/terms/'], ['privacy.html (direct)', PLAIN + '/privacy.html'],
  ['portal signin', BASE + '/portal/client/#/signin'], ['portal privacy-notice', BASE + '/portal/client/#/privacy-notice'],
];
(async () => {
  const b = await chromium.launch(); let bad = 0; const out = [];
  for (const gpc of [true, false]) {
    const ctx = await b.newContext(gpc ? { extraHTTPHeaders: { 'Sec-GPC': '1' } } : {});
    if (gpc) await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true, configurable: true }));
    for (const [name, url] of PAGES) {
      const p = await ctx.newPage(); const reqs = [];
      await p.route(H, (r) => { reqs.push(r.request().url().replace(/\?.*/, '')); r.abort(); });
      await p.goto(url, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1500);
      let evt = 'n/a';
      const tel = await p.$('a[href^="tel:"]');
      if (tel && !name.startsWith('portal')) {
        await p.evaluate(() => document.addEventListener('click', (e) => e.preventDefault(), true));
        await tel.click({ force: true }).catch(() => {}); await p.waitForTimeout(300);
        evt = await p.evaluate(() => (window.dataLayer || []).some((a) => a && a[0] === 'event' && a[1] === 'click_to_call') ? 'click_to_call queued' : 'no event');
      }
      const dl = await p.evaluate(() => (window.dataLayer || []).filter((a) => a && (a[0] === 'config' || a[0] === 'event')).length);
      const gtagLoaded = reqs.some((u) => /gtag\/js/.test(u));
      const ok = gpc ? reqs.length === 0 && dl === 0 && evt !== 'click_to_call queued' : gtagLoaded && (evt === 'n/a' || evt === 'click_to_call queued');
      if (!ok) bad++;
      out.push(`${ok ? 'PASS' : 'FAIL'} GPC=${gpc ? 'on ' : 'off'} ${name.padEnd(22)} google requests=${reqs.length} gtag.js=${gtagLoaded} dataLayer config/event=${dl} tel click=${evt}`);
      await p.close();
    }
    await ctx.close();
  }
  await b.close(); console.log(out.join('\n')); console.log(bad ? `GPC TEST: ${bad} FAIL` : 'GPC TEST: all PASS'); process.exit(bad ? 1 : 0);
})();
