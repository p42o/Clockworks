// Renders the exact acceptance label, with the two document names as links.
// The accessible name is the config label. Links are not nested inside the checkbox label.
// COUNSEL-DRAFT-2026-10-19.
import { html } from "./ui.js";
import { SWAP } from "../swap-config.js";

export function acceptanceLabelHtml(swap = SWAP) {
  const a = swap.acceptance;
  const label = a.label;
  const terms = a.terms.linkText;
  const notice = a.notice.linkText;
  const iTerms = label.indexOf(terms);
  const iNotice = label.indexOf(notice);
  if (iTerms < 0 || iNotice < iTerms) return html`<p id="agree-label">${label}</p>`;
  const before = label.slice(0, iTerms);
  const mid = label.slice(iTerms + terms.length, iNotice);
  const after = label.slice(iNotice + notice.length);
  return html`<p id="agree-label">${before}<a href="${a.terms.href}">${terms}</a>${mid}<a href="${a.notice.href}">${notice}</a>${after}</p>`;
}
