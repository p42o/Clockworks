// Shared screen helpers.
import { html, mount, skeleton, errorState, onRetry, ic, focusHeading } from "../lib/ui.js";

/**
 * Standard loading -> data -> error lifecycle around a snapshot subscription.
 * subscribe(cb, errCb) must return an unsubscribe fn. draw(data) renders the whole screen (must include the h1).
 * Returns a teardown. Errors show "We couldn't load this. Try again." with a retry button.
 */
export function live(el, title, subscribe, draw) {
  let unsub = null, first = true;
  const start = () => {
    unsub?.();
    mount(el, html`<h1>${title}</h1>${skeleton(3)}`);
    unsub = subscribe(
      (d) => { try { draw(d); if(first) { first=false; focusHeading(); } } catch (e) { console.debug("[cw] draw", e); fail(); } },
      (e) => { console.debug("[cw] sub error", e && e.code); fail(); },
    );
  };
  const fail = () => { unsub?.(); unsub = null; mount(el, html`<h1>${title}</h1>${errorState()}`); onRetry(el, start); };
  start();
  return () => unsub?.();
}

export const emptyState = (title, body, art = "sparkle", compact = false) =>
  html`<div class="empty${compact ? " compact" : ""}"><span class="art">${ic(art)}</span><h2>${title}</h2>${body ? html`<p>${body}</p>` : ""}</div>`;

export const back = (href, label) => html`<a class="back" href="${href}">${ic("chevron-left")} ${label}</a>`;
export const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

import { setBusy, toast } from "../lib/ui.js";
import { friendlyError } from "../lib/api.js";
/** Run an async action behind a button: busy state, silent on cancelled re-verify, toast on failure. Returns result or undefined. */
export async function act(btn, fn) {
  setBusy(btn, true);
  try { return await fn(); }
  catch (e) { if (e && e.code !== "cancelled") toast(friendlyError(e)); }
  finally { setBusy(btn, false); }
}
