// #/newsletter: the Agent Newsletter. Issue 1 is worded for the client's trade (lib/dash.js) until the
// weekly generator exists. Parker's published ideas sit underneath.
import { html, mount, ic, fmtDate } from "../lib/ui.js";
import * as data from "../lib/data.js";
import { state } from "../lib/session.js";
import { newsletterIssue } from "../lib/dash.js";

export function render(ctx) {
  const { el } = ctx;
  let profile = null, home = null, ideas = [];
  const paint = () => {
    const issue = newsletterIssue(profile, home?.businessName);
    mount(el, html`<div class="page-head"><h1>Agent Newsletter</h1><p class="lede">Short ideas for your business and your agent team. New issues land here.</p></div>
      <article class="card news-paper">
        <header class="news-paper-h"><small>Issue ${issue.no}</small><h2>${issue.title}</h2><p>${issue.lede}</p></header>
        <div class="news-paper-b">${issue.items.map((it, i) => html`<section class="news-story"><span class="k">Idea ${i + 1}</span><h3>${it.t}</h3><p>${it.p}</p></section>`)}
          <p class="small muted">Want one of these set up? <a href="#/messages">Ask in Support</a>.</p></div>
      </article>
      ${ideas.length ? html`<section class="card" aria-labelledby="ideas-h" style="margin-top:20px"><h2 id="ideas-h">Ideas from Parker</h2>
        <ul class="list">${ideas.map((s) => html`<li><a class="row" href="#/i/${s.id}">${ic("lightbulb")}<div class="grow"><div class="title">${s.title || "An idea for you"}</div>${s.publishedAt ? html`<div class="sub">${fmtDate(s.publishedAt)}</div>` : ""}</div><span class="chev">${ic("chevron-right")}</span></a></li>`)}</ul></section>` : ""}`);
  };
  const quiet = () => {};
  const subs = [
    data.subscribeProfile((p) => { profile = p; paint(); }, quiet),
    data.subscribeHome((h) => { home = h; paint(); }, quiet),
    state.home?.features?.ideas === false ? null : data.subscribeSuggestions((rows) => { ideas = rows; paint(); }, quiet),
  ];
  paint();
  return () => subs.forEach((u) => u?.());
}
