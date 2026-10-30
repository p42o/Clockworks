// Home: Shop Notes + Things to try. Watches clients/{cid}/tailored/current. The rules deny the read until
// Parker publishes, so permission-denied (or no doc) is the honest empty state, not an error.
// "Done" / "Not for me" go through the tailoredFeedback callable; the browser never writes the doc.
import { mount, toast, announce } from "../lib/ui.js";
import * as data from "../lib/data.js";
import * as api from "../lib/api.js";
import { tailoredHtml, tailoredLoadingHtml, tailoredEmptyHtml, tailoredErrorHtml } from "../lib/tailored.js";

const ANNOUNCE = { done: "Marked done.", not_for_me: "Got it. We'll skip that one.", clear: "Undone." };

/** opts.readonly: no answer buttons (read-only window). Returns a teardown. */
export function mountTailoredCards(hostEl, opts = {}) {
  let alive = true, unsub = null, doc = null, busy = null, expanded = false;
  const paint = (markup) => { if (alive && hostEl.isConnected) mount(hostEl, markup); };
  const draw = () => {
    if (!alive || !hostEl.isConnected) return;
    // keep focus on the same control across a redraw
    const f = document.activeElement?.closest?.("[data-tip-act]");
    const keep = f && hostEl.contains(f) ? { id: f.dataset.tipId, act: f.dataset.tipAct } : null;
    paint(doc ? tailoredHtml(doc, { readonly: opts.readonly === true, busy, expanded }) : tailoredEmptyHtml());
    hostEl.classList.toggle("is-empty", !doc || !hostEl.querySelector(".tl-notes, .tl-tips"));
    if (keep) (hostEl.querySelector(`[data-tip-id="${keep.id}"][data-tip-act="${keep.act}"]`) || hostEl.querySelector(`[data-tip-id="${keep.id}"]`))?.focus();
  };
  const start = () => {
    unsub?.();
    paint(tailoredLoadingHtml());
    unsub = data.subscribeTailored(
      (d) => { doc = d && d.status === "published" ? d : null; draw(); },
      (e) => {
        const code = String(e?.code || "");
        if (code === "permission-denied" || code === "not-found") { doc = null; draw(); return; }
        paint(tailoredErrorHtml());
        hostEl.querySelector("[data-tl-retry]")?.addEventListener("click", start);
      },
    );
  };
  hostEl.addEventListener("click", async (ev) => {
    if (ev.target.closest("[data-tl-more]")) {
      expanded = !expanded; draw();
      hostEl.querySelector("[data-tl-more]")?.focus();
      return;
    }
    const b = ev.target.closest("[data-tip-act]");
    if (!b || busy || opts.readonly) return;
    const tipId = b.dataset.tipId, act = b.dataset.tipAct;
    busy = tipId; draw();
    try {
      await api.tailoredFeedback(tipId, act === "clear" ? null : act);
      announce(ANNOUNCE[act] || "Saved.");
    } catch (e) {
      toast(api.friendlyError(e));
    } finally {
      busy = null; draw(); // the snapshot listener brings the saved state in
    }
  });
  start();
  return () => { alive = false; unsub?.(); };
}
