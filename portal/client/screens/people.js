// #/account/people — owner sees the list; members get a plain note.
import { html, mount, ic, fmtDateY, skeleton, errorState, onRetry, toast, focusHeading } from "../lib/ui.js";
import * as api from "../lib/api.js";
import { state, withFresh } from "../lib/session.js";
import { back, act } from "./_util.js";

export function render(ctx) {
  const { el, router } = ctx;
  const head = html`${back("#/account", "Settings")}<div class="page-head"><h1>People</h1></div>`;
  const memberNote = () => mount(el, html`${head}<p>Only the account owner can see this list.</p>`);
  let dead = false;
  async function load() {
    if (state.role === "member") return memberNote();
    mount(el, html`${head}${skeleton(2)}`);
    try {
      const people = await api.listPeople();
      if (dead) return;
      mount(el, html`${head}<div class="stack"><ul class="list">${(people || []).map((p) => html`<li><div class="row"><div class="grow"><div class="title">${p.displayName}</div>
        <div class="sub">${p.lastLoginAt ? `Last signed in ${fmtDateY(p.lastLoginAt)}` : "Hasn't signed in yet"}</div></div>
        <span class="chip ${p.role === "owner" ? "info" : ""}">${p.role === "owner" ? "Owner" : "Member"}</span>
        ${p.status && p.status !== "active" ? html`<span class="chip warn">${p.status === "invited" ? "Invited" : p.status}</span>` : ""}</div></li>`)}</ul>
        <button type="button" class="btn block" data-ask>${ic("plus")} Ask Parker to add or remove someone</button></div>`);
      focusHeading();
      el.querySelector("[data-ask]").addEventListener("click", async (ev) => {
        const r = await act(ev.currentTarget, () => withFresh(() => api.startAccountThread("people", "I'd like to add or remove someone on my account.")));
        if (r && r.tid) { toast("Sent to Parker."); router.go(`#/m/${r.tid}`); }
      });
    } catch (e) {
      if (dead) return;
      if (api.errCode(e) === "permission-denied") return memberNote();
      mount(el, html`${head}${errorState()}`); onRetry(el, load);
    }
  }
  load();
  return () => { dead = true; };
}
