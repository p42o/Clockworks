/**
 * contact-modal.js — shared contact form popup
 * Wired to Discord webhook. Include on any page, then call openContactModal().
 */
(function () {
  const DISCORD_WEBHOOK =
    'https://discord.com/api/webhooks/1489040629332840500/8EolpZvDZTiCZJmmrSI-SZJTjsktMxbFop4_B4DHyCuMuhClg_vU277Kx-ub7VylgYql';

  // ── Inject styles ────────────────────────────────────────────────────────────
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

  // ── Inject HTML ──────────────────────────────────────────────────────────────
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

  // ── Wire up close / backdrop ─────────────────────────────────────────────────
  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('cw-contact-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  // ── Form submission ──────────────────────────────────────────────────────────
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
      // Simple highlight for empty required fields
      [['cw-name', name], ['cw-email', email], ['cw-message', message]].forEach(([id, val]) => {
        const el = document.getElementById(id);
        el.style.borderColor = val ? '' : '#ef4444';
      });
      return;
    }

    submitBtn.disabled   = true;
    submitBtn.innerHTML  = '<span class="cw-spinning">⚙</span>&nbsp; Sending…';

    const sourcePage = window.location.pathname.replace(/\/$/, '') || '/';

    const payload = {
      embeds: [{
        title: '💬 New Contact Message',
        color: 0xC4834A,
        fields: [
          { name: 'Name',    value: name,                 inline: true  },
          { name: 'Email',   value: email,                inline: true  },
          { name: 'Subject', value: subject || '(none)',  inline: false },
          { name: 'Message', value: message.length > 1024 ? message.slice(0, 1021) + '…' : message, inline: false },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Sent from ' + sourcePage },
      }]
    };

    try {
      const res = await fetch(DISCORD_WEBHOOK, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (res.ok) {
        form.style.display       = 'none';
        successDiv.style.display = 'block';
      } else {
        throw new Error('Discord returned ' + res.status);
      }
    } catch (err) {
      console.error('Contact modal webhook failed:', err);
      submitBtn.disabled  = false;
      submitBtn.innerHTML = 'Send Message &rarr;';
      const errEl = document.createElement('p');
      errEl.style.cssText = 'color:#ef4444;font-size:13px;margin-top:10px;text-align:center;';
      errEl.textContent = 'Something went wrong — please try again.';
      document.getElementById('cw-contact-form').appendChild(errEl);
      setTimeout(() => errEl.remove(), 6000);
    }
  });

  // Reset form state when modal is reopened
  window.openContactModal = function () {
    // Reset if previously submitted
    form.style.display       = '';
    successDiv.style.display = 'none';
    submitBtn.disabled       = false;
    submitBtn.innerHTML      = 'Send Message &rarr;';
    form.reset();
    // Clear any error borders
    ['cw-name','cw-email','cw-message'].forEach(id => {
      document.getElementById(id).style.borderColor = '';
    });
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('cw-name').focus(), 100);
  };
})();
