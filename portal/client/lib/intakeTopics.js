// The client's own "do not touch" answer (intake d_never), read through the intakeGet callable the intake
// screen already uses. No new rule, no new read path. Only the topic keys leave this module; the answer text
// is never stored or shown. One call per page load and client; Home and #/newsletter share it.
import * as api from "./api.js";
import { topicsOff } from "./topicGate.js";

const cache = new Map(); // cid -> Promise<string[] | null>

/**
 * Resolves to topic keys ([] = nothing switched off, or no intake yet), or null when the answer exists but
 * can't be read here (read-only window, intake feature off, network). Callers treat null as "unknown".
 * home: the clientView/home doc, used only to skip the call when there is no intake at all.
 */
export function intakeTopicsOff(cid, home) {
  if (!cid) return Promise.resolve(null);
  if (home?.intake?.status === "none") return Promise.resolve([]);
  if (!cache.has(cid)) {
    const p = api.intakeGet().then((r) => topicsOff(r?.answers?.d_never?.value), (e) => {
      const msg = String(e?.message || "");
      // no intake on file -> nothing to respect yet
      if (/no_intake/.test(msg)) return [];
      cache.delete(cid);
      return null;
    });
    cache.set(cid, p);
  }
  return cache.get(cid);
}
