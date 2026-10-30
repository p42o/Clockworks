// "Do not touch" topic switches from the intake answer d_never. PURE: no imports, no I/O.
// One module, byte-identical in three places (tests/tailored/topic-gate.test.mjs keeps them identical):
//   portal-dev/functions/lib/topicGate.js  -> Shop Notes + Things to try generator (functions/lib/tailored.js)
//   portal/client/lib/topicGate.js         -> client Home: the Agent Newsletter card (lib/newsletter.js)
//   (Clockworks Site) portal/client/lib/topicGate.js, the LIVE client copy
// The answer only switches topics off. Callers must never quote it.

export const NEVER_TOPICS = Object.freeze({
  reviews: /review/i, social: /social media|social posts?|facebook|instagram|tiktok/i, website: /website|web site|\bsite\b/i,
  texts: /\btext|sms/i, email: /e-?mail/i, google: /google/i, ai: /\bai\b|chatbot|robot/i,
});
export const TOPIC_KEYS = Object.freeze(Object.keys(NEVER_TOPICS));
const MAX = 400;

/** The d_never answer (any shape) -> the topic keys it switches off, in TOPIC_KEYS order. */
export function topicsOff(answer) {
  const text = (typeof answer === 'string' ? answer : '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX);
  if (!text) return [];
  return TOPIC_KEYS.filter((k) => NEVER_TOPICS[k].test(text));
}

/** True when any of `topics` is switched off. `off` is an array or a Set of topic keys. */
export function isBlocked(topics, off) {
  if (!Array.isArray(topics) || !off) return false;
  const has = off instanceof Set ? (t) => off.has(t) : (t) => Array.isArray(off) && off.includes(t);
  return topics.some(has);
}
