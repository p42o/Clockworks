/**
 * contact-modal.js — shared contact form popup
 * Loads destination settings from Firestore (formSettings doc).
 * Falls back to hardcoded Discord webhook if Firebase is unavailable.
 * Logs every submission to Firestore formLogs collection.
 */
(function () {
  /* ── Firebase config (same project as main site) ─────────────────────────── */
  const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyAgYsFRypLXu5yym-KIRS9GXqcRWGwrtkA",
    authDomain:        "stonearchai.firebaseapp.com",
    projectId:         "stonearchai",
    storageBucket:     "stonearchai.firebasestorage.app",
    messagingSenderId: "815481121273",
    appId:             "1:815481121273:web:182d13a485f645c9bdf528"
  };

  // Fallback webhook if Firestore settings can't be loaded
  const FALLBACK_DISCORD_WEBHOOK =
    'https://discord.com/api/webhooks/1489040629332840500/8EolpZvDZTiCZJmmrSI-SZJTjsktMxbFop4_B4DHyCuMuhClg_vU277Kx-ub7VylgYql';

  /* ── State ─────────────────────────────────────────────────────────────────── */
  let _db = null;
  let _formSettings = null;  // { destination, discordWebhook, emailAddress }
  let _settingsLoaded = false;

  /* ── Bootstrap Firebase ────────────────────────────────────────────────────── */
  function ensureFirebase() {
    return new Promise(resolve => {
      if (typeof firebase !== 'undefined') {
        try {
          // Use existing app if already initialized, or initialize
          const app = firebase.apps.length
            ? firebase.app()
            : firebase.initializeApp(FIREBASE_CONFIG, 'contact-modal');
          _db = app.firestore ? app.firestore() : firebase.firestore();
        } catch(e) {
          // May already be initialized under default name
          try { _db = firebase.firestore(); } catch(_) {}
        }
        resolve();
        return;
      }

      // Dynamically load Firebase if not present
      const scripts = [
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
      ];
      let loaded = 0;
      scripts.forEach(src => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => {
          loaded++;
          if (loaded === scripts.length) {
            try {
              firebase.initializeApp(FIREBASE_CONFIG, 'contact-modal');
              _db = firebase.app('contact-modal').firestore();
            } catch(e) {
              try { _db = firebase.firestore(); } catch(_) {}
            }
            resolve();
          }
        };
        s.onerror = () => { loaded++; if (loaded === scripts.length) resolve(); };
        document.head.appendChild(s);
      });
    });
  }

  async function loadFormSettings() {
    if (_settingsLoaded) return;
    _settingsLoaded = true;
    try {
      await ensureFirebase();
      if (!_db) return;
      const doc = await _db.collection('siteContent').doc('formSettings').get();
      if (doc.exists) _formSettings = doc.data();
    } catch(e) {
      console.warn('[contact-modal] Could not load form settings:', e);
    }
  }

  async function logSubmission(fields, status) {
    try {
      if (!_db) return;
      await _db.collection('formLogs').add({
        ...fields,
        destination: _formSettings?.destination || 'discord',
        status,
        page: window.location.pathname,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch(e) {
      console.warn('[contact-modal] Could not log submission:', e);
    }
  }

  /* ── Styles ────────────────────────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    #cw-contact-overlay {
      display: none; position: fixed; inset: 0; z-index: 9000;
      background: rgba(28,35,51,0.55); backdrop-filter: blur(4px);
      align-items: center; justify-content: center; padding: 20px;
    }
    #cw-contact-overlay.open { display: flex; }
    #cw-contact-card {
      background: #fff; border-radius: 20px; width: 100%; max-width: 480px;
      padding: 36px 32px; position: relative;
      box-shadow: 0 24px 64px rgba(28,35,51,0.22), 0 4px 16px rgba(28,35,51,0.10);
      transform: translateY(16px) scale(0.97);
      transition: transform 0.25s ease;
    }
    #cw-contact-overlay.open #cw-contact-card { transform: translateY(0) scale(1); }
    #cw-contact-close {
      position: absolute; top: 14px; right: 14px;
      width: 32px; height: 32px; border-radius: 8px; border: none;
      background: transparent; color: #94a3b8; font-size: 20px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background 0.15s, color 0.15s;
    }
    #cw-contact-close:hover { background: #f1f5f9; color: #1C2333; }
    #cw-contact-label {
      font-size: 11px; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase; color: #A86C35; margin-bottom: 8px;
    }
    #cw-contact-heading {
      font-family: 'Instrument Serif', Georgia, serif; font-size: 26px;
      color: #1C2333; line-height: 1.2; margin-bottom: 6px;
    }
    #cw-contact-sub {
      font-size: 13px; color: #64748b; margin-bottom: 24px; line-height: 1.6;
    }
    .cw-field { margin-bottom: 14px; }
    .cw-label {
      display: block; font-size: 11px; font-weight: 600; color: #64748b;
      margin-bottom: 5px; letter-spacing: 0.5px; text-transform: uppercase;
    }
    .cw-input, .cw-textarea {
      width: 100%; padding: 11px 13px; border-radius: 10px;
      border: 1.5px solid rgba(28,35,51,0.18); background: #fff;
      color: #334155; font-family: 'Inter', system-ui, sans-serif;
      font-size: 14px; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .cw-input:focus, .cw-textarea:focus {
      border-color: #C4834A; box-shadow: 0 0 0 3px rgba(196,131,74,0.10);
    }
    .cw-input::placeholder, .cw-textarea::placeholder { color: #94a3b8; }
    .cw-textarea { resize: vertical; min-height: 100px; }
    #cw-contact-submit {
      width: 100%; padding: 13px 24px; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #A86C35, #C4834A); color: #fff;
      font-family: 'Inter', system-ui, sans-serif; font-weight: 700; font-size: 15px;
      box-shadow: 0 4px 18px rgba(196,131,74,0.30); cursor: pointer;
      transition: filter 0.2s, transform 0.2s; margin-top: 6px;
    }
    #cw-contact-submit:hover:not(:disabled) { filter: brightness(1.07); transform: translateY(-1px); }
    #cw-contact-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    #cw-contact-success {
      display: none; text-align: center; padding: 16px 0 8px;
    }
    #cw-contact-success .cw-success-icon {
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(34,197,94,0.10); display: flex;
      align-items: center; justify-content: center; margin: 0 auto 16px;
    }
    #cw-contact-success h3 {
      font-family: 'Instrument Serif', Georgia, serif;
      font-size: 22px; color: #1C2333; margin-bottom: 8px;
    }
    #cw-contact-success p { font-size: 14px; color: #64748b; line-height: 1.65; }
    @keyframes cw-spin { to { transform: rotate(360deg); } }
    .cw-spinning { display: inline-block; animation: cw-spin 0.9s linear infinite; }
  `;
  document.head.appendChild(style);

  /* ── HTML ──────────────────────────────────────────────────────────────────── */
  const overlay = document.createElement('div');
  overlay.id = 'cw-contact-overlay';
  overlay.innerHTML = `
    <div id="cw-contact-card" role="dialog" aria-modal="true" aria-labelledby="cw-contact-heading">
      <button id="cw-contact-close" aria-label="Close contact form">&times;</button>
      <p id="cw-contact-label">Get in Touch</p>
      <h2 id="cw-contact-heading">Send a message</h2>
      <p id="cw-contact-sub">I'll get back to you within 1 business day.</p>
      <form id="cw-contact-form" novalidate>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="cw-field">
            <label class="cw-label" for="cw-name">Name</label>
            <input class="cw-input" id="cw-name" type="text" placeholder="Jane Smith" required autocomplete="name" />
          </div>
          <div class="cw-field">
            <label class="cw-label" for="cw-email">Email</label>
            <input class="cw-input" id="cw-email" type="email" placeholder="jane@yourco.com" required autocomplete="email" />
          </div>
        </div>
        <div class="cw-field">
          <label class="cw-label" for="cw-subject">Subject</label>
          <input class="cw-input" id="cw-subject" type="text" placeholder="What's this about?" />
        </div>
        <div class="cw-field">
          <label class="cw-label" for="cw-message">Message <span style="color:#C4834A;">*</span></label>
          <textarea class="cw-textarea" id="cw-message" placeholder="Tell me what's on your mind…" required></textarea>
        </div>
        <button type="submit" id="cw-contact-submit">Send Message &rarr;</button>
      </form>
      <div id="cw-contact-success">
        <div class="cw-success-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3>Message sent!</h3>
        <p>Thanks for reaching out. I'll review your message and get back to you within 1 business day.</p>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  /* ── Close behavior ────────────────────────────────────────────────────────── */
  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('cw-contact-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  /* ── Form submit ───────────────────────────────────────────────────────────── */
  const form       = document.getElementById('cw-contact-form');
  const submitBtn  = document.getElementById('cw-contact-submit');
  const successDiv = document.getElementById('cw-contact-success');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name    = document.getElementById('cw-name').value.trim();
    const email   = document.getElementById('cw-email').value.trim();
    const subject = document.getElementById('cw-subject').value.trim();
    const message = document.getElementById('cw-message').value.trim();

    if (!name || !email || !message) {
      [['cw-name', name], ['cw-email', email], ['cw-message', message]].forEach(([id, val]) => {
        document.getElementById(id).style.borderColor = val ? '' : '#ef4444';
      });
      return;
    }

    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<span class="cw-spinning">⚙</span>&nbsp; Sending…';

    // Load settings (cached after first load)
    await loadFormSettings();

    const fields = { name, email, subject, message };
    const dest   = _formSettings?.destination || 'discord';
    let   ok     = false;

    try {
      if (dest === 'email') {
        // Email delivery requires a backend; for now fall through to Discord fallback
        const emailAddr = _formSettings?.emailAddress;
        if (emailAddr) {
          // Attempt mailto as last resort (opens email client)
          // A real implementation would POST to a backend/Formspree/EmailJS
          console.warn('[contact-modal] Email delivery not fully implemented; using Discord fallback.');
        }
        // Fall through to Discord
        ok = await sendToDiscord(name, email, subject, message, FALLBACK_DISCORD_WEBHOOK);
      } else {
        const webhook = _formSettings?.discordWebhook || FALLBACK_DISCORD_WEBHOOK;
        ok = await sendToDiscord(name, email, subject, message, webhook);
      }
    } catch(err) {
      ok = false;
    }

    await logSubmission(fields, ok ? 'sent' : 'failed');

    if (ok) {
      form.style.display       = 'none';
      successDiv.style.display = 'block';
    } else {
      submitBtn.disabled  = false;
      submitBtn.innerHTML = 'Send Message &rarr;';
      const errEl = document.createElement('p');
      errEl.style.cssText = 'color:#ef4444;font-size:13px;margin-top:10px;text-align:center;';
      errEl.textContent = 'Something went wrong — please try again.';
      form.appendChild(errEl);
      setTimeout(() => errEl.remove(), 6000);
    }
  });

  async function sendToDiscord(name, email, subject, message, webhookUrl) {
    const sourcePage = window.location.pathname.replace(/\/$/, '') || '/';
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '💬 New Contact Message',
          color: 0xC4834A,
          fields: [
            { name: 'Name',    value: name,                  inline: true  },
            { name: 'Email',   value: email,                 inline: true  },
            { name: 'Subject', value: subject || '(none)',   inline: false },
            { name: 'Message', value: message.length > 1024 ? message.slice(0,1021)+'…' : message, inline: false },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Sent from ' + sourcePage },
        }]
      }),
    });
    return res.ok;
  }

  /* ── Public API ────────────────────────────────────────────────────────────── */
  window.openContactModal = function () {
    form.style.display       = '';
    successDiv.style.display = 'none';
    submitBtn.disabled       = false;
    submitBtn.innerHTML      = 'Send Message &rarr;';
    form.reset();
    ['cw-name','cw-email','cw-message'].forEach(id => {
      document.getElementById(id).style.borderColor = '';
    });
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('cw-name').focus(), 100);

    // Pre-load settings in background
    loadFormSettings();
  };
})();
