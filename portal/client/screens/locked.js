// #/locked — closed (90+ days after wrap-up) or not turned on.
import { html, mount, fmtDateY } from "../lib/ui.js";
import { SWAP } from "../swap-config.js";
import { state } from "../lib/session.js";
import { ARCHIVED_BODY, SUSPENDED_BODY, LOCAL_NOTICE_VARS, fillNotice } from "../lib/statusNotices.js";

function daysLeft(until) {
  const ms = typeof until === "number" ? until : new Date(until).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil((ms - Date.now()) / 86400000));
}

export function render({ el }) {
  const disabled = state.status === "disabled";
  if (state.suspended) {
    const body = fillNotice(SUSPENDED_BODY, LOCAL_NOTICE_VARS);
    mount(el, html`<h1>Your account is SUSPENDED</h1>${body.split("\n\n").map((p) => html`<p>${p}</p>`)}`);
  } else if (state.archived) {
    const body = fillNotice(ARCHIVED_BODY, {
      close_date: state.archiveClosedAt ? fmtDateY(state.archiveClosedAt) : "",
      export_window_end_date: state.archiveUntil ? fmtDateY(state.archiveUntil) : "",
    });
    const left = daysLeft(state.archiveUntil);
    mount(el, html`<h1>Your account is ARCHIVED</h1>${body.split("\n\n").map((p) => html`<p>${p}</p>`)}${left == null ? "" : html`<p>${left} days left in the read-only export window.</p>`}`);
  } else {
    mount(el, disabled
      ? html`<h1>This portal isn't on</h1><p>This portal isn't turned on for your business right now.</p>`
      : html`<h1>This portal is closed</h1><p>This portal is closed. Your engagement wrapped up more than 90 days ago. Parker can still send you copies of your signed terms or receipts — just ask him.</p>`);
  }
  const link = document.createElement("a"); link.className="btn"; link.href="mailto:" + SWAP.contact.privacyEmail; link.textContent="Email Parker"; el.append(link);
}
