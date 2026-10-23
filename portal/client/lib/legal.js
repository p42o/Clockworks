// Escape all document text. No HTML from Markdown is trusted or executed.
import { html, raw, esc, mount, skeleton, errorState, onRetry, focusHeading } from './ui.js';
import { SWAP } from '../swap-config.js';
import * as api from './api.js';
import { state } from './session.js';
function inline(text) {
  return raw(esc(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>'));
}
// ---------- per-client party fields ({{CLIENT_BUSINESS_NAME}} etc.) ----------
// The server fills the same names (portal-dev/functions/lib/acceptance.js partyVars) when it records an
// acceptance, so what the client reads is what gets hashed into the Contract Record.
let inviteParties = null;
/** Called by the invite screen before sign-in, from what Parker entered on the invite. */
export function setInviteParties(p) { inviteParties = p || null; }
const fDate = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'long', day: 'numeric', year: 'numeric' });
export function partyVars() {
  const me = state.me || {};
  const src = state.user && me.businessName !== undefined
    ? { businessName: me.businessName, contactName: me.contactName, email: me.email || me.emailMasked }
    : inviteParties || {};
  return {
    CLIENT_BUSINESS_NAME: String(src.businessName || '').trim() || 'the business named in your invitation',
    CLIENT_CONTACT_NAME: String(src.contactName || '').trim() || 'the person accepting these terms',
    CLIENT_EMAIL: String(src.email || '').trim() || 'the email address on your invitation',
    EFFECTIVE_DATE: fDate.format(new Date()),
  };
}
export const fillParties = (text, vars = partyVars()) => String(text).replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

export function documentBody(text) {
  text = fillParties(text);
  return html`<article class="legal-copy">${text.trim().split(/\n\s*\n/).map(block => {
    const heading = block.match(/^(#{1,6})\s+(.+)$/);
    if (heading) return html`<h2>${inline(heading[2])}</h2>`;
    const lines = block.split('\n');
    if (lines.every(line => /^\|/.test(line))) {
      const rows = lines.filter(line => !/^\|[\s:|-]+\|$/.test(line)).map(line => line.split('|').slice(1,-1).map(c => c.trim()));
      return html`<div class="legal-table"><table><thead><tr>${rows[0].map(c => html`<th scope="col">${inline(c)}</th>`)}</tr></thead><tbody>${rows.slice(1).map(row => html`<tr>${row.map(c => html`<td>${inline(c)}</td>`)}</tr>`)}</tbody></table></div>`;
    }
    if (lines.every(line => /^[-*] /.test(line))) return html`<ul>${lines.map(line => html`<li>${inline(line.slice(2))}</li>`)}</ul>`;
    return html`<p class="legal-paragraph">${inline(block)}</p>`;
  })}</article>`;
}
function shownDoc(kind) {
  // Current versions are SWAP.acceptance. SWAP.docs is history and is not displayed.
  if (kind === 'notice') return SWAP.acceptance.notice;
  if (kind === 'terms') return SWAP.acceptance.terms;
  return SWAP.docs[kind];
}
export async function loadDocument(kind) {
  const d = shownDoc(kind);
  const response = await fetch(new URL('../' + d.file, import.meta.url), { cache: 'no-store' });
  if (!response.ok) throw new Error('document unavailable');
  const text = await response.text();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return { ...d, text, sha256: [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('') };
}
// Retired 2026-10-23 (Counsel): legacy draft-preview view. Not routed. Do not route to it while SWAP.acceptance holds live documents.
export function renderDocument(ctx, kind) {
  const { el, router } = ctx;
  let dead = false;
  async function load() {
    mount(el, html`<h1>${kind === 'notice' ? 'Before we start: what we record' : 'Portal terms'}</h1>${skeleton(3)}`);
    try {
      const d = await loadDocument(kind);
      if (dead) return;
      mount(el, html`<a class="btn quiet" href="#/account">Back to Account</a><h1>${kind === 'notice' ? 'Before we start: what we record' : 'Portal terms'}</h1>
        <div class="stack"><div class="banner preview"><div><b>DRAFT — for local preview</b><p>${d.version} · SHA-256 ${d.sha256.slice(0, 12)}</p></div></div>
        ${documentBody(d.text)}<a class="btn" href="${d.file}" download>Download this draft</a>
        ${state.user ? html`<form class="card stack"><label class="check"><input type="checkbox" required><span>${kind === 'notice' ? "I've read the privacy notice" : 'I accept the portal terms as a draft preview'}</span></label><button class="btn primary" type="submit">${kind === 'notice' ? 'Acknowledge and continue' : 'Accept and continue'}</button></form>` : ''}
        <p>Questions? <a href="mailto:${SWAP.contact.privacyEmail}">${SWAP.contact.privacyEmail}</a></p></div>`);
      el.querySelector('form')?.addEventListener('submit', async ev => {
        ev.preventDefault();
        const b = ev.currentTarget.querySelector('button'); b.disabled = true;
        try {
          if (kind === 'notice') await api.noticeAck({ version: d.version, sha256: d.sha256 });
          else await api.termsAccept({ version: d.version, sha256: d.sha256, agree: true });
          router.go(kind === 'notice' ? '#/terms' : '#/home');
        } catch (e) { b.disabled = false; const { showErrors } = await import('./ui.js'); showErrors(ev.target, [{ msg: api.friendlyError(e) }]); }
      });
      focusHeading();
    } catch { if (!dead) { mount(el, html`<h1>Document unavailable</h1>${errorState()}`); onRetry(el, load); } }
  }
  load();
  return () => { dead = true; };
}
