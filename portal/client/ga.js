// GA4 (G-PSNYLVG4V1) for the client portal's signed-out pages only. Parker's page rule, 2026-10-23.
// - Loads after the inline invite/reset scrub in index.html, so tokens are already out of the address bar.
// - No automatic page_view. A page_view is sent only on the routes in OPEN below, with a cleaned
//   location (origin + path + route name). Query strings, route params and tokens are never sent.
// - On every other route (signed-in client views, invite, verify, reset-confirm, privacy request)
//   GA is switched off with Google's own opt-out flag, so it sends nothing there.
// - Global Privacy Control guard: under GPC (or Do Not Track) it returns before anything is queued,
//   so gtag.js is never requested and no page_view is sent. check-pages enforces the guard.
(function () {
  var ID = "G-PSNYLVG4V1";
  var OPEN = { signin: 1, privacy: 1, terms: 1, "starter-terms": 1, "privacy-notice": 1, reset: 1, locked: 1 };
  var nav = window.navigator || {};
  if (nav.globalPrivacyControl === true || nav.doNotTrack === "1" || window.doNotTrack === "1") { window["ga-disable-" + ID] = true; return; }
  function route() {
    var h = (location.hash || "").replace(/^#\/?/, "").split("?")[0].replace(/\/+$/, "");
    return h || "home";
  }
  function clean(name) { return location.origin + location.pathname + "#/" + name; }
  var r0 = route();
  window["ga-disable-" + ID] = !OPEN[r0];
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag("js", new Date());
  gtag("config", ID, {
    send_page_view: false,
    page_location: clean(OPEN[r0] ? r0 : "app"),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  var last = null;
  function onRoute() {
    var r = route();
    var open = !!OPEN[r];
    window["ga-disable-" + ID] = !open;
    if (!open || r === last) { if (!open) last = null; return; }
    last = r;
    gtag("set", { page_location: clean(r), page_title: "Client portal: " + r });
    gtag("event", "page_view", { page_location: clean(r), page_title: "Client portal: " + r });
  }
  window.addEventListener("hashchange", onRoute);
  onRoute();
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
  document.head.appendChild(s);
})();
