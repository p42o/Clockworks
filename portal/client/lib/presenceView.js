// Account list and reader. Markup only. Report HTML is assigned to the iframe
// as a property so it cannot break out of the page. The iframe sandbox is empty.
import { html, ic } from "./ui.js";
import {
  PRESENCE_NOTE, PRESENCE_PHONE_DISPLAY, PRESENCE_PHONE_TEL, PRESENCE_HTML_MAX,
  clientPresenceRows, formatPresenceDate, presenceLabel, presenceOpenLabel, safePresenceUrl, cleanPresenceScore,
} from "./presenceCopy.js";

const back = (href, label) => html`<a class="back" href="${href}">${ic("chevron-left")} ${label}</a>`;

function metaLine(report) {
  const score = cleanPresenceScore(report?.score);
  return [formatPresenceDate(report?.date), score != null ? `Score ${score}` : ""].filter(Boolean).join(" · ");
}

export function presenceSectionHtml(reports) {
  const rows = clientPresenceRows(reports);
  return html`<section class="card presence" aria-labelledby="presence-h"><h2 id="presence-h">Online presence</h2>
    ${rows.length ? html`<ul class="list presence-list">${rows.map((r) => {
      const meta = metaLine(r);
      const url = `#/account/presence/${encodeURIComponent(r.id)}`;
      return html`<li><a class="row" href="${url}">${ic("file")}<div class="grow"><div class="title">${presenceLabel(r.type)}</div>
        ${meta ? html`<div class="sub">${meta}</div>` : ""}
        ${r.summary ? html`<div class="sub presence-sum">${r.summary}</div>` : ""}
        </div><span class="chev">${ic("chevron-right")}</span></a></li>`;
    })}</ul>
      <p class="small muted presence-note">${PRESENCE_NOTE}</p>`
      : html`<p class="presence-empty">No scan shared yet. When one is ready, it will show up here.</p>`}
    <p class="small muted presence-help">Questions? <a href="tel:${PRESENCE_PHONE_TEL}">${PRESENCE_PHONE_DISPLAY}</a></p>
  </section>`;
}

export function presenceReaderHtml(report) {
  const label = presenceLabel(report?.type);
  const meta = metaLine(report);
  const openUrl = safePresenceUrl(report?.openUrl);
  const hasHtml = typeof report?.html === "string" && report.html.length > 0 && report.html.length <= PRESENCE_HTML_MAX;
  return html`${back("#/account", "Settings")}<div class="page-head"><h1>${label}</h1>
      ${meta ? html`<p class="muted">${meta}</p>` : ""}</div>
    ${report?.summary ? html`<p class="presence-lead">${report.summary}</p>` : ""}
    ${hasHtml ? html`<iframe class="presence-frame" sandbox="" referrerpolicy="no-referrer" title="Online presence"></iframe>`
      : html`<p class="presence-empty">The full page isn't in the portal yet.</p>`}
    ${openUrl ? html`<p class="presence-open"><a class="btn" href="${openUrl}" target="_blank" rel="noopener noreferrer">${presenceOpenLabel(openUrl)}</a></p>` : ""}
    <p class="small muted presence-note">${PRESENCE_NOTE}</p>
    <p class="small muted presence-help">Questions? <a href="tel:${PRESENCE_PHONE_TEL}">${PRESENCE_PHONE_DISPLAY}</a></p>`;
}

export function presenceMissingHtml() {
  return html`${back("#/account", "Settings")}<div class="page-head"><h1>Online presence</h1></div>
    <p class="presence-empty">That scan isn't on your account.</p>
    <p class="small muted presence-help">Questions? <a href="tel:${PRESENCE_PHONE_TEL}">${PRESENCE_PHONE_DISPLAY}</a></p>`;
}

/** Assign stored HTML after mount. Empty sandbox. Never interpolates HTML into the page. */
export function fillPresenceFrame(root, report) {
  const frame = root?.querySelector?.("iframe.presence-frame");
  if (!frame) return;
  frame.setAttribute("sandbox", "");
  frame.referrerPolicy = "no-referrer";
  const htmlText = report && typeof report.html === "string" && report.html.length <= PRESENCE_HTML_MAX ? report.html : "";
  frame.srcdoc = htmlText;
}
