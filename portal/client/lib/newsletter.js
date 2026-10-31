// Agent Newsletter, issue 1. PURE: imports only lib/topicGate.js, so the portal-dev tests can run it.
// Worded for the client's trade until a real generator exists. Plain ideas only: no prices, no promises.
// Every idea carries the "do not touch" topics it would touch. Ideas on a topic the client switched off in
// their intake (d_never) are dropped and backfilled, with the SAME topic map the Shop Notes generator uses.
// Byte-identical copy: portal-dev repo portal/client/lib/newsletter.js (tests/tailored/topic-gate.test.mjs).
import { isBlocked } from "./topicGate.js";

const REVIEWS = ["Answer every review", "A drafted reply waits for each new Google review, so nothing sits unanswered.", ["reviews", "google"]];
const PLAYBOOKS = [
  { re: /drywall|plaster|paint|roof|siding|gutter|remodel|construct|contract|carpent|floor|tile|concrete|deck|fence|window|insulat|handyman/i, items: [
    ["Follow up on quiet quotes", "Your agents can draft a short, friendly check-in two days after a quote goes out. You approve every text.", ["texts"]],
    ["Turn job photos into Google posts", "Send before and after shots. Your agents write the caption and queue the post for your OK.", ["google", "social"]],
    REVIEWS,
  ] },
  { re: /plumb|hvac|heat|cool|furnace|electric|septic|well|water|drain|appliance|garage door|locksmith/i, items: [
    ["Text back every missed call", "A short, friendly text when you can't pick up lets the caller know you'll get back to them. Keep it to one reply about their call, with no promotions, and stop if they reply STOP.", ["texts"]],
    ["Remind past customers about seasonal service", "A short note before the season turns brings back the customers who already trust you.", ["email", "texts"]],
    REVIEWS,
  ] },
  { re: /lawn|landscap|tree|snow|pool|pest|clean|maid|window wash|pressure|junk|moving/i, items: [
    ["Confirm tomorrow's route by text", "Your agents can send a short heads-up the day before, so fewer gates are locked when your crew shows up.", ["texts"]],
    ["Fill gaps from the waitlist", "When a job cancels, your agents can offer the slot to the next customer waiting.", ["texts"]],
    REVIEWS,
  ] },
  { re: /restaurant|cafe|coffee|bar|tavern|grill|pizza|bakery|food|catering|brew|diner|kitchen/i, items: [
    ["Post this week's specials", "Tell your agents the special once. They draft the Google and Facebook posts for your OK.", ["google", "social"]],
    ["Catch catering and event requests fast", "Your agents can reply to inquiries with your menu and the next step, even after hours.", ["email"]],
    REVIEWS,
  ] },
  { re: /salon|barber|spa|nail|beauty|fitness|gym|yoga|massage|studio|tattoo|groom/i, items: [
    ["Rebook before they leave", "Your agents can send a short rebooking nudge a few weeks after each visit.", ["texts", "email"]],
    ["Fill slow days", "Tell your agents which days run light. They draft an offer for regulars, and you approve it.", ["texts", "email"]],
    REVIEWS,
  ] },
];
const GENERAL = [
  ["Text back every missed call", "A short, friendly text when you can't pick up lets the caller know you'll get back to them. Keep it to one reply about their call, with no promotions, and stop if they reply STOP.", ["texts"]],
  ["Post to Google once a week", "Tell your agents what happened this week. They draft the post and wait for your OK.", ["google", "social"]],
  REVIEWS,
];
// Touch no topic at all: the backfill when a client switched topics off, or when we can't read their answer.
const NEUTRAL = [
  ["Draft answers to the questions you hear most", "Tell your agents the questions customers ask every week. They draft short answers you can reuse, and you approve each one.", []],
  ["Keep your hours and services in one place", "Your agents keep one up-to-date list of your hours, services and area, ready when a customer asks.", []],
];
const COUNT = ["No", "One", "Two", "Three"];

/** Every idea this module can show, with its topics. Tests walk this list. */
export const NEWSLETTER_IDEAS = Object.freeze([...PLAYBOOKS.flatMap((p) => p.items), ...GENERAL, ...NEUTRAL]
  .filter((it, i, all) => all.findIndex((x) => x[0] === it[0] && x[1] === it[1]) === i)
  .map(([t, p, topics]) => Object.freeze({ t, p, topics: Object.freeze([...topics]) })));

/**
 * opts.topicsOff: topic keys from lib/topicGate.js topicsOff(d_never).
 *   []        nothing switched off (or the client has no intake answer yet): the trade playbook as is.
 *   [..keys]  ideas on those topics are dropped; the rest of the playbook, then GENERAL, then NEUTRAL fill in.
 *   null      we could not read the answer (still loading is the caller's job): NEUTRAL ideas only, so nothing
 *             the client may have ruled out is shown.
 */
export function newsletterIssue(profile, businessName, opts = {}) {
  const name = String(businessName || profile?.businessName || "").trim();
  // Trade first; the business name is a fair hint when the trade is not filled in yet ("Timely Drywall").
  const pick = PLAYBOOKS.find((p) => p.re.test(String(profile?.trade || ""))) || PLAYBOOKS.find((p) => p.re.test(name));
  const known = Array.isArray(opts.topicsOff);
  const off = known ? opts.topicsOff : null;
  const pool = known ? [...(pick ? pick.items : GENERAL), ...GENERAL, ...NEUTRAL] : NEUTRAL;
  const items = [];
  for (const [t, p, topics] of pool) {
    if (items.length >= 3) break;
    if (isBlocked(topics, off) || items.some((x) => x.t === t)) continue;
    items.push({ t, p, topics: [...topics] });
  }
  const base = pick ? pick.items : GENERAL;
  const gated = !known || base.some(([, , topics]) => isBlocked(topics, off));
  return {
    no: 1,
    title: "Ideas for putting your agent team to work",
    lede: `${COUNT[items.length] || items.length} ${items.length === 1 ? "thing" : "things"} your agent team could take off ${name ? `${name}'s` : "your"} plate.`,
    madeFor: name || "your business",
    tailored: !!pick,
    gated,
    items,
  };
}
