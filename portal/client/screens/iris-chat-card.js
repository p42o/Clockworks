import { html, mount, fmtDateTime, toast } from "../lib/ui.js";
import * as api from "../lib/api.js";
import { IRIS_AVATAR, IRIS_DISCLOSURE_TITLE, IRIS_DISCLOSURE_COPY, IRIS_DISCLOSURE_AGREEMENT } from "../lib/irisChat.js";

const HANDOFF = {
  start: "I can get this to Parker.",
  notes: "Anything else you want him to know?",
  got: "Got it.",
  method: "How should Parker reach you: phone, email, chat, or text?",
  review: "Check the note on the card and hit Submit when it looks right.",
};
const METHODS = ["phone", "email", "chat", "text"];
const now = () => Date.now();
const COS_LABEL = "Copy for your Chief of Staff:";

// Label and both fences are exact lines. The brief is only the text between the fences.
function chiefOfStaffBrief(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const labelAt = lines.findIndex((line) => line === COS_LABEL);
  if (labelAt < 0) return null;
  let open = -1;
  for (let i = labelAt + 1; i < lines.length; i++) {
    if (lines[i] === "") continue;
    if (lines[i] === "---") { open = i; break; }
    return null;
  }
  if (open < 0) return null;
  const close = lines.findIndex((line, i) => i > open && line === "---");
  if (close < 0) return null;
  return lines.slice(open + 1, close).join("\n");
}

export function mountIrisChatCard(hostEl, ctx = {}) {
  const s = {
    messages: [], loading: true, busy: false, typing: false, error: "",
    disclosureNeeded: true, loggingEnabled: false, flow: "", notes: "",
    draft: "",
    preferredMethod: "chat", preferredValue: "", submitted: false,
    clientName: ctx.clientName || "", cid: ctx.cid || "",
  };
  let alive = true;
  const iris = (text) => s.messages.push({ by: "iris", text, createdAt: now(), local: true });
  const history = () => s.messages.filter((m) => !m.local || m.by === "client")
    .filter((m) => m.by === "iris" || m.by === "client")
    .slice(-12).map((m) => ({ role: m.by === "client" ? "user" : "assistant", content: m.text }));
  const summary = () => s.messages.filter((m) => m.by === "client").slice(-5)
    .map((m) => m.text).join(" · ").slice(0, 1000) || "Client requested a Parker follow-up.";

  function paint() {
    if (!alive || !hostEl.isConnected) return;
    mount(hostEl, html`<div class="iris-card card" aria-labelledby="iris-heading">
      <div class="iris-head">
        <div class="iris-brand"><img src="${IRIS_AVATAR}" alt="" aria-hidden="true" class="iris-avatar"><div><span class="eyebrow">Clockworks support</span><h2 id="iris-heading">Iris <small>AI assistant</small></h2></div></div>
        <button type="button" class="btn iris-human" data-human>I need a human</button>
      </div>
      <div class="iris-bubbles" role="log" aria-label="Iris chat" aria-live="polite" tabindex="0">
        ${s.loading ? html`<p class="small muted">Opening chat…</p>` : s.messages.map((m, i) => {
          const who = m.by === "client" ? "You" : "Iris";
          const brief = m.by === "client" ? null : chiefOfStaffBrief(m.text);
          return html`<div class="bubble ${m.by === "client" ? "me" : "iris"}"><span class="sr">${who} said: </span>${m.text}${brief != null ? html`<button type="button" class="btn quiet iris-copy" data-cos="${i}" aria-label="Copy for your Chief of Staff">Copy</button>` : ""}<span class="meta">${who} · ${fmtDateTime(m.createdAt || now())}</span></div>`;
        })}
        ${s.typing ? html`<div class="iris-typing" role="status">Iris is typing<span aria-hidden="true">…</span></div>` : ""}
      </div>
      ${s.disclosureNeeded ? html`<div class="iris-disclosure" role="group" aria-labelledby="iris-disclosure-title">
        <h3 id="iris-disclosure-title">${IRIS_DISCLOSURE_TITLE}</h3><p>${IRIS_DISCLOSURE_COPY}</p>
        ${!s.loading && !s.loggingEnabled ? html`<p class="iris-storage-note"><b>For this session, the chat transcript is not saved in the portal.</b> A note is saved only if you submit a human handoff.</p>` : ""}
        <p>${IRIS_DISCLOSURE_AGREEMENT}</p>
        <button type="button" class="btn primary" data-disclosure ${s.busy ? "disabled" : ""}>Start chat</button>
      </div>` : ""}
      ${s.flow === "notes" ? html`<form class="iris-flow" data-notes><label for="iris-notes">Anything extra for Parker?</label><textarea id="iris-notes" maxlength="2000" rows="3" placeholder="Optional">${s.notes}</textarea><div class="iris-actions"><button type="submit" class="btn primary">Continue</button><button type="button" class="btn" data-skip>Nothing else</button><button type="button" class="btn quiet" data-cancel>Cancel</button></div></form>` : ""}
      ${s.flow === "method" ? html`<form class="iris-flow" data-method><label for="iris-method">Best way to reach you</label><select id="iris-method">${METHODS.map((method) => html`<option value="${method}" ${s.preferredMethod === method ? "selected" : ""}>${method[0].toUpperCase() + method.slice(1)}</option>`)}</select><label for="iris-value">Contact detail ${s.preferredMethod === "chat" ? "(portal chat)" : ""}</label><input id="iris-value" maxlength="200" value="${s.preferredValue}" ${s.preferredMethod === "chat" ? "" : "required"}><div class="iris-actions"><button type="submit" class="btn primary">Review note</button><button type="button" class="btn quiet" data-cancel>Cancel</button></div></form>` : ""}
      ${s.flow === "review" ? html`<section class="iris-review" aria-label="Review Parker handoff"><h3>Review your note</h3><dl><dt>Client</dt><dd>${s.clientName} · ${s.cid}</dd><dt>Context</dt><dd>${summary()}</dd><dt>Extra notes</dt><dd>${s.notes || "None"}</dd><dt>Reach me by</dt><dd>${s.preferredMethod}${s.preferredValue ? ` · ${s.preferredValue}` : ""}</dd></dl><div class="iris-actions"><button type="button" class="btn primary" data-submit ${s.busy || s.disclosureNeeded ? "disabled" : ""}>Submit</button><button type="button" class="btn" data-edit>Edit</button><button type="button" class="btn quiet" data-cancel>Cancel</button></div>${s.disclosureNeeded ? html`<p class="small">Start chat above before submitting.</p>` : ""}</section>` : ""}
      ${s.submitted ? html`<p class="iris-confirm" role="status">Your note is with Parker. You can keep chatting with Iris here.</p>` : ""}
      ${s.error ? html`<p class="iris-error" role="alert">${s.error} If you need the company line, call (763) 296-9777.</p>` : ""}
      <form class="iris-composer" data-compose><label class="sr" for="iris-message">Message Iris</label><textarea id="iris-message" rows="1" maxlength="2000" placeholder="Ask Iris…" ${s.disclosureNeeded || s.busy || s.loading ? "disabled" : ""}>${s.draft}</textarea><button class="btn primary" type="submit" ${s.disclosureNeeded || s.busy || s.loading ? "disabled" : ""}>Send</button></form>
      <p class="iris-footer">Iris (AI)${s.loading ? "" : html` · ${s.loggingEnabled ? "chat stored" : "chat transcript not saved"}`} · <a href="#/privacy-notice">Privacy Notice</a></p>
    </div>`);

    hostEl.querySelectorAll("[data-cos]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const brief = chiefOfStaffBrief(s.messages[Number(btn.dataset.cos)]?.text);
        if (brief == null) return;
        try {
          await navigator.clipboard.writeText(brief);
          toast("Copied");
        } catch {
          toast("Could not copy. Select the brief and copy it.");
        }
      });
    });
    hostEl.querySelector("[data-human]")?.addEventListener("click", () => {
      s.error = ""; s.flow = "notes"; s.submitted = false;
      iris(HANDOFF.start); iris(HANDOFF.notes); paint();
      hostEl.querySelector("#iris-notes")?.focus();
    });
    hostEl.querySelector("[data-disclosure]")?.addEventListener("click", async () => {
      s.busy = true; s.error = ""; paint();
      try { await api.irisChatAckDisclosure(); s.disclosureNeeded = false; }
      catch { s.error = "Could not start chat. Please try again."; }
      finally { s.busy = false; paint(); }
    });
    hostEl.querySelector("[data-notes]")?.addEventListener("submit", (e) => {
      e.preventDefault(); s.notes = hostEl.querySelector("#iris-notes").value.trim();
      iris(HANDOFF.got); iris(HANDOFF.method); s.flow = "method"; paint();
    });
    hostEl.querySelector("[data-skip]")?.addEventListener("click", () => {
      s.notes = ""; iris(HANDOFF.got); iris(HANDOFF.method); s.flow = "method"; paint();
    });
    hostEl.querySelector("#iris-method")?.addEventListener("change", (e) => {
      s.preferredMethod = e.target.value;
      s.preferredValue = s.preferredMethod === "email" ? (ctx.email || "")
        : ["phone", "text"].includes(s.preferredMethod) ? (ctx.phone || "") : "";
      paint(); hostEl.querySelector("#iris-value")?.focus();
    });
    hostEl.querySelector("[data-method]")?.addEventListener("submit", (e) => {
      e.preventDefault();
      s.preferredMethod = hostEl.querySelector("#iris-method").value;
      s.preferredValue = hostEl.querySelector("#iris-value").value.trim();
      if (s.preferredMethod !== "chat" && !s.preferredValue) return;
      iris(HANDOFF.review); s.flow = "review"; paint();
    });
    hostEl.querySelector("[data-edit]")?.addEventListener("click", () => { s.flow = "notes"; paint(); });
    hostEl.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", () => { s.flow = ""; s.error = ""; paint(); }));
    hostEl.querySelector("[data-submit]")?.addEventListener("click", async () => {
      s.busy = true; s.error = ""; paint();
      try {
        await api.irisChatHandoffSubmit({
          notes: s.notes, preferredMethod: s.preferredMethod, preferredValue: s.preferredValue,
          summary: summary(), history: history(),
        });
        s.flow = ""; s.submitted = true;
        iris("Your note is with Parker. He can follow up through the method you chose.");
      } catch { s.error = "The note did not send. Please try Submit again."; }
      finally { s.busy = false; paint(); }
    });
    const composer = hostEl.querySelector("[data-compose]");
    composer?.addEventListener("submit", async (e) => {
      e.preventDefault(); const input = composer.querySelector("textarea");
      const text = input.value.trim(); if (!text || s.busy || s.disclosureNeeded) return;
      const prior = history();
      const optimistic = { by: "client", text, createdAt: now() };
      s.messages.push(optimistic); s.draft = ""; s.busy = true; s.typing = true; s.error = ""; paint();
      try {
        const r = await api.irisChatSend(text, prior);
        s.messages.push(r.message || { by: "iris", text: r.reply, createdAt: now() });
      } catch {
        s.messages = s.messages.filter((m) => m !== optimistic);
        s.draft = text;
        s.error = "That message did not send. Please try again.";
      } finally { s.busy = false; s.typing = false; paint(); }
    });
    composer?.querySelector("textarea")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); composer.requestSubmit(); }
    });
  }
  paint();
  api.irisChatOpen().then((r) => {
    if (!alive) return;
    s.loading = false; s.loggingEnabled = r.loggingEnabled === true;
    s.disclosureNeeded = r.disclosureNeeded !== false;
    s.clientName = r.clientName || s.clientName; s.cid = r.cid || s.cid;
    if (r.visible !== true) { s.error = "Iris is unavailable for this portal session."; paint(); return; }
    const local = s.messages.filter((m) => m.local);
    s.messages = [...(Array.isArray(r.messages) ? r.messages : []), ...local];
    paint();
  }).catch(() => { if (alive) { s.loading = false; s.error = "Chat could not open. Please try refreshing."; paint(); } });
  return () => { alive = false; };
}
