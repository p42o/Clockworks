/* MN Clockworks shared GA4 events (G-PSNYLVG4V1). One small script for every public page.
   Events:
     click_to_call    any tel: link              { link_location, page_path }
     click_to_email   any mailto: link           { link_location, page_path }
     book_cta_click   any link to /book/         { link_location, page_path }
     generate_lead    audit request sent (GA4 recommended name; fired by the /book/ form via a cw:event)
                                                 { form_id, page_path }
   Reduced data: no names, emails, numbers, link text, form values, query strings or hashes are sent.
   page_path is location.pathname only. link_location is header, footer or main.
   Global Privacy Control or Do Not Track: the script stops at once (no listeners, no events). */
(function () {
  if (window.__cwEvents) return;
  window.__cwEvents = true;
  var nav = window.navigator || {};
  // Global Privacy Control guard: stop before any listener is attached. This script never loads gtag.js itself.
  if (nav.globalPrivacyControl === true || nav.doNotTrack === "1" || window.doNotTrack === "1") return;
  var ALLOWED = { click_to_call: 1, click_to_email: 1, book_cta_click: 1, generate_lead: 1 };
  var PARAMS = { link_location: 1, page_path: 1, form_id: 1 };
  function send(name, params) {
    if (!ALLOWED[name]) return;
    var clean = { page_path: location.pathname };
    for (var k in params) if (PARAMS[k] && typeof params[k] === "string") clean[k] = params[k].slice(0, 40);
    if (typeof window.gtag !== "function") return; // no GA loader on this page: send nothing
    window.gtag("event", name, clean);
  }
  function where(el) {
    if (el.closest("header")) return "header";
    if (el.closest("footer")) return "footer";
    return "main";
  }
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/^tel:/i.test(href)) send("click_to_call", { link_location: where(a) });
    else if (/^mailto:/i.test(href)) send("click_to_email", { link_location: where(a) });
    else if (/^(https:\/\/mnclockworks\.com)?\/book\/?([?#].*)?$/.test(href)) send("book_cta_click", { link_location: where(a) });
  }, true);
  window.addEventListener("cw:event", function (e) {
    var d = (e && e.detail) || {};
    if (d.name === "generate_lead") send("generate_lead", { form_id: String(d.form_id || "") });
  });
})();
