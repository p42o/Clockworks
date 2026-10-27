import { SWAP } from "../swap-config.js";
import { cidSlug } from "./slug.js";

const CONTEXT_KEY = "cw.apple.signin.context";

export function appleSignInAllowed(context) {
  return SWAP.appleSignIn.realClients === true || context?.fixture === true
    || (typeof context?.cid === "string" && SWAP.appleSignIn.allowClientIds.includes(context.cid));
}

// An invite gives the sign-in screen a display hint. Functions rechecks clients/{cid}.
export function rememberAppleSignInContext(context) {
  try {
    if (context?.cid) sessionStorage.setItem(CONTEXT_KEY, JSON.stringify({ cid: context.cid, fixture: context.fixture === true }));
  } catch { /* private mode */ }
}

export function savedAppleSignInContext() {
  try { return JSON.parse(sessionStorage.getItem(CONTEXT_KEY) || "null"); }
  catch { return null; }
}

export function appleSignInContext(pathname) {
  const saved = savedAppleSignInContext();
  const cid = cidSlug(pathname);
  return cid ? (saved?.cid === cid ? saved : { cid, fixture: false }) : saved;
}
