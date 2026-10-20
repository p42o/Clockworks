// #/accept — a material change to the Starter Terms or Privacy Notice requires a new acceptance.
// COUNSEL-DRAFT-2026-10-19. Everything else stays gated until this is checked.
import { html, mount, setBusy, showErrors } from "../lib/ui.js";
import * as api from "../lib/api.js";
import { acceptanceLabelHtml } from "../lib/acceptanceLabel.js";
import { SWAP } from "../swap-config.js";

export async function render(ctx) {
  const { el, router } = ctx;
  mount(el, html`<h1>Please agree to continue</h1>
    <p>The Starter Terms or the Privacy Notice changed. Check the box to continue. Nothing else in the portal opens until you do.</p>
    <form class="stack card" novalidate>
      <div class="check">
        <input class="agree-box" id="agree" type="checkbox" aria-labelledby="agree-label">
        ${acceptanceLabelHtml()}
      </div>
      <button class="btn primary" type="submit" disabled>Continue</button>
    </form>`);
  const form = el.querySelector("form");
  const box = el.querySelector("#agree");
  const go = form.querySelector("button");
  box.addEventListener("change", () => { go.disabled = !box.checked; });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!box.checked) return;
    setBusy(go, true);
    try {
      await api.starterAccept({ agree: true, label: SWAP.acceptance.label });
      router.go("#/home");
    } catch (e) {
      setBusy(go, false);
      showErrors(form, [{ msg: api.friendlyError(e) }]);
    }
  });
}
