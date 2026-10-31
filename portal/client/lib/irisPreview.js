// Iris tile preview (2026-10-30, pass 3): what the Iris card on Home shows before it is opened. Pure: no DOM,
// no Firebase, no imports, so the DEV harness unit-tests it (tests/tailored/iris-preview.test.mjs).
// The chat itself (screens/iris-chat-card.js) reports its state; this turns that state into tile fields.

export const IRIS_SNIPPET_MAX = 120;
const HUMAN_LINE = "You can ask for a human any time.";

/** One line of a message for the tile: whitespace collapsed, cut at a word, an ellipsis when cut. Emoji-safe. */
export function irisSnippet(text, max = IRIS_SNIPPET_MAX) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  const chars = Array.from(s);
  if (chars.length <= max) return s;
  const cut = chars.slice(0, max - 1).join("");
  const sp = cut.lastIndexOf(" ");
  return (sp >= Math.floor(max * 0.6) ? cut.slice(0, sp) : cut).replace(/[\s.,;:!?·-]+$/u, "") + "…";
}

const said = (m) => (m?.by === "iris" || m?.by === "client") && String(m.text ?? "").trim() !== "";
const saidOf = (st) => (Array.isArray(st?.messages) ? st.messages : []).filter(said);

/** A chat "exists" once the client has sent something or started a handoff (local Iris prompts). */
export const irisHasChat = (st) => !!st && !st.loading && saidOf(st).some((m) => m.by === "client" || m.local);

/**
 * st (from the chat card): { loading, error, messages: [{ by: "iris" | "client", text, local? }], typing }.
 * undefined = the chat has not reported yet (admin preview, or before Home mounts it).
 * Returns tile fields for lib/modular.js tileHtml().
 */
export function irisTileModel(st) {
  const t = { key: "iris", icon: "chat", title: "Iris", count: "AI assistant", kicker: "Clockworks support" };
  if (!st || st.loading) return { ...t, headline: "Questions about your portal?", line: "Ask Iris. You can ask for a human any time.", cta: "Ask Iris anything" };
  const msgs = saidOf(st);
  if (st.error && !msgs.length) return { ...t, state: "error", headline: st.error, line: "", cta: "Open" };
  if (!irisHasChat(st)) {
    const greet = [...msgs].reverse().find((m) => m.by === "iris");
    return { ...t, headline: greet ? irisSnippet(greet.text) : "Questions about your portal?", line: HUMAN_LINE, cta: "Ask Iris anything" };
  }
  const last = msgs[msgs.length - 1];
  return { ...t, count: `${msgs.length} ${msgs.length === 1 ? "message" : "messages"}`,
    kicker: last.by === "client" ? "You said" : "Iris said", headline: irisSnippet(last.text),
    line: st.typing ? "Iris is typing…" : HUMAN_LINE, cta: "Reply to Iris" };
}
