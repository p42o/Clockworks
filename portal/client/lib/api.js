// Thin wrappers around the callable Functions (ARCHITECTURE section 4, client-facing ones only).
// Each returns the callable's `.data`. Errors are thrown as-is; use friendlyError(e) for display.
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { fb, isLocalDev } from "./env.js";

const call = (name) => async (payload = {}) => {
  const res = await httpsCallable(fb.fns, name)(payload);
  return res.data;
};

// public (signed out)
const asInvite = (tokenOrPayload) => (typeof tokenOrPayload === "string" ? { token: tokenOrPayload } : (tokenOrPayload || {}));
export const inviteOpen = (tokenOrPayload) => call("inviteOpen")(asInvite(tokenOrPayload));
export const inviteSendCode = (tokenOrPayload) => call("inviteSendCode")(asInvite(tokenOrPayload));
export const inviteVerify = (tokenOrPayload, code, keepSignedIn) => call("inviteVerify")(
  tokenOrPayload && typeof tokenOrPayload === "object"
    ? tokenOrPayload
    : { token: tokenOrPayload, code, keepSignedIn: !!keepSignedIn },
);
export const inviteSetPassword = (p) => call("inviteSetPassword")(p);
export const inviteAskRefresh = (p) => call("inviteAskRefresh")(p);
export const inviteNote = (p) => call("inviteNote")(p);
export const passwordResetStart = (email) => call("passwordResetStart")({ email });
export const passwordResetFinish = (p) => call("passwordResetFinish")(p);
export const starterAccept = (p) => call("starterAccept")(p);
export const clientRequestNewTime = (text) => call("clientRequestNewTime")({ text });
export const privacyRequestStart = (email, kind) => call("privacyRequestStart")({ email, kind });
export const privacyRequestFinish = (p) => call("privacyRequestFinish")(p);
export const signinStart = (email) => call("signinStart")({ email });
export const signinVerify = (email, code, keepSignedIn) => call("signinVerify")({ email, code, keepSignedIn: !!keepSignedIn });

// signed in
export const irisChatOpen = () => call("irisChatOpen")();
export const irisChatSend = (text, history = []) => call("irisChatSend")({ text, history });
export const irisChatAckDisclosure = () => call("irisChatAckDisclosure")({ bannerVersion: "A" });
export const irisChatHandoffSubmit = (handoff) => call("irisChatHandoffSubmit")(handoff);
export const changelogCardList = () => call("changelogCardList")();
export const sessionTouch = () => call("sessionTouch")();
export const reverifySend = () => call("reverifySend")();
export const reverifyCheck = (code) => call("reverifyCheck")({ code });
export const signOutEverywhere = () => call("signOutEverywhere")();
export const markThreadRead = (tid) => call("markThreadRead")({ tid });
export const markIdeasSeen = () => call("markIdeasSeen")();
export const startAccountThread = (kind, text) => call("startAccountThread")({ kind, text });
export const listPeople = () => call("listPeople")();
export const getDownloadLink = (fileId) => call("getDownloadLink")({ fileId });
export const dataRequestCreate = (kind, categories, note) => call("dataRequestCreate")({ kind, categories, ...(note ? { note } : {}) });
export const intakeGet = () => call("intakeGet")();
export const intakeAckPrivacy = (p = {}) => call("intakeAckPrivacy")(p);
export const intakeSaveStep = (p) => call("intakeSaveStep")(p);
export const intakeSendSignCode = () => call("intakeSendSignCode")();
export const intakeSign = (p) => call("intakeSign")(p);
export const intakeSubmit = (p = {}) => call("intakeSubmit")(p);

/** Error code without the "functions/" prefix. */
export function errCode(e) { return String((e && e.code) || "").replace(/^functions\//, ""); }
export function needsFreshCode(e) {
  return errCode(e) === "failed-precondition" && /fresh_code_required/.test(String(e && e.message));
}

/** Plain-language message for any error. Never returns raw server/SDK text. */
export function friendlyError(e) {
  if (isLocalDev()) console.debug("[cw] error", errCode(e), e && e.message);
  const code = errCode(e);
  const msg = String((e && e.message) || "");
  if (code === "ask_parker" || /ask_parker/.test(msg)) return "This portal is invite-only. Ask Parker for an invite, then sign in with the method you set up.";
  if (code === "use_password" || /use_password/.test(msg)) return "That sign-in isn't the one on this account. Use your password, or ask Parker.";
  if (code === "email_mismatch" || /email_mismatch/.test(msg)) return "That account doesn't match this invite. Switch accounts, or use a password.";
  if (/proof_expired|proof_required/.test(msg)) return "That step timed out. Enter your invite code again. The invite itself is still good until it expires.";
  if (/sign_in_failed/.test(msg)) return "That email or password didn't match.";
  if (code === "permission-denied" && /invalid_code/.test(msg)) return "That didn't match. Check the latest email and try again.";
  if (code === "unauthenticated" || code === "permission-denied") return "Your session ended. Please sign in again.";
  if (code === "resource-exhausted") return "That's a lot of tries. Please wait a bit and try again.";
  if (code === "failed-precondition" && /signing_not_live/.test(msg)) return "Signing isn't live yet. This is a preview.";
  if (code === "invalid-argument" && /password_policy/.test(msg)) return "Use at least 12 characters, with a letter and a number. Do not use your email.";
  if (code === "invalid-argument" && /agree_required|label_mismatch/.test(msg)) return "Check the box to agree before you continue.";
  if (code === "already-exists" || /email_in_use/.test(msg)) return "That email is already on another account. Ask Parker for a new link.";
  if (code === "failed-precondition" && /fresh_code_required/.test(msg)) return "Please confirm it's you with a new code.";
  if (["deadline-exceeded", "unavailable", "internal-network"].includes(code) || /network/i.test(msg) && !code) {
    return "We couldn't reach the portal. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

/** Reject if the callable takes too long. The invite proof stays put for a retry. */
export function withTimeout(promise, ms = 20000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const e = new Error("deadline-exceeded");
      e.code = "deadline-exceeded";
      reject(e);
    }, ms);
  });
  return Promise.race([Promise.resolve(promise).finally(() => clearTimeout(timer)), timeout]);
}

export const me = () => call("me")();
export const noticeAck = p => call("noticeAck")(p);
export const termsAccept = p => call("termsAccept")(p);
export const dataRequestReconsider = p => call("dataRequestReconsider")(p);

export const needDone = needId => call("needDone")({ needId });
