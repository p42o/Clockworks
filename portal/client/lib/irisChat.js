import { SWAP } from "../swap-config.js";

export const IRIS_AVATAR = "assets/iris-avatar-01.png";
export const IRIS_DISCLOSURE_TITLE = "Iris support chat";
export const IRIS_DISCLOSURE_COPY = "This chat is with Iris, MN Clockworks' AI support assistant (not a live person). We store the full transcript so Parker can review it later if needed. The chat may be processed by our AI service providers under our Privacy Notice. Do not send passwords, codes, card numbers, or other people's sensitive information. Other people with access to your business's portal account may see this chat.";
export const IRIS_DISCLOSURE_AGREEMENT = "By sending a message, you agree to this.";

export function isIrisChatVisible({ cid, stageKey, portalEnabled } = {}) {
  void cid; // allowClientIds applies only to transcript logging
  const f = SWAP.irisChat;
  return portalEnabled === true && f?.enabled === true
    && (f.stages?.includes("*") || f.stages?.includes(stageKey));
}
