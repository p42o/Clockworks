// Client copy that must stay free of a reply-time promise. COUNSEL-DRAFT-2026-10-19.
// The privacy-request deadline lives only in screens/privacy-request.js and is exempt.
import { SWAP } from "../swap-config.js";

export const LANDING_COPY = "Practical systems for trades businesses in the Twin Cities. Parker sets them up on the tools you already use. You keep the accounts. This portal is where your intake, files, and messages live. Nothing here starts an engagement by itself.";

export const LOCK_REASON = "Scheduling stays locked until the MSA and the SOW are e-signed with the email code. Payment, a card on file, and Deploy Prompt work stay locked for the same reason.";

export const INTAKE_COMPLETE_COPY = SWAP.intakeCompleteCopy;
export const SUBMIT_SCREEN_COPY = SWAP.submitScreenCopy;
export const PASSWORD_HINT = "Use at least 12 characters, with a letter and a number. Do not use your email.";
/** Same rules as the server's passwordIssues(). Returns a sentence, or "" when the password is fine. */
export function passwordProblem(p, email = "") {
  p = String(p || "");
  if (p.length < 12) return "Use at least 12 characters.";
  if (p.length > 200) return "Use 200 characters or fewer.";
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return "Include at least one letter and one number.";
  if (email && p.toLowerCase() === String(email).trim().toLowerCase()) return "Don't use your email as your password.";
  return "";
}
