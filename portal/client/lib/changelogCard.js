import { SWAP } from "../swap-config.js";

/** Client-side gate. The server repeats this check. Allowlist is who may see the card; "*" means every portal client. */
export function isChangelogCardVisible({ cid, stageKey, portalEnabled } = {}) {
  const f = SWAP.changelogCard;
  if (portalEnabled === false || f?.enabled !== true || f?.showOnHome !== true) return false;
  const stages = Array.isArray(f.stages) ? f.stages : [];
  if (!(stages.includes("*") || stages.includes(stageKey))) return false;
  const allow = Array.isArray(f.allowClientIds) ? f.allowClientIds : [];
  return allow.includes("*") || allow.includes(cid);
}
