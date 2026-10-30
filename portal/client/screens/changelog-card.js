import { html, mount, ic } from "../lib/ui.js";
import * as api from "../lib/api.js";

const COLLAPSED = 4;
const LIGHT_LABEL = {
  green: "Useful for your shop",
  yellow: "Might be useful",
  red: "Probably not for you",
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  return `${MONTHS[Number(m[2]) - 1] || ""} ${Number(m[3])}`.trim();
}

function lightOf(item) {
  return LIGHT_LABEL[item?.trafficLight] ? item.trafficLight : "red";
}

const FIT = { green: "For you", yellow: "Maybe", red: "Not for you" };

/**
 * opts.items: preloaded list (admin preview). Without it the card asks the server for this client's ranked list.
 * opts.expanded: show every item, no "Show all" (the Home sheet). opts.bare: no card header (the sheet has one).
 * opts.onItems({ loading, items }): after every load, for the Home preview tile.
 */
export function mountChangelogCard(hostEl, opts = {}) {
  const pre = Array.isArray(opts.items) ? opts.items : null;
  const s = { loading: !pre, items: pre || [], open: opts.expanded === true };
  let alive = true;

  function paint() {
    if (!alive || !hostEl.isConnected) return;
    const items = s.items.slice(0, 16);
    const shown = s.open ? items : items.slice(0, COLLAPSED);
    const more = items.length > COLLAPSED && opts.expanded !== true;
    opts.onItems?.({ loading: s.loading, items });
    mount(hostEl, html`<section class="${opts.bare ? "" : "card dash-card "}changelog-card" ${opts.bare ? "" : html`aria-labelledby="changelog-h"`}>
      ${opts.bare ? "" : html`<div class="dash-h"><span class="dash-ic">${ic("sparkle")}</span><div class="dash-ht"><h2 id="changelog-h">New Agent Capabilities</h2><p>What your Grok Bot team learned lately</p></div></div>`}
      <p class="caps-legend" aria-hidden="true"><span><i class="changelog-dot green"></i>For you</span><span><i class="changelog-dot yellow"></i>Maybe</span><span><i class="changelog-dot red"></i>Not for you</span></p>
      ${s.loading ? html`<p class="small muted" role="status">Looking up the latest updates…</p>` : ""}
      ${!s.loading && !shown.length ? html`<p class="changelog-empty" role="status">No new agent capabilities for your shop yet. Check back after Parker’s next update — or message him anytime.</p>` : ""}
      ${shown.length ? html`<ul class="changelog-list">${shown.map((item) => {
        const light = lightOf(item);
        return html`<li class="cap ${light}">
          <span class="changelog-dot ${light}" role="img" aria-label="${LIGHT_LABEL[light]}"></span>
          <div class="grow">
            <div class="title">${item.title}</div>
            ${item.summary && item.summary !== item.title ? html`<p class="sub">${item.summary}</p>` : ""}
            <div class="cap-meta"><b>${FIT[light]}</b>${item.date ? html` · ${shortDate(item.date)}` : ""}</div>
          </div>
        </li>`;
      })}</ul>` : ""}
      ${!s.loading && more ? html`<button type="button" class="btn quiet show-more" data-changelog-more aria-expanded="${s.open ? "true" : "false"}">${s.open ? "Show the latest only" : `Show all ${items.length} capabilities`}</button>` : ""}
    </section>`);
    hostEl.querySelector("[data-changelog-more]")?.addEventListener("click", () => {
      s.open = !s.open;
      paint();
      hostEl.querySelector("[data-changelog-more]")?.focus();
    });
  }

  paint();
  if (pre) return () => { alive = false; };
  api.changelogCardList().then((res) => {
    if (!alive) return;
    s.items = Array.isArray(res?.items) ? res.items.filter((item) => item && typeof item.title === "string" && item.title) : [];
    s.loading = false;
    paint();
  }).catch(() => {
    if (!alive) return;
    s.items = [];
    s.loading = false;
    paint();
  });
  return () => { alive = false; };
}
