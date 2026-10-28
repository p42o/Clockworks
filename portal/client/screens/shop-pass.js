// #/shop-pass: what Shop Pass will include. Coming soon only; nothing here can charge.
import { html, mount } from "../lib/ui.js";
import { SWAP } from "../swap-config.js";
import { shopPassComingSoonHtml } from "../lib/shopPassComingSoon.js";

export function render(ctx) {
  mount(ctx.el, html`<div class="page-head"><h1>Shop Pass</h1><p class="lede">The membership that keeps your agent team's home base open after setup.</p></div>
    <div class="shop-pass-page">${shopPassComingSoonHtml(SWAP)}</div>`);
}
