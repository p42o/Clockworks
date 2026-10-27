// Iris public site chat: the panel. Loaded by iris.js on first open, never before.
// Talks to two Firebase Functions over plain fetch (no Firebase SDK on marketing pages):
//   irisPublicSession  (callable) after the visitor accepts the disclosure -> { sessionId, greeting }
//   irisPublicChat     (HTTP, streamed) { sessionId, text } -> the reply as text/plain chunks
// The server stores the full transcript. This tab keeps a copy in sessionStorage so a reload doesn't lose it.

// Exact copy of TRANSCRIPTS.md "Required UX disclosure" (Box pack 2026-10-26). Keep in sync with the server's DISCLOSURE_VERSION.
const DISCLOSURE_TITLE = 'Iris site chat';
const DISCLOSURE = "This chat is with Iris, MN Clockworks' AI assistant (not a live person). We store the full transcript so Parker can review it later if needed. The chat may be processed by our AI service providers under our Privacy Notice. Do not send passwords, codes, card numbers, or other people's sensitive information.";
const DISCLOSURE_AGREE = 'By sending a message, you agree to this.';
const PRIVACY_URL = '/portal/client/#/privacy-notice';
const PHONE = '(763) 296-9777';
const TEL = 'tel:+17632969777';
const BOOK = 'https://mnclockworks.com/book/';
const STARTERS = ['What does it cost?', 'How does setup work?', 'Will it send things without me?', 'Can I talk to Parker?'];
const STATE_KEY = 'cw.iris.state';
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

function apiBase() {
  if (LOCAL) {
    // Local only: ?irisApi=5011 points at a Functions emulator on that port (kept for this tab's browser).
    const port = new URLSearchParams(location.search).get('irisApi');
    if (/^\d{4,5}$/.test(port || '')) { try { localStorage.setItem('cw.iris.api', `http://127.0.0.1:${port}/demo-clockworks-v3/us-central1/`); } catch { /* ignore */ } }
    let o = null; try { o = localStorage.getItem('cw.iris.api'); } catch { /* ignore */ }
    return o || 'http://127.0.0.1:5001/demo-clockworks-v3/us-central1/';
  }
  return 'https://us-central1-clockworks-portal-pgs.cloudfunctions.net/';
}

async function call(name, data) {
  let resp;
  try {
    resp = await fetch(apiBase() + name, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
  } catch {
    const e = new Error('network'); e.code = 'network'; throw e;
  }
  let body = null; try { body = await resp.json(); } catch { /* ignore */ }
  if (body && body.result) return body.result;
  const e = new Error(body?.error?.message || `http_${resp.status}`);
  e.code = body?.error?.message || `http_${resp.status}`;
  throw e;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Escape first, then turn our own links and the phone number into links. Nothing from the model becomes HTML.
function rich(text) {
  return esc(text)
    .replace(/https:\/\/mnclockworks\.com\/[A-Za-z0-9/_#.-]*/g, (u) => `<a href="${u}">${u.replace('https://', '')}</a>`)
    .replace(/\(763\) 296-9777/g, `<a href="${TEL}">${PHONE}</a>`)
    .replace(/\n/g, '<br>');
}

function load() { try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null'); } catch { return null; } }
function save(s) { try { sessionStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* private mode */ } }

const FRIENDLY = {
  iris_public_off: `Iris isn't taking chats right now. Parker can follow up: call <a href="${TEL}">${PHONE}</a> or <a href="${BOOK}">book the free phone audit</a>.`,
  iris_public_busy: `A lot of people are chatting at once. Give it a minute, or call <a href="${TEL}">${PHONE}</a> and Parker can follow up.`,
  iris_public_provider_unavailable: `I'm having trouble answering right now. Parker can follow up: call <a href="${TEL}">${PHONE}</a> or <a href="${BOOK}">book a time</a>.`,
  session_full: `We've covered a lot. The best next step is a quick call with Parker: <a href="${TEL}">${PHONE}</a> or <a href="${BOOK}">book a time</a>.`,
  network: `I couldn't connect just now. Check your connection and try again. You can always reach Parker at <a href="${TEL}">${PHONE}</a>.`,
};
const friendly = (code) => FRIENDLY[code] || FRIENDLY.iris_public_provider_unavailable;

let ui = null;

export function open(opts) {
  if (!ui) ui = build(opts);
  ui.show();
}

function build({ base, version, launcher, wrap }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state = load() || { sid: null, msgs: [] };
  let busy = false;

  const root = document.createElement('div');
  root.className = 'iris-panel';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'iris-title');
  root.hidden = true;
  root.innerHTML = `
    <header class="ip-h">
      <img src="${base}iris-avatar.svg?v=${version}" alt="" width="40" height="40">
      <div><h2 id="iris-title">Iris</h2><p><span class="ip-dot" aria-hidden="true"></span>MN Clockworks AI assistant</p></div>
      <button type="button" class="ip-x" aria-label="Close chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </header>
    <div class="ip-body" tabindex="-1">
      <ol class="ip-log" aria-label="Conversation"></ol>
    </div>
    <div class="ip-foot">
      <div class="ip-chips" hidden></div>
      <form class="ip-form" hidden>
        <label class="sr" for="iris-input">Message Iris</label>
        <textarea id="iris-input" rows="1" maxlength="1000" placeholder="Ask Iris a question" enterkeyhint="send" autocomplete="off"></textarea>
        <button type="submit" class="ip-send" aria-label="Send message" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg></button>
      </form>
      <p class="ip-legal">Iris (AI) · chat stored · <a href="${PRIVACY_URL}">Privacy Notice</a></p>
    </div>
    <div class="sr" aria-live="polite" data-live></div>`;
  document.body.appendChild(root);

  const log = root.querySelector('.ip-log');
  const body = root.querySelector('.ip-body');
  const form = root.querySelector('.ip-form');
  const input = root.querySelector('#iris-input');
  const send = root.querySelector('.ip-send');
  const chips = root.querySelector('.ip-chips');
  const live = root.querySelector('[data-live]');
  const avatar = `<img class="ip-av" src="${base}iris-avatar.svg?v=${version}" alt="" width="28" height="28">`;

  const scroll = () => { body.scrollTop = body.scrollHeight; };
  const announce = (t) => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 60); };

  function bubble(role, html, { fresh = false } = {}) {
    const li = document.createElement('li');
    li.className = `ip-m ${role === 'user' ? 'me' : 'iris'}${fresh ? ' fresh' : ''}`;
    li.innerHTML = role === 'user' ? `<p>${html}</p>` : `${avatar}<p>${html}</p>`;
    log.appendChild(li);
    scroll();
    return li;
  }
  function note(html, action) {
    const li = document.createElement('li');
    li.className = 'ip-note';
    li.innerHTML = `<p>${html}</p>`;
    if (action) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ip-btn ghost'; b.textContent = action.label;
      b.addEventListener('click', action.run); li.appendChild(b);
    }
    log.appendChild(li); scroll();
    return li;
  }

  function renderIntro() {
    log.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'ip-intro';
    li.innerHTML = `
      <img src="${base}iris-avatar.svg?v=${version}" alt="" width="72" height="72">
      <h3>Hi, I'm Iris.</h3>
      <p class="ip-lead">Ask about the AI team, setup, or pricing. Parker can follow up.</p>
      <div class="ip-disc" id="iris-disc"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z"/><path d="M12 10v4.5M12 7.5h.01"/></svg><div><b>${esc(DISCLOSURE_TITLE)}</b><p>${esc(DISCLOSURE).replace('Privacy Notice', `<a href="${PRIVACY_URL}">Privacy Notice</a>`)}</p><p>${esc(DISCLOSURE_AGREE)}</p></div></div>
      <button type="button" class="ip-btn" data-start aria-describedby="iris-disc">Start chat</button>
      <p class="ip-alt">Rather talk? <a href="${TEL}">Call ${PHONE}</a></p>`;
    log.appendChild(li);
    form.hidden = true; chips.hidden = true;
    const start = li.querySelector('[data-start]');
    start.addEventListener('click', async () => {
      start.disabled = true; start.setAttribute('aria-busy', 'true');
      try {
        const r = await call('irisPublicSession', { accepted: true, page: location.pathname, referrer: document.referrer.slice(0, 200) });
        state = { sid: r.sessionId, msgs: [{ r: 'assistant', t: r.greeting }] };
        save(state);
        renderChat(true);
      } catch (e) {
        start.disabled = false; start.removeAttribute('aria-busy');
        li.querySelector('.ip-err')?.remove();
        const p = document.createElement('p'); p.className = 'ip-err'; p.setAttribute('role', 'alert'); p.innerHTML = friendly(e.code);
        start.after(p);
      }
    });
    setTimeout(() => start.focus(), reduce ? 0 : 220);
  }

  function renderChat(fresh) {
    log.innerHTML = '';
    state.msgs.forEach((m, i) => bubble(m.r === 'user' ? 'user' : 'assistant', m.r === 'user' ? esc(m.t) : rich(m.t), { fresh: fresh && i === state.msgs.length - 1 }));
    form.hidden = false;
    const userTurns = state.msgs.filter((m) => m.r === 'user').length;
    chips.hidden = userTurns > 0;
    if (!chips.hidden) {
      chips.innerHTML = STARTERS.map((s) => `<button type="button" class="ip-chip">${esc(s)}</button>`).join('');
      chips.querySelectorAll('.ip-chip').forEach((c) => c.addEventListener('click', () => ask(c.textContent)));
    }
    if (fresh) announce(state.msgs[state.msgs.length - 1].t);
    setTimeout(() => input.focus({ preventScroll: true }), reduce ? 0 : 200);
  }

  // Stream the reply straight into the bubble as it arrives. Errors before the first chunk come back as JSON.
  async function streamReply(text, onText) {
    let resp;
    try {
      resp = await fetch(apiBase() + 'irisPublicChat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: state.sid, text }) });
    } catch { const e = new Error('network'); e.code = 'network'; throw e; }
    if (!resp.ok || !resp.body) {
      let code = `http_${resp.status}`; try { code = (await resp.json()).error || code; } catch { /* ignore */ }
      const e = new Error(code); e.code = code; throw e;
    }
    const reader = resp.body.getReader(); const dec = new TextDecoder(); let full = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      full += dec.decode(value, { stream: true });
      onText(full);
    }
    full += dec.decode();
    if (!full.trim()) { const e = new Error('empty'); e.code = 'iris_public_provider_unavailable'; throw e; }
    return full;
  }

  async function ask(text) {
    text = String(text || '').trim();
    if (!text || busy || !state.sid) return;
    busy = true; chips.hidden = true;
    input.value = ''; grow(); sync();
    state.msgs.push({ r: 'user', t: text }); save(state);
    bubble('user', esc(text), { fresh: true });
    const li = document.createElement('li');
    li.className = 'ip-m iris typing';
    li.innerHTML = `${avatar}<p aria-label="Iris is typing"><i></i><i></i><i></i></p>`;
    log.appendChild(li); scroll();
    const p = li.querySelector('p');
    try {
      const reply = await streamReply(text, (sofar) => {
        if (li.classList.contains('typing')) { li.classList.remove('typing'); p.removeAttribute('aria-label'); }
        p.textContent = sofar; scroll();
      });
      p.innerHTML = rich(reply); scroll();
      announce(reply);
      state.msgs.push({ r: 'assistant', t: reply }); save(state);
    } catch (e) {
      li.remove();
      if (e.code === 'session_gone') {
        state = { sid: null, msgs: [] }; save(state);
        note('This chat timed out. Start a fresh one and pick up where you left off.', { label: 'Start a new chat', run: () => renderIntro() });
      } else {
        note(friendly(e.code));
      }
    } finally {
      busy = false; sync();
    }
  }

  function grow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }
  function sync() { send.disabled = busy || !input.value.trim(); }
  input.addEventListener('input', () => { grow(); sync(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); }
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });

  // ---------- open / close, focus trap ----------
  function focusables() {
    return [...root.querySelectorAll('a[href],button:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter((el) => !el.closest('[hidden]') && el.offsetParent !== null);
  }
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  root.querySelector('.ip-x').addEventListener('click', () => hide());

  function show() {
    if (!root.hidden) return;
    root.hidden = false;
    wrap.classList.add('gone');
    launcher.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('iris-open');
    root.classList.remove('out'); void root.offsetWidth; root.classList.add('in');
    if (state.sid && state.msgs.length) renderChat(false); else renderIntro();
  }
  function hide() {
    if (root.hidden) return;
    launcher.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('iris-open');
    const done = () => { root.hidden = true; root.classList.remove('out'); wrap.classList.remove('gone'); launcher.focus({ preventScroll: true }); };
    if (reduce) { done(); return; }
    root.classList.remove('in'); root.classList.add('out');
    setTimeout(done, 200);
  }
  return { show, hide };
}
