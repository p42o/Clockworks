/* Iris public site chat: the loader. Small on purpose: it decides whether Iris may appear,
   draws the launcher, and loads the chat panel (iris-panel.js + iris.css) only on first open.

   Flag `irisPublicChat` (ON since 2026-10-27; set IRIS_PUBLIC_CHAT_DEFAULT to false to turn it off site-wide):
     - Ship-wide:   set IRIS_PUBLIC_CHAT_DEFAULT below to true (needs Parker/Apex tap).
     - One browser: visit any marketing page with ?iris=on (stays on for that browser) or ?iris=off.
   The server has its own gate (IRIS_PUBLIC_CHAT=on on the Functions side). Both must be on for replies.

   Never mounts on /portal, admin pages, client report pages, or for a signed-in portal client. When in doubt, it stays hidden. */
(function () {
  'use strict';
  var IRIS_PUBLIC_CHAT_DEFAULT = true; // LIVE 2026-10-27 (Parker tap)
  var VERSION = '20261027b';
  var KEY = 'cw.iris.public';

  // ---------- flag ----------
  function store(get, k, v) {
    try { if (get) return localStorage.getItem(k); if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; }
  }
  var q = new URLSearchParams(location.search).get('iris');
  if (q === 'on') store(false, KEY, 'on');
  if (q === 'off') store(false, KEY, 'off');
  var pref = store(true, KEY);
  var flags = window.CW_FLAGS || {};
  var on = pref === 'on' || (pref !== 'off' && (flags.irisPublicChat === true || IRIS_PUBLIC_CHAT_DEFAULT));
  if (!on) return;

  // ---------- where Iris may appear: marketing pages only ----------
  var path = location.pathname.replace(/index\.html$/, '');
  var MARKETING = ['/about/', '/how-it-works/', '/what-i-do/', '/results/', '/your-own-agent/', '/contact/', '/book/', '/blog/', '/learn/'];
  var allowed = path === '/' || MARKETING.some(function (p) { return path === p || path.indexOf(p) === 0; });
  if (!allowed) return;

  // ---------- a signed-in portal client never sees the public chat ----------
  var CLIENT_KEY = 'firebase:authUser:AIzaSyB5sn7HYChDBS6MPD905Q0kUFWr5MmWn64:cw-client';
  function portalClient() {
    return new Promise(function (resolve) {
      try { if (sessionStorage.getItem(CLIENT_KEY)) return resolve(true); } catch (e) { /* private mode */ }
      if (!window.indexedDB) return resolve(false);
      var done = function (v) { resolve(v); };
      var t = setTimeout(function () { done(false); }, 800);
      try {
        var req = indexedDB.open('firebaseLocalStorageDb');
        req.onerror = function () { clearTimeout(t); done(false); };
        req.onupgradeneeded = function () { req.transaction.abort(); };
        req.onsuccess = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains('firebaseLocalStorage')) { db.close(); clearTimeout(t); return done(false); }
          var g = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').get(CLIENT_KEY);
          g.onsuccess = function () { db.close(); clearTimeout(t); done(!!g.result); };
          g.onerror = function () { db.close(); clearTimeout(t); done(false); };
        };
      } catch (e) { clearTimeout(t); done(false); }
    });
  }

  var BASE = document.currentScript ? document.currentScript.src.replace(/iris\.js.*$/, '') : '/iris/';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CSS = '' +
    '.iris-l{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:calc(max(18px,env(safe-area-inset-bottom)) + var(--iris-lift,0px));z-index:2147483000;' +
      'display:flex;align-items:center;gap:10px;font:500 14px/1.2 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;transition:bottom .35s cubic-bezier(.22,.7,.2,1),opacity .3s,transform .3s}' +
    '.iris-l.gone{opacity:0;transform:translateY(8px) scale(.96);pointer-events:none}' +
    '.iris-b{position:relative;width:60px;height:60px;border-radius:50%;border:0;padding:0;cursor:pointer;background:#fff;' +
      'box-shadow:0 0 0 1px rgba(26,25,22,.08),0 10px 28px -8px rgba(26,25,22,.35),0 2px 6px rgba(26,25,22,.12);transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s}' +
    '.iris-b img{width:100%;height:100%;border-radius:50%;display:block}' +
    '.iris-b:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 0 0 1px rgba(26,25,22,.08),0 16px 34px -10px rgba(26,25,22,.4),0 2px 6px rgba(26,25,22,.12)}' +
    '.iris-b:active{transform:scale(.96)}' +
    '.iris-b:focus-visible{outline:2px solid #D4582A;outline-offset:3px}' +
    '.iris-b i{position:absolute;right:2px;bottom:3px;width:13px;height:13px;border-radius:50%;background:#3F7A55;border:2.5px solid #fff}' +
    '.iris-p{max-width:220px;background:#fff;color:#1A1916;border-radius:16px 16px 4px 16px;padding:10px 12px 10px 14px;display:flex;align-items:center;gap:8px;' +
      'box-shadow:0 0 0 1px rgba(26,25,22,.07),0 12px 30px -12px rgba(26,25,22,.35);cursor:pointer;animation:irisPeek .5s cubic-bezier(.34,1.56,.64,1) both}' +
    '.iris-p b{font-weight:600}.iris-p button{border:0;background:none;color:#8A857B;font-size:18px;line-height:1;width:28px;height:28px;margin:-4px -6px -4px 0;cursor:pointer;border-radius:8px}' +
    '.iris-p button:hover{background:#F5F1E8;color:#1A1916}' +
    '@keyframes irisPeek{from{opacity:0;transform:translateY(8px) scale(.95)}to{opacity:1;transform:none}}' +
    '@media (prefers-reduced-motion:reduce){.iris-l,.iris-b{transition:none}.iris-p{animation:none}}' +
    '@media (max-width:640px){.iris-b{width:56px;height:56px}.iris-p{display:none}}' +
    /* The older Front Desk widget on Next.js pages gives its corner to Iris while Iris is on. */
    'html[data-iris="on"] .fixed.bottom-5.right-5{display:none!important}';

  function mount() {
    var st = document.createElement('style'); st.id = 'iris-launcher-css'; st.textContent = CSS; document.head.appendChild(st);
    document.documentElement.setAttribute('data-iris', 'on');
    var wrap = document.createElement('div'); wrap.className = 'iris-l';
    wrap.innerHTML = '<button type="button" class="iris-b" aria-label="Chat with Iris, the MN Clockworks AI assistant" aria-haspopup="dialog" aria-expanded="false">' +
      '<img src="' + BASE + 'iris-avatar.svg?v=' + VERSION + '" alt="" width="60" height="60"><i aria-hidden="true"></i></button>';
    document.body.appendChild(wrap);
    var btn = wrap.querySelector('.iris-b');

    // Keep clear of anything fixed to the bottom of the page (a sticky CTA bar, a cookie bar).
    function lift() {
      var h = 0;
      document.querySelectorAll('[data-iris-avoid]').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.height && r.bottom >= innerHeight - 2) h = Math.max(h, r.height + 10);
      });
      wrap.style.setProperty('--iris-lift', h + 'px');
    }
    lift(); addEventListener('resize', lift, { passive: true }); addEventListener('scroll', lift, { passive: true });

    // Load the panel on first intent. Hover or focus warms it up so the open feels instant.
    var panel = null;
    function load() {
      if (!panel) {
        var link = document.createElement('link'); link.rel = 'stylesheet'; link.href = BASE + 'iris.css?v=' + VERSION; document.head.appendChild(link);
        panel = import(BASE + 'iris-panel.js?v=' + VERSION);
      }
      return panel;
    }
    btn.addEventListener('pointerenter', load, { once: true });
    btn.addEventListener('focus', load, { once: true });
    btn.addEventListener('click', function () {
      peek && peek.remove(); markPeek();
      load().then(function (m) {
        m.open({ base: BASE, version: VERSION, launcher: btn, wrap: wrap });
      }).catch(function () { location.href = '/book/'; });
    });

    // One gentle hello per browser session, desktop only, after the visitor has had a moment.
    var peek = null;
    function markPeek() { try { sessionStorage.setItem('cw.iris.peeked', '1'); } catch (e) { /* ignore */ } }
    var peeked = false; try { peeked = !!sessionStorage.getItem('cw.iris.peeked'); } catch (e) { /* ignore */ }
    if (!peeked && !reduce && matchMedia('(min-width:641px) and (pointer:fine)').matches) {
      setTimeout(function () {
        if (document.querySelector('.iris-panel')) return;
        peek = document.createElement('div'); peek.className = 'iris-p'; peek.setAttribute('role', 'note');
        peek.innerHTML = '<span>Questions? I’m <b>Iris</b>. Ask me anything about setup or pricing.</span><button type="button" aria-label="Dismiss">×</button>';
        wrap.insertBefore(peek, btn);
        peek.querySelector('button').addEventListener('click', function (e) { e.stopPropagation(); peek.remove(); markPeek(); });
        peek.addEventListener('click', function () { btn.click(); });
        markPeek();
        setTimeout(function () { peek && peek.remove(); }, 12000);
      }, 7000);
    }
  }

  portalClient().then(function (isClient) {
    if (isClient) return;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  });
})();
