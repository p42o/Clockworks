// #/account/files — shared files, signed terms, exports, uploads. Downloads via one-time links.
import { html, mount, ic, fmtDate } from "../lib/ui.js";
import * as data from "../lib/data.js";
import * as api from "../lib/api.js";
import { withFresh } from "../lib/session.js";
import { live, emptyState, back, act } from "./_util.js";

const GROUPS = [["shared", "Shared from Parker"], ["receipt", "Signed terms"], ["export", "Data exports"], ["upload", "Your uploads"]];
const size = (n) => (n == null ? "" : n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);

export function render(ctx) {
  const { el } = ctx;
  return live(el, "Files", data.subscribeAccount, (a) => {
    const files = a?.files || [];
    const group = (k, label, rows) => {
      if (!rows.length && k !== "receipt") return "";
      return html`<section aria-labelledby="g-${k}"><h2 id="g-${k}" class="group-h">${label}</h2>
        ${rows.length ? html`<ul class="list">${rows.map((f) => html`<li><div class="row">${ic("file")}
          <div class="grow"><div class="title">${f.title}</div><div class="sub">${fmtDate(f.at)}${f.size != null ? ` · ${size(f.size)}` : ""}${f.expiresAt ? ` · Available until ${fmtDate(f.expiresAt)}` : ""}</div></div>
          <button type="button" class="btn" data-dl="${f.id}">${ic("download")} Download<span class="sr">, ${f.title}</span></button></div></li>`)}</ul>`
          : emptyState("No receipts yet.", "After you sign, your receipt is kept here.", "file", true)}</section>`;
    };
    mount(el, html`${back("#/account", "Account")}<div class="page-head"><h1>Files</h1></div>
      ${files.length === 0 ? html`<div class="stack">${emptyState("Nothing shared yet.", "When Parker shares a file, it will show up here.", "file")}
        <section class="card" aria-labelledby="g-receipt"><h2 id="g-receipt">Receipts</h2>${emptyState("No receipts yet.", "After you sign, your receipt is kept here.", "file", true)}</section></div>`
        : html`<div class="stack">${GROUPS.map(([k, label]) => group(k, label, files.filter((f) => f.kind === k)))}</div>`}`);
    el.querySelectorAll("[data-dl]").forEach((b) => b.addEventListener("click", async () => {
      // Exports need a fresh code; withFresh only prompts if the server asks for one.
      const r = await act(b, () => withFresh(() => api.getDownloadLink(b.dataset.dl)));
      if (r && r.url) window.location.assign(r.url);
    }));
  });
}
