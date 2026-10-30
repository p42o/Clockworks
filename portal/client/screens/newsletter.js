// #/newsletter: the Agent Newsletter. Issue 1 is worded for the client's trade (lib/newsletter.js) until the
// weekly generator exists, minus any topic the client asked us not to touch. Parker's published ideas sit underneath.
import { html, mount, ic, fmtDate } from "../lib/ui.js";
import * as data from "../lib/data.js";
import { state } from "../lib/session.js";
import { newsletterIssue } from "../lib/newsletter.js";
import { intakeTopicsOff } from "../lib/intakeTopics.js";

export function render(ctx) {
  const { el } = ctx;
  let profile = null, home = null, ideas = [], topics, alive = true;
  const paint = () => {
    if (!alive) return;
    if (topics === undefined) { mount(el, html`<div class="page-head"><h1>Agent Newsletter</h1></div><div class="skel block" aria-busy="true"><span class="sr">Loading…</span></div>`); return; }
    const issue = newsletterIssue(profile, home?.businessName, { topicsOff: topics });
    mount(el, html`<div class="page-head"><h1>Agent Newsletter</h1><p class="lede">Short ideas for your business and your agent team. New issues land here.</p></div>
      <article class="card news-paper">
        <header class="news-paper-h"><small>Issue ${issue.no}</small><h2>${issue.title}</h2><p>${issue.lede}</p></header>
        <div class="news-paper-b">${issue.items.map((it, i) => html`<section class="news-story"><span class="k">Idea ${i + 1}</span><h3>${it.t}</h3><p>${it.p}</p></section>`)}
          ${issue.gated ? html`<p class="small muted">Leaves out anything you asked us not to touch.</p>` : ""}
          <p class="small muted">Want one of these set up? <a href="#/messages">Ask in Support</a>.</p></div>
      </article>
      ${ideas.length ? html`<section class="card" aria-labelledby="ideas-h" style="margin-top:20px"><h2 id="ideas-h">Ideas from Parker</h2>
        <ul class="list">${ideas.map((s) => html`<li><a class="row" href="#/i/${s.id}">${ic("lightbulb")}<div class="grow"><div class="title">${s.title || "An idea for you"}</div>${s.publishedAt ? html`<div class="sub">${fmtDate(s.publishedAt)}</div>` : ""}</div><span class="chev">${ic("chevron-right")}</span></a></li>`)}</ul></section>` : ""}`);
  };
  const quiet = () => {};
  intakeTopicsOff(state.me?.cid, state.home).then((t) => { topics = t; paint(); });
  const subs = [
    data.subscribeProfile((p) => { profile = p; paint(); }, quiet),
    data.subscribeHome((h) => { home = h; paint(); }, quiet),
    state.home?.features?.ideas === false ? null : data.subscribeSuggestions((rows) => { ideas = rows; paint(); }, quiet),
  ];
  paint();
  return () => { alive = false; subs.forEach((u) => u?.()); };
}
