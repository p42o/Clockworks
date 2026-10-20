// #/ideas — Parker's suggestions, newest first.
import { html, mount, ic, fmtDate } from "../lib/ui.js";
import * as data from "../lib/data.js";
import { live, emptyState } from "./_util.js";

const LABEL = { planned: "Planned", done: "Done", withdrawn: "Withdrawn" };
export const ideaChip = (s) => s.state && LABEL[s.state] ? html`<span class="chip ${s.state === "done" ? "ok" : ""}">${LABEL[s.state]}</span>` : html`<span class="chip you">New</span>`;

export function render(ctx) {
  return live(ctx.el, "Ideas", data.subscribeSuggestions, (rows) => {
    mount(ctx.el, html`<div class="page-head"><h1>Ideas</h1></div>
      ${rows.length === 0 ? emptyState("No ideas yet.", "Parker posts suggestions here when he spots something useful.", "lightbulb") : html`
      <ul class="list">${rows.map((s) => html`<li><a class="row${s.state === "withdrawn" ? " quiet-row" : ""}" href="#/i/${s.id}">
        <div class="grow"><div class="title">${s.title}</div><div class="sub">${fmtDate(s.publishedAt)}</div></div>
        ${ideaChip(s)}<span class="chev">${ic("chevron-right")}</span></a></li>`)}</ul>`}`);
  });
}
