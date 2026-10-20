// Shared viewer for the password-step documents (v3.3 terms, v1.4 notice).
import { html, mount, skeleton, errorState, onRetry, focusHeading } from "../lib/ui.js";
import { documentBody } from "../lib/legal.js";
import { SWAP } from "../swap-config.js";

async function hashText(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function renderAcceptanceDoc(ctx, kind) {
  const { el } = ctx;
  const doc = SWAP.acceptance[kind];
  let dead = false;
  async function load() {
    mount(el, html`<h1>${doc.linkText}</h1>${skeleton(3)}`);
    try {
      const response = await fetch(new URL("../" + doc.file, import.meta.url), { cache: "no-store" });
      if (!response.ok) throw new Error("document unavailable");
      const text = await response.text();
      const sha = await hashText(text);
      if (dead) return;
      mount(el, html`<button type="button" class="btn quiet" data-back>Back</button>
        <h1>${doc.linkText}</h1>
        <p class="small">${doc.version} · SHA-256 ${sha}</p>
        ${documentBody(text)}
        <p>Questions? <a href="mailto:${SWAP.contact.privacyEmail}">${SWAP.contact.privacyEmail}</a></p>`);
      el.querySelector("[data-back]").addEventListener("click", () => history.back());
      focusHeading();
    } catch {
      if (!dead) { mount(el, html`<h1>Document unavailable</h1>${errorState()}`); onRetry(el, load); }
    }
  }
  load();
  return () => { dead = true; };
}
