// Home: Shop Notes + Things to try. Watches clients/{cid}/tailored/current. The rules deny the read until
// Parker publishes, so permission-denied (or no doc) is the honest empty state, not an error.
// "Done" / "Not for me" go through the tailoredFeedback callable; the browser never writes the doc.
// Modular Home: fills the two hidden panels (shown in the sheet) and reports the state for the two tiles.
import { mount, toast, announce } from "../lib/ui.js";
import * as data from "../lib/data.js";
import * as api from "../lib/api.js";
import { tailoredModel, notesPanelHtml, tipsPanelHtml } from "../lib/tailored.js";

const ANNOUNCE = { done: "Marked done.", not_for_me: "Got it. We'll skip that one.", clear: "Undone." };

/**
 * hosts: { notes, tips } panel slots. opts.readonly: no answer buttons (read-only window).
 * opts.onState(st): st is a tailoredModel or "loading" | "empty" | "error", after every change.
 * Returns a teardown.
 */
export function mountTailoredCards(hosts, opts = {}) {
  let alive = true, unsub = null, st = "loading", busy = null, lastTip = null;
  const live = (el) => alive && el?.isConnected;
  const lost = () => !document.activeElement || document.activeElement === document.body;
  const draw = () => {
    if (!alive) return;
    // keep focus on the same tip across a redraw (the clicked button is disabled while saving, then replaced)
    const f = document.activeElement?.closest?.("[data-tip-act]");
    if (f && hosts.tips?.contains(f)) lastTip = { id: f.dataset.tipId, act: f.dataset.tipAct };
    const keep = (f && hosts.tips?.contains(f)) || (lastTip && lost()) ? lastTip : null;
    if (live(hosts.notes)) mount(hosts.notes, notesPanelHtml(st));
    if (live(hosts.tips)) mount(hosts.tips, tipsPanelHtml(st, { readonly: opts.readonly === true, busy }));
    if (keep && live(hosts.tips)) {
      const q = (sel) => hosts.tips.querySelector(sel);
      (q(`[data-tip-id="${keep.id}"][data-tip-act="${keep.act}"]:not([disabled])`) || q(`[data-tip-id="${keep.id}"]:not([disabled])`)
        || q(`[data-tip="${keep.id}"]`))?.focus({ preventScroll: true });
    }
    opts.onState?.(st);
  };
  const start = () => {
    unsub?.();
    st = "loading"; draw();
    unsub = data.subscribeTailored(
      (d) => { st = tailoredModel(d && d.status === "published" ? d : null) || "empty"; draw(); },
      (e) => {
        const code = String(e?.code || "");
        st = code === "permission-denied" || code === "not-found" ? "empty" : "error";
        draw();
      },
    );
  };
  const onClick = async (ev) => {
    if (ev.target.closest("[data-tl-retry]")) { start(); return; }
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
  };
  hosts.notes?.addEventListener("click", onClick);
  hosts.tips?.addEventListener("click", onClick);
  start();
  return () => { alive = false; unsub?.(); };
}
