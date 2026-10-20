// Local-only helper: shows the latest emailed code so the flow can be tested without email.
// Every function is a no-op unless the page is served from localhost/127.0.0.1.
import { isLocalDev } from "./env.js";
import { html, mount, icon, raw } from "./ui.js";

export async function devCode(email) {
  if (!isLocalDev()) return null;
  try {
    const r = await fetch(`http://127.0.0.1:5001/demo-clockworks-v3/us-central1/devLastCode?email=${encodeURIComponent(email || "")}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.code ? String(j.code) : null;
  } catch { return null; }
}

/** Renders the yellow badge. Retries a few times because the email send is async. */
export async function showDevCode(email) {
  if (!isLocalDev()) return;
  let code = null;
  for (let i = 0; i < 4 && !code; i++) {
    code = await devCode(email);
    if (!code) await new Promise((r) => setTimeout(r, 600));
  }
  document.querySelector(".devhelp")?.remove();
  if (!code) return;
  const el = document.createElement("div");
  el.className = "devhelp";
  el.setAttribute("role", "note");
  mount(el, html`Dev: your code is ${code} <button type="button" class="btn quiet" style="min-height:24px;padding:0 6px" data-x>${raw(icon("x"))}<span class="sr">Dismiss</span></button>`);
  el.querySelector("[data-x]").addEventListener("click", () => el.remove());
  document.body.appendChild(el);
}
